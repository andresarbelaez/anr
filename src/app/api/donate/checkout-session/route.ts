import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";

const MIN_USD = 1;
const MAX_USD = 10_000;

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Payments are not configured." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawAmount =
    typeof body === "object" &&
    body !== null &&
    "amountUsd" in body &&
    typeof (body as { amountUsd: unknown }).amountUsd === "number"
      ? (body as { amountUsd: number }).amountUsd
      : null;

  if (
    rawAmount === null ||
    !Number.isFinite(rawAmount) ||
    rawAmount < MIN_USD ||
    rawAmount > MAX_USD
  ) {
    return NextResponse.json(
      { error: `Amount must be between $${MIN_USD} and $${MAX_USD}.` },
      { status: 400 }
    );
  }

  const amountUsd = Math.round(rawAmount * 100) / 100;
  const unitAmountCents = Math.round(amountUsd * 100);
  if (unitAmountCents < 100) {
    return NextResponse.json(
      { error: `Minimum amount is $${MIN_USD}.` },
      { status: 400 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmountCents,
            product_data: {
              name: "Donation to ANR",
              description: "Support free distribution for independent artists.",
            },
          },
        },
      ],
      success_url: `${baseUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/donate`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not create checkout session." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout session error:", e);
    return NextResponse.json(
      { error: "Could not start checkout. Try again later." },
      { status: 500 }
    );
  }
}
