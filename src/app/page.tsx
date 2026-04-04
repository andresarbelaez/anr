import Link from "next/link";
import { ArrowRight, Music, Zap, Heart, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <span className="text-lg font-bold text-white">ANR</span>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-20 text-center md:pt-36">
        <div className="mb-6 inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900/50 px-3 py-1 text-xs text-neutral-400">
          100% free &middot; No hidden fees &middot; No commission
        </div>

        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
          Distribute your music
          <br />
          <span className="text-neutral-400">to every platform</span>
        </h1>

        <p className="mx-auto mt-6 max-w-lg text-lg text-neutral-400">
          Upload your tracks and get them on Spotify, Apple Music, and 150+
          streaming platforms. No subscriptions, no paywalls — just music.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">
              Start distributing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800">
              <Music className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Upload & distribute
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              Upload your WAV files, add metadata, and submit. We handle
              the rest — formatting, delivery, and compliance with every DSP.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              150+ platforms
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              Spotify, Apple Music, Amazon Music, Tidal, Deezer, YouTube Music,
              and many more. One upload, global reach.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Track your royalties
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              See your streams and earnings across all platforms in one
              dashboard. Transparent, real-time reporting.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Community supported
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              This platform runs on donations from artists and fans who
              believe music distribution should be free for everyone.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-900 px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-white md:text-3xl">
          Ready to share your music with the world?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-neutral-400">
          Join thousands of independent artists distributing their music for
          free.
        </p>
        <Link href="/signup" className="mt-8 inline-block">
          <Button size="lg">
            Create your free account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 px-6 py-8 text-center text-sm text-neutral-600">
        <p>
          ANR — Free music distribution for independent artists.{" "}
          <a
            href="/donate"
            className="underline hover:text-neutral-400"
          >
            Support this project
          </a>
        </p>
      </footer>
    </div>
  );
}
