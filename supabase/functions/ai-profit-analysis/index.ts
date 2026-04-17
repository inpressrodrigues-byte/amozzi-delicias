import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um consultor financeiro especializado em confeitaria artesanal e gestão de negócios alimentares (AMOZI Delícias no Pote).

Seu papel é analisar os dados financeiros do negócio e ajudar a dona a entender:
- Por que o lucro está baixo (ou alto)
- Quais produtos têm boa/má margem
- Onde estão os maiores custos e despesas
- Sugestões práticas de ajustes em preços, ingredientes e estratégias
- Se o negócio está sendo rentável ou não

Sempre responda em português brasileiro, de forma direta, prática e amigável. Use emojis com moderação. Foque em ações concretas que ela possa tomar HOJE.

Quando relevante, sugira:
- Aumento de preço em produtos com margem baixa
- Substituição de ingredientes caros
- Redução de despesas operacionais
- Foco em produtos mais rentáveis
- Estratégias de venda para os produtos com melhor margem

Aqui estão os dados financeiros atuais do período selecionado:
${JSON.stringify(context, null, 2)}

Use esses dados como base. Seja específico citando nomes de produtos, valores e percentuais reais dos dados acima.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-profit-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
