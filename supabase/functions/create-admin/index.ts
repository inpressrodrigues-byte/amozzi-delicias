import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "list" | "create" | "update_password" | "update_profile";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const {
      data: { user: caller },
      error: callerErr,
    } = await supabase.auth.getUser(token);

    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action: Action = (body.action || "create") as Action;

    if (action === "list") {
      const [{ data: roles, error: rolesErr }, { data: profiles, error: profilesErr }, { data: authUsers, error: usersErr }] =
        await Promise.all([
          supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
          supabase.from("profiles").select("user_id, full_name"),
          supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        ]);

      if (rolesErr || profilesErr || usersErr) {
        return new Response(JSON.stringify({ error: "Erro ao listar admins" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      const userMap = new Map((authUsers?.users || []).map((u: any) => [u.id, u]));

      const admins = (roles || [])
        .map((r: any) => {
          const authUser = userMap.get(r.user_id);
          return {
            user_id: r.user_id,
            role: r.role,
            email: authUser?.email || "",
            full_name: profileMap.get(r.user_id) ?? authUser?.user_metadata?.full_name ?? null,
            created_at: authUser?.created_at || null,
          };
        })
        .sort((a: any, b: any) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

      return new Response(JSON.stringify({ admins }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const fullName = String(body.full_name || "").trim();

      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email e senha obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || null },
      });

      if (createErr || !newUser.user) {
        return new Response(JSON.stringify({ error: createErr?.message || "Erro ao criar usuário" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("user_roles").upsert({ user_id: newUser.user.id, role: "admin" }, { onConflict: "user_id,role" });
      await supabase.from("profiles").upsert({ user_id: newUser.user.id, full_name: fullName || null }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_password") {
      const userId = String(body.user_id || "").trim();
      const password = String(body.password || "");

      if (!userId || !password) {
        return new Response(JSON.stringify({ error: "Usuário e senha são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.auth.admin.updateUserById(userId, { password });
      if (error) {
        return new Response(JSON.stringify({ error: error.message || "Erro ao atualizar senha" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_profile") {
      const userId = String(body.user_id || "").trim();
      const fullName = String(body.full_name || "").trim();

      if (!userId) {
        return new Response(JSON.stringify({ error: "Usuário inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, full_name: fullName || null }, { onConflict: "user_id" });

      if (error) {
        return new Response(JSON.stringify({ error: "Erro ao atualizar perfil" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-admin error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
