import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";

export default function DonateSuccessPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-md px-6 py-16">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-950/50 border border-pink-900/50">
            <Heart className="h-7 w-7 text-pink-400" />
          </div>

          <h1 className="text-2xl font-bold text-white">Thank you</h1>
          <p className="mt-3 text-sm text-neutral-400">
            Your donation went through. Receipt details are in the email from
            Stripe, if you provided one at checkout.
          </p>

          <Link
            href="/"
            className="mt-8 inline-block text-sm font-medium text-white underline-offset-4 hover:underline"
          >
            Return to anr
          </Link>
        </div>
      </div>
    </div>
  );
}
