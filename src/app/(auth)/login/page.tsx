"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthStudioShell } from "@/components/auth/AuthStudioShell";
import { AuthTabs } from "@/components/ui/auth-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { S } from "@/components/studio/ui/s";
import { loginAction, type LoginActionState } from "./actions";

const loginInitialState: LoginActionState = { error: null };

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();
  const confirmationError = searchParams.get("error") === "confirmation";
  const [state, formAction, isPending] = useActionState(
    loginAction,
    loginInitialState
  );

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
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: S.textMuted }}>
              Sign in to open your studio.
            </p>
          </div>
        </div>

        <form action={formAction} method="post" className="space-y-4">
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
            placeholder="Your password"
            required
            autoComplete="current-password"
          />

          {confirmationError && (
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                color: S.warning,
                background: S.warningBg,
              }}
            >
              Email confirmation failed. Please try signing up again.
            </p>
          )}

          {state.error && (
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{ color: S.error, background: S.errorBg }}
            >
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            variant="studioAccent"
            loading={isPending}
            className="w-full"
          >
            Sign in
          </Button>
        </form>
      </div>
    </AuthStudioShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthStudioShell>
          <p className="text-center text-sm" style={{ color: S.textMuted }}>
            Loading…
          </p>
        </AuthStudioShell>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
