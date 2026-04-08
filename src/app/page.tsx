import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Heart,
  ListMusic,
  MessageSquareText,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { S } from "@/components/studio/ui/s";

export default function HomePage() {
  return (
    <div className="min-h-screen antialiased" style={{ background: S.bg }}>
      <header
        className="flex items-center justify-between px-6 py-4 md:px-12"
        style={{ borderBottom: `1px solid ${S.borderFaint}` }}
      >
        <span className="text-lg font-bold" style={{ color: S.textPrimary }}>
          sidestage
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login">
            <Button
              variant="outlineSoft"
              size="sm"
              className="!rounded-sm !border-[#d4b896] !text-xs font-medium sm:!text-sm text-[#5a3518]"
            >
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button
              variant="studioAccent"
              size="sm"
              className="!rounded-sm !text-xs font-semibold sm:!text-sm"
            >
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center md:pt-28 md:pb-20">
        <div
          className="mb-6 inline-flex items-center rounded-full border px-3 py-1 text-xs"
          style={{
            background: S.surface,
            borderColor: S.border,
            color: S.textMuted,
          }}
        >
          100% free &middot; No hidden fees &middot; No commission
        </div>

        <h1
          className="text-4xl font-bold leading-tight tracking-tight md:text-6xl"
          style={{ color: S.textPrimary }}
        >
          You bring the music.
          <br />
          <span style={{ color: S.accent }}>sidestage handles the rest.</span>
        </h1>

        <p
          className="mx-auto mt-6 max-w-lg text-lg leading-relaxed"
          style={{ color: S.textMuted }}
        >
          Catalog, release prep, calendar, CRM, feedback, and sidestage-1 — an
          AI that knows your work. Free for all artists.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button
              variant="studioAccent"
              size="lg"
              className="!rounded-sm !px-6 !font-semibold"
            >
              Start building your career
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {[
            {
              icon: ListMusic,
              title: "Library & catalog",
              body: "Released and unreleased work, versions, and metadata in one private workspace—so masters and drafts are not scattered across folders and threads.",
            },
            {
              icon: Users,
              title: "CRM for your network",
              body: "Contacts, roles, last touch, and collaborations tied to releases or library songs—the people around your career in one place.",
            },
            {
              icon: CalendarDays,
              title: "Release calendar",
              body: "Plan drops, promo, sessions, and deadlines beside your catalog so dates are not orphaned in another app.",
            },
            {
              icon: MessageSquareText,
              title: "Feedback & listen links",
              body: "Private listen links, timestamped comments, and notes anchored to the right version—demos without the group-chat sprawl.",
            },
            {
              icon: Sparkles,
              title: "sidestage-1",
              body: "An AI that knows your catalog, contacts, and releases. Draft outreach, pull links, or run your CRM from plain language.",
            },
            {
              icon: Heart,
              title: "Free to use",
              body: "Core tools stay free. sidestage is sustained by donations from artists and fans—no commission, no hidden fees.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border p-6"
              style={{
                background: S.surface,
                borderColor: S.border,
                boxShadow: "0 2px 12px rgba(30,16,8,0.06)",
              }}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{
                  background: S.bg,
                  borderColor: S.borderFaint,
                  color: S.accent,
                }}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3
                className="text-lg font-semibold"
                style={{ color: S.textPrimary }}
              >
                {title}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: S.textMuted }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="px-6 py-16 text-center md:py-20"
        style={{
          borderTop: `1px solid ${S.border}`,
          background: S.surfaceAlt,
        }}
      >
        <h2
          className="text-2xl font-bold md:text-3xl"
          style={{ color: S.textPrimary }}
        >
          Your career doesn&rsquo;t need a deal.
        </h2>
        <p
          className="mx-auto mt-3 max-w-md"
          style={{ color: S.textMuted }}
        >
          Join independent artists building their careers with sidestage.
        </p>
        <Link href="/signup" className="mt-8 inline-block">
          <Button
            variant="studioAccent"
            size="lg"
            className="!rounded-sm !px-6 !font-semibold"
          >
            Create your free account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>

      <footer
        className="px-6 py-8 text-center text-sm"
        style={{
          borderTop: `1px solid ${S.borderFaint}`,
          color: S.textFaint,
        }}
      >
        <p>
          sidestage — Built for independent artists.{" "}
          <Link
            href="/donate"
            className="font-medium underline decoration-[#c4a88c] underline-offset-2 transition hover:decoration-[#a85c10]"
            style={{ color: S.accent }}
          >
            Support this project
          </Link>
        </p>
      </footer>
    </div>
  );
}
