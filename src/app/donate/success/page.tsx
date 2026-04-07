import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { S } from "@/components/studio/ui/s";

export default function DonateSuccessPage() {
  return (
    <div className="min-h-screen antialiased" style={{ background: S.bg }}>
      <div className="mx-auto max-w-md px-6 py-12 md:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#8a6040] transition-colors hover:text-[#5a3518] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        <div
          className="rounded-2xl border p-8 text-center"
          style={{
            background: S.surface,
            borderColor: S.border,
            boxShadow: "0 2px 12px rgba(30,16,8,0.06)",
          }}
        >
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
            Thank you
          </h1>
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: S.textMuted }}
          >
            Your donation went through. Receipt details are in the email from
            Stripe, if you provided one at checkout.
          </p>

          <Link href="/" className="mt-8 inline-block">
            <Button
              variant="studioAccent"
              size="md"
              className="!rounded-sm font-semibold"
            >
              Return to sidestage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
