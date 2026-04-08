"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { S } from "@/components/studio/ui/s";

const AMOUNTS = [5, 10, 25, 50];

export default function DonatePage() {
  const [amount, setAmount] = useState<number | string>(10);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAmount =
    typeof amount === "number" ? amount : parseFloat(customAmount) || 0;

  const handleDonate = async () => {
    if (selectedAmount < 1) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/donate/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd: selectedAmount }),
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not start checkout.");
        return;
      }
      if (!data.url) {
        setError("Could not start checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen antialiased" style={{ background: S.bg }}>
      <div className="mx-auto max-w-md px-6 py-12 md:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#8a6040] transition-colors hover:text-[#5a3518] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div
          className="rounded-2xl border p-8"
          style={{
            background: S.surface,
            borderColor: S.border,
            boxShadow: "0 2px 12px rgba(30,16,8,0.06)",
          }}
        >
          <div className="text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
              style={{
                background: S.bg,
                borderColor: S.borderFaint,
              }}
            >
              <Heart className="h-7 w-7" style={{ color: S.accent }} />
            </div>

            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: S.textPrimary }}
            >
              Support sidestage
            </h1>
            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: S.textMuted }}
            >
              This platform is free for every artist. Your donation helps cover
              hosting, tooling, and keeping the service running for everyone.
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <p
                className="mb-3 text-sm font-medium"
                style={{ color: S.textSecondary }}
              >
                Choose an amount
              </p>
              <div className="grid grid-cols-4 gap-2">
                {AMOUNTS.map((a) => (
                  <Button
                    key={a}
                    type="button"
                    variant={amount === a ? "studioAccent" : "outlineSoft"}
                    size="md"
                    className={`!h-auto !min-h-0 w-full !rounded-sm py-2.5 text-sm font-semibold ${
                      amount === a ? "" : "!border-[#d4b896] !text-[#5a3518]"
                    }`}
                    onClick={() => {
                      setAmount(a);
                      setCustomAmount("");
                    }}
                  >
                    ${a}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Input
                appearance="studio"
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

            {error ? (
              <p
                className="rounded-lg border px-3 py-2 text-center text-sm"
                style={{
                  background: S.errorBg,
                  borderColor: `${S.error}55`,
                  color: S.error,
                }}
              >
                {error}
              </p>
            ) : null}

            <Button
              variant="studioAccent"
              onClick={handleDonate}
              loading={loading}
              disabled={selectedAmount < 1}
              className="w-full !rounded-sm font-semibold"
              size="lg"
            >
              Donate ${selectedAmount > 0 ? selectedAmount.toFixed(2) : "..."}
            </Button>

            <p
              className="text-center text-xs leading-relaxed"
              style={{ color: S.textFaint }}
            >
              Payments are processed securely through Stripe. You will not be
              charged recurring fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
