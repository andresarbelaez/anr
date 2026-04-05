import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const amountTotal = session.amount_total;
    const currency = session.currency;
    if (amountTotal == null || !currency) {
      console.error("checkout.session.completed missing amount or currency", session.id);
      return NextResponse.json({ received: true });
    }

    const amount = amountTotal / 100;
    const paymentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? session.id;

    const donorEmail =
      session.customer_details?.email ?? session.customer_email ?? null;
    const donorName = session.customer_details?.name ?? null;

    try {
      const supabase = createAdminSupabaseClient();
      const { error } = await supabase.from("donations").insert({
        donor_name: donorName,
        donor_email: donorEmail,
        amount,
        currency: currency.toUpperCase(),
        stripe_payment_id: paymentId,
        message: null,
      });

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json({ received: true });
        }
        console.error("Failed to insert donation:", error);
        return NextResponse.json(
          { error: "Database error" },
          { status: 500 }
        );
      }
    } catch (e) {
      console.error("Donation webhook handler error:", e);
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
