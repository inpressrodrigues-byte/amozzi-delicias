import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: role } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!role) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { phones, message } = await req.json()

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum número fornecido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Mensagem vazia' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (message.length > 4096) {
      return new Response(JSON.stringify({ error: 'Mensagem muito longa (máx 4096 chars)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get WhatsApp Business settings
    const { data: settings } = await supabase
      .from('billing_settings')
      .select('whatsapp_token, phone_number_id')
      .limit(1)
      .maybeSingle()

    if (!settings?.whatsapp_token || !settings?.phone_number_id) {
      return new Response(JSON.stringify({ error: 'Token ou Phone Number ID do WhatsApp Business não configurado. Vá em Configurações de Cobrança.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results: { phone: string; success: boolean; error?: string }[] = []

    for (const phone of phones) {
      // Clean phone - only digits
      const cleanPhone = phone.replace(/\D/g, '')
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        results.push({ phone, success: false, error: 'Número inválido' })
        continue
      }

      // Add country code if missing
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`

      try {
        const resp = await fetch(
          `https://graph.facebook.com/v21.0/${settings.phone_number_id}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${settings.whatsapp_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: fullPhone,
              type: 'text',
              text: { body: message.trim() },
            }),
          }
        )

        const data = await resp.json()
        if (resp.ok) {
          results.push({ phone, success: true })
        } else {
          results.push({ phone, success: false, error: data?.error?.message || 'Erro desconhecido' })
        }
      } catch (err) {
        results.push({ phone, success: false, error: String(err) })
      }
    }

    const sent = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return new Response(JSON.stringify({ sent, failed, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
