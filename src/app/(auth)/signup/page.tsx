"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthStudioShell } from "@/components/auth/AuthStudioShell";
import { AuthTabs } from "@/components/ui/auth-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { S } from "@/components/studio/ui/s";

export default function SignupPage() {
  const [artistName, setArtistName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { artist_name: artistName },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.assign(`${window.location.origin}/home`);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <AuthStudioShell>
        <div className="space-y-4 text-center">
          <h1
            className="text-2xl font-bold"
            style={{ color: S.textPrimary }}
          >
            Check your email
          </h1>
          <p className="text-sm" style={{ color: S.textMuted }}>
            We sent a confirmation link to{" "}
            <strong style={{ color: S.textSecondary }}>{email}</strong>. Click
            it and you&apos;ll be signed in automatically.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: S.accent }}
          >
            Back to login
          </Link>
        </div>
      </AuthStudioShell>
    );
  }

  return (
    <AuthStudioShell>
      <div className="space-y-8">
        <div className="space-y-6">
          <AuthTabs />
          <div className="text-center">
            <h1
              className="text-2xl font-bold"
              style={{ color: S.textPrimary }}
            >
              You bring the music.
              <br />
              <span style={{ color: S.accent }}>sidestage handles the rest.</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: S.textMuted }}>
              Your music, your business, and sidestage-1 in one free studio.
            </p>
          </div>
        </div>

        <form onSubmit={handleSignup} method="post" className="space-y-4">
          <Input
            id="artistName"
            name="name"
            label="Artist Name"
            appearance="studio"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Your artist name"
            required
            autoComplete="name"
          />

          <Input
            id="email"
            name="email"
            label="Email"
            type="email"
            appearance="studio"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <Input
            id="password"
            name="password"
            label="Password"
            type="password"
            appearance="studio"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
          />

          <Input
            id="confirmPassword"
            name="confirm-password"
            label="Confirm Password"
            type="password"
            appearance="studio"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            minLength={8}
            autoComplete="new-password"
          />

          {error && (
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{ color: S.error, background: S.errorBg }}
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="studioAccent"
            loading={loading}
            className="w-full"
          >
            Create account
          </Button>
        </form>
      </div>
    </AuthStudioShell>
  );
}
