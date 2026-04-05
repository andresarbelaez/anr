import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the service role key. Bypasses RLS.
 * Use only in trusted server contexts (e.g. Stripe webhooks).
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key);
}
