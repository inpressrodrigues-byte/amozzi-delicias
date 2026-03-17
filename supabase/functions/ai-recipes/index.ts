import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, product_name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em confeitaria e receitas. O usuário vai te enviar um texto com ingredientes (pode ser bagunçado, lista de compras, texto corrido etc). Sua tarefa é extrair e organizar os ingredientes para a receita "${product_name}".

Para cada ingrediente, extraia:
- ingredient_name: nome do ingrediente
- quantity_used: quantidade usada na receita
- quantity_unit: unidade da quantidade usada (g, ml, un, colher_sopa, colher_cha, xicara)
- package_price: preço estimado da embalagem (se mencionado, senão 0)
- package_quantity: quantidade na embalagem  
- package_unit: unidade da embalagem (kg, L, dz, un, pacote)

IMPORTANTE: Responda APENAS com JSON válido, sem markdown. Use o formato:
{"ingredients": [{"ingredient_name": "...", "quantity_used": 0, "quantity_unit": "g", "package_price": 0, "package_quantity": 1, "package_unit": "kg"}]}`
          },
          { role: "user", content: text }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_ingredients",
              description: "Parse and organize recipe ingredients from text",
              parameters: {
                type: "object",
                properties: {
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ingredient_name: { type: "string" },
                        quantity_used: { type: "number" },
                        quantity_unit: { type: "string", enum: ["g", "ml", "un", "colher_sopa", "colher_cha", "xicara"] },
                        package_price: { type: "number" },
                        package_quantity: { type: "number" },
                        package_unit: { type: "string", enum: ["kg", "L", "dz", "un", "pacote"] }
                      },
                      required: ["ingredient_name", "quantity_used", "quantity_unit", "package_price", "package_quantity", "package_unit"]
                    }
                  }
                },
                required: ["ingredients"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_ingredients" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse from content
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return new Response(jsonMatch[0], {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Could not parse AI response");
  } catch (e) {
    console.error("ai-recipes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
