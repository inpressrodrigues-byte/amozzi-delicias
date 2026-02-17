import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { items, customer_name, customer_email, delivery_fee, discount_amount, order_metadata } = await req.json();

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => ({
      price_data: {
        currency: "brl",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Add delivery fee as a line item if present
    if (delivery_fee && delivery_fee > 0) {
      line_items.push({
        price_data: {
          currency: "brl",
          product_data: { name: "Taxa de Entrega" },
          unit_amount: Math.round(delivery_fee * 100),
        },
        quantity: 1,
      });
    }

    // Add discount as negative line item via coupon
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (discount_amount && discount_amount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discount_amount * 100),
        currency: "brl",
        duration: "once",
        name: "Desconto Fidelidade 50%",
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
      customer_email: customer_email || undefined,
      metadata: order_metadata || {},
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
