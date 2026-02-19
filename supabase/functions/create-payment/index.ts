import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { order_id, customer_email } = await req.json();

    if (!order_id || typeof order_id !== "string") {
      return new Response(JSON.stringify({ error: "order_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the already-validated order from DB — prices come from server, not client
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("status", "pending")
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado ou já processado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = Array.isArray(order.items) ? order.items as any[] : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Pedido sem itens" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build line items from server-stored order data (prices already validated)
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => ({
      price_data: {
        currency: "brl",
        product_data: { name: String(item.name).slice(0, 100) },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: Math.max(1, parseInt(item.quantity) || 1),
    }));

    // Delivery fee from server-stored order
    if (order.delivery_fee && Number(order.delivery_fee) > 0) {
      line_items.push({
        price_data: {
          currency: "brl",
          product_data: { name: "Taxa de Entrega" },
          unit_amount: Math.round(Number(order.delivery_fee) * 100),
        },
        quantity: 1,
      });
    }

    // Discount: calculate from server-stored total vs (items + delivery)
    const itemsSubtotal = items.reduce((s: number, i: any) => s + Number(i.price) * Number(i.quantity), 0);
    const grossTotal = itemsSubtotal + Number(order.delivery_fee || 0);
    const discountAmount = Math.max(0, grossTotal - Number(order.total));

    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (discountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountAmount * 100),
        currency: "brl",
        duration: "once",
        name: "Desconto Aplicado",
      });
      discounts = [{ coupon: coupon.id }];
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      discounts,
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      customer_email: customer_email && typeof customer_email === "string" ? customer_email.slice(0, 254) : undefined,
      metadata: {
        order_id: order.id,
        tracking_code: order.tracking_code || "",
        customer_whatsapp: order.customer_whatsapp,
      },
    });

    // Update order with Stripe session ID
    await supabase.from("orders").update({ stripe_payment_id: session.id }).eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return new Response(JSON.stringify({ error: "Erro ao processar pagamento" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
