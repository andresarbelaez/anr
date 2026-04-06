import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  const isDashboardPage =
    request.nextUrl.pathname.startsWith("/releases") ||
    request.nextUrl.pathname.startsWith("/royalties") ||
    request.nextUrl.pathname.startsWith("/settings") ||
    request.nextUrl.pathname.startsWith("/crm") ||
    request.nextUrl.pathname.startsWith("/catalog") ||
    request.nextUrl.pathname.startsWith("/feedback") ||
    request.nextUrl.pathname.startsWith("/assistant") ||
    request.nextUrl.pathname.startsWith("/calendar");

  if (!user && isDashboardPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/releases";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
