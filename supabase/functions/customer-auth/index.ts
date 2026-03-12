import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const computedHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return computedHex === hashHex;
}

async function createToken(customerId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(customerId));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyToken(customerId: string, token: string, secret: string): Promise<boolean> {
  const expected = await createToken(customerId, secret);
  return expected === token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action } = body;

    // ── REGISTER ──
    if (action === "register") {
      const { whatsapp, password, name } = body;
      const phone = String(whatsapp || "").replace(/\D/g, "");
      if (phone.length < 10 || phone.length > 13) {
        return new Response(JSON.stringify({ error: "WhatsApp inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!password || password.length < 4) {
        return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 4 caracteres" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check if customer with this whatsapp already exists
      const { data: existing } = await supabase.from("customers").select("id, password_hash, whatsapp").eq("whatsapp", phone).maybeSingle();
      
      if (existing?.password_hash) {
        return new Response(JSON.stringify({ error: "Este WhatsApp já possui uma conta. Faça login." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const hash = await hashPassword(password);

      if (existing) {
        // Update existing customer with password
        await supabase.from("customers").update({ password_hash: hash, name: name || existing.id }).eq("id", existing.id);
        const token = await createToken(existing.id, serviceRoleKey);
        return new Response(JSON.stringify({ customer_id: existing.id, token }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        // Create new customer
        if (!name || name.trim().length < 2) {
          return new Response(JSON.stringify({ error: "Nome obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { data: newCustomer, error } = await supabase.from("customers").insert({
          name: name.trim(),
          whatsapp: phone,
          password_hash: hash,
        }).select("id").single();
        if (error) {
          return new Response(JSON.stringify({ error: "Erro ao criar conta" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const token = await createToken(newCustomer.id, serviceRoleKey);
        return new Response(JSON.stringify({ customer_id: newCustomer.id, token }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── LOGIN ──
    if (action === "login") {
      const { whatsapp, password } = body;
      const phone = String(whatsapp || "").replace(/\D/g, "");
      if (phone.length < 10) {
        return new Response(JSON.stringify({ error: "WhatsApp inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: customer } = await supabase.from("customers").select("id, password_hash, name").eq("whatsapp", phone).maybeSingle();
      if (!customer || !customer.password_hash) {
        return new Response(JSON.stringify({ error: "Conta não encontrada. Cadastre-se primeiro." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const valid = await verifyPassword(password, customer.password_hash);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Senha incorreta" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const token = await createToken(customer.id, serviceRoleKey);
      return new Response(JSON.stringify({ customer_id: customer.id, token, name: customer.name }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── GET ORDERS (authenticated) ──
    if (action === "get_orders") {
      const { customer_id, token } = body;
      if (!customer_id || !token) {
        return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const valid = await verifyToken(customer_id, token, serviceRoleKey);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get customer data
      const { data: customer } = await supabase.from("customers").select("*").eq("id", customer_id).single();
      if (!customer) {
        return new Response(JSON.stringify({ error: "Cliente não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get site orders by whatsapp
      const phone = customer.whatsapp || "";
      let siteOrders: any[] = [];
      if (phone) {
        const { data } = await supabase.from("orders").select("*").eq("customer_whatsapp", phone).order("created_at", { ascending: false });
        siteOrders = data || [];
      }

      // Get remote orders by whatsapp or name
      let remoteOrders: any[] = [];
      const { data: byName } = await supabase.from("remote_orders").select("*").ilike("customer_name", customer.name).order("created_at", { ascending: false });
      remoteOrders = byName || [];

      if (phone) {
        const { data: byPhone } = await supabase.from("remote_orders").select("*").eq("customer_whatsapp", phone).order("created_at", { ascending: false });
        // Merge without duplicates
        const existingIds = new Set(remoteOrders.map(o => o.id));
        for (const o of (byPhone || [])) {
          if (!existingIds.has(o.id)) remoteOrders.push(o);
        }
      }

      return new Response(JSON.stringify({
        customer: {
          id: customer.id,
          name: customer.name,
          whatsapp: customer.whatsapp,
          sector: customer.sector,
          cpf: customer.cpf,
          cep: customer.cep,
          address: customer.address,
          total_orders: customer.total_orders,
        },
        site_orders: siteOrders,
        remote_orders: remoteOrders,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── UPDATE PROFILE ──
    if (action === "update_profile") {
      const { customer_id, token, cpf, cep, address, name } = body;
      if (!customer_id || !token) {
        return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const valid = await verifyToken(customer_id, token, serviceRoleKey);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const updateData: any = {};
      if (cpf !== undefined) updateData.cpf = String(cpf).replace(/\D/g, "").slice(0, 11);
      if (cep !== undefined) updateData.cep = String(cep).replace(/\D/g, "").slice(0, 8);
      if (address !== undefined) updateData.address = String(address).slice(0, 300);
      if (name !== undefined) updateData.name = String(name).trim().slice(0, 100);

      const { error } = await supabase.from("customers").update(updateData).eq("id", customer_id);
      if (error) {
        return new Response(JSON.stringify({ error: "Erro ao atualizar perfil" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("customer-auth error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
