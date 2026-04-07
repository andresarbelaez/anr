"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Heart, X } from "lucide-react";
import { S } from "@/components/studio/ui/s";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const AMOUNTS = [5, 10, 25, 50] as const;

/** Above `StudioViewportActions` (z-5200) and typical studio windows (z-2400). */
const MODAL_Z = 5300;

type Props = {
  open: boolean;
  onClose: () => void;
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: S.textSecondary,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  fontSize: 13,
  color: S.textPrimary,
  background: S.bg,
  border: `1px solid ${S.border}`,
  borderRadius: 3,
  outline: "none",
};

export function StudioDonateModal({ open, onClose }: Props) {
  const [amount, setAmount] = useState<number | "custom">(10);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAmount(10);
      setCustomAmount("");
      setLoading(false);
      setError(null);
    }
  }, [open]);

  const selectedAmount =
    amount !== "custom" ? amount : parseFloat(customAmount) || 0;

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: MODAL_Z }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-donate-title"
    >
      <Button
        type="button"
        variant="bare"
        disabled={loading}
        className="absolute inset-0 h-full min-h-full w-full cursor-pointer bg-[rgba(28,18,8,0.58)] hover:bg-[rgba(28,18,8,0.58)] disabled:cursor-wait"
        aria-label="Close dialog"
        onClick={() => {
          if (!loading) onClose();
        }}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-lg border p-5 pt-4 shadow-xl"
        style={{
          background: S.surface,
          borderColor: S.border,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
        }}
      >
        <Button
          type="button"
          variant="bare"
          className="absolute right-2 top-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#8a6040] transition-colors hover:bg-black/[0.06] hover:text-[#5a3518] focus-visible:ring-2 focus-visible:ring-[#d4b896]/80"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </Button>

        <div className="flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border"
            style={{
              background: "rgba(200,120,140,0.12)",
              borderColor: "rgba(200,120,140,0.35)",
            }}
          >
            <Heart
              className="h-6 w-6"
              style={{ color: "#b84a62" }}
              strokeWidth={2}
            />
          </div>
          <h2
            id="studio-donate-title"
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: S.textPrimary,
            }}
          >
            Support us
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: S.textMuted,
              lineHeight: 1.55,
              maxWidth: 280,
            }}
          >
            This platform is free for every artist. Your donation helps cover
            server costs and keeps the service running.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <span style={labelStyle}>Choose an amount</span>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNTS.map((a) => (
                <Button
                  key={a}
                  type="button"
                  variant={amount === a ? "studioAccent" : "outlineSoft"}
                  size="sm"
                  className={cn(
                    "!rounded-sm font-medium",
                    amount !== a &&
                      "!border-[#d4b896] !text-[#5a3518] hover:!bg-black/[0.04]"
                  )}
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
            <label htmlFor="studio-donate-custom" style={labelStyle}>
              Custom amount
            </label>
            <input
              id="studio-donate-custom"
              type="number"
              min={1}
              step={1}
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setAmount("custom");
              }}
              placeholder="Enter amount"
              disabled={loading}
              style={fieldStyle}
            />
          </div>

          {error ? (
            <p
              className="rounded-md px-3 py-2 text-center text-xs"
              style={{
                background: S.errorBg,
                color: S.error,
                border: `1px solid ${S.error}`,
              }}
            >
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            variant="studioAccent"
            size="md"
            loading={loading}
            disabled={selectedAmount < 1}
            className="!w-full !rounded-sm !font-semibold"
            onClick={() => void handleDonate()}
          >
            Donate ${selectedAmount > 0 ? selectedAmount.toFixed(2) : "…"}
          </Button>

          <p
            className="text-center text-[10px] leading-relaxed"
            style={{ color: S.textFaint }}
          >
            Payments are processed securely through Stripe. You will not be
            charged recurring fees.
          </p>
        </div>
      </div>
    </div>
  );
}
