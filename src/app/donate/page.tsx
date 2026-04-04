"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AMOUNTS = [5, 10, 25, 50];

export default function DonatePage() {
  const [amount, setAmount] = useState<number | string>(10);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedAmount =
    typeof amount === "number" ? amount : parseFloat(customAmount) || 0;

  const handleDonate = async () => {
    if (selectedAmount < 1) return;
    setLoading(true);

    // In production, this would create a Stripe Checkout session
    // and redirect to Stripe's hosted payment page.
    // For now, we show a placeholder.
    alert(
      `Thank you! In production, this would redirect to Stripe Checkout for $${selectedAmount.toFixed(2)}.`
    );
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-md px-6 py-16">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-950/50 border border-pink-900/50">
            <Heart className="h-7 w-7 text-pink-400" />
          </div>

          <h1 className="text-2xl font-bold text-white">Support ANR</h1>
          <p className="mt-3 text-sm text-neutral-400">
            This platform is free for every artist. Your donation helps cover
            server costs, distribution fees, and keeps the service running for
            everyone.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <p className="mb-3 text-sm font-medium text-neutral-300">
              Choose an amount
            </p>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    setAmount(a);
                    setCustomAmount("");
                  }}
                  className={`rounded-lg border py-2.5 text-sm font-medium transition ${
                    amount === a
                      ? "border-white bg-white text-black"
                      : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                  }`}
                >
                  ${a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Input
              label="Custom amount"
              type="number"
              min="1"
              step="1"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setAmount("custom");
              }}
              placeholder="Enter amount"
            />
          </div>

          <Button
            onClick={handleDonate}
            loading={loading}
            disabled={selectedAmount < 1}
            className="w-full"
            size="lg"
          >
            Donate ${selectedAmount > 0 ? selectedAmount.toFixed(2) : "..."}
          </Button>

          <p className="text-center text-xs text-neutral-600">
            Payments are processed securely through Stripe. You will not be
            charged recurring fees.
          </p>
        </div>
      </div>
    </div>
  );
}
