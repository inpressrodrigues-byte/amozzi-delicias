import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHATSAPP_REGEX = /^\d{10,13}$/;
const CEP_REGEX = /^\d{8}$/;

function sanitizeText(text: string, maxLen: number): string {
  return String(text).trim().replace(/<[^>]*>/g, "").slice(0, maxLen);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to bypass RLS for validated inserts
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      customer_name,
      customer_whatsapp,
      customer_address,
      customer_cep,
      customer_lat,
      customer_lng,
      item_ids, // array of { id, quantity }
      delivery_zone_name,
      use_loyalty_discount,
      coupon_code,
      payment_method,
    } = body;

    // --- Input Validation ---
    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Nome inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const phone = String(customer_whatsapp || "").replace(/\D/g, "");
    if (!WHATSAPP_REGEX.test(phone)) {
      return new Response(JSON.stringify({ error: "WhatsApp inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const cep = String(customer_cep || "").replace(/\D/g, "");
    if (!CEP_REGEX.test(cep)) {
      return new Response(JSON.stringify({ error: "CEP inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!customer_address || customer_address.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Endereço inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum item fornecido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["stripe", "whatsapp"].includes(payment_method)) {
      return new Response(JSON.stringify({ error: "Método de pagamento inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Server-side price recalculation ---
    const productIds = item_ids.map((i: any) => i.id);
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price, available")
      .in("id", productIds)
      .eq("available", true);

    if (prodErr || !products) {
      return new Response(JSON.stringify({ error: "Erro ao verificar produtos" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build validated order items using server prices only
    const orderItems: any[] = [];
    let subtotal = 0;
    for (const reqItem of item_ids) {
      const product = products.find((p) => p.id === reqItem.id);
      if (!product) {
        return new Response(JSON.stringify({ error: `Produto não encontrado: ${reqItem.id}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const qty = Math.max(1, Math.min(99, parseInt(reqItem.quantity) || 1));
      orderItems.push({ id: product.id, name: product.name, price: product.price, quantity: qty });
      subtotal += product.price * qty;
    }

    // --- Delivery fee validation ---
    const { data: settings } = await supabase.from("site_settings").select("delivery_zones").limit(1).single();
    const deliveryZones: { name: string; fee: number }[] = (settings?.delivery_zones as any) || [];
    let deliveryFee = 0;
    if (delivery_zone_name && deliveryZones.length > 0) {
      const zone = deliveryZones.find((z) => z.name === delivery_zone_name);
      if (!zone) {
        return new Response(JSON.stringify({ error: "Zona de entrega inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      deliveryFee = zone.fee;
    }

    // --- Coupon validation server-side ---
    let couponDiscount = 0;
    let validatedCouponCode: string | null = null;
    if (coupon_code) {
      const code = String(coupon_code).toUpperCase().trim();
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .maybeSingle();

      if (coupon) {
        const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
        const exhausted = coupon.max_uses && coupon.uses_count >= coupon.max_uses;
        const belowMin = subtotal < coupon.min_order_value;
        if (!expired && !exhausted && !belowMin) {
          couponDiscount = coupon.discount_type === "percentage"
            ? subtotal * (coupon.discount_value / 100)
            : Math.min(coupon.discount_value, subtotal);
          validatedCouponCode = code;
        }
      }
    }

    // --- Loyalty discount validation server-side ---
    let loyaltyDiscount = 0;
    if (use_loyalty_discount) {
      const { data: loyalty } = await supabase
        .from("loyalty")
        .select("discount_available")
        .eq("customer_whatsapp", phone)
        .maybeSingle();
      if (loyalty?.discount_available) {
        loyaltyDiscount = subtotal * 0.5;
      }
    }

    const discountAmount = Math.max(couponDiscount, loyaltyDiscount);
    const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee);

    // --- Insert order ---
    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_name: sanitizeText(customer_name, 100),
        customer_whatsapp: phone,
        customer_address: sanitizeText(customer_address, 300),
        customer_cep: cep,
        customer_lat: customer_lat ? Number(customer_lat) : null,
        customer_lng: customer_lng ? Number(customer_lng) : null,
        items: orderItems,
        total: grandTotal,
        delivery_fee: deliveryFee,
        status: "pending",
        payment_method,
      })
      .select("tracking_code, id")
      .single();

    if (orderErr || !orderData) {
      console.error("Order insert error:", orderErr);
      return new Response(JSON.stringify({ error: "Erro ao criar pedido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Side effects (loyalty + coupon) after successful order creation ---
    await supabase.rpc("increment_loyalty", { p_whatsapp: phone });

    if (use_loyalty_discount && loyaltyDiscount > 0) {
      await supabase.rpc("use_loyalty_discount", { p_whatsapp: phone });
    }

    if (validatedCouponCode) {
      const { data: c } = await supabase.from("coupons").select("uses_count").eq("code", validatedCouponCode).single();
      if (c) {
        await supabase.from("coupons").update({ uses_count: c.uses_count + 1 }).eq("code", validatedCouponCode);
      }
    }

    return new Response(
      JSON.stringify({
        tracking_code: orderData.tracking_code,
        order_id: orderData.id,
        subtotal,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        grand_total: grandTotal,
        items: orderItems,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("create-order error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
