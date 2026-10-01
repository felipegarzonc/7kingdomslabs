import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Device webhooks and the reminder cron authenticate themselves (Strava verify token, personal
// upload link, cron secret); the buddy page is reached by its unguessable token.
const PUBLIC_PATHS = [
  "/inicio",
  "/login",
  "/auth",
  "/privacidad",
  "/consentimiento",
  "/estado",
  "/compartir",
  "/sw.js",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/api/strava/webhook",
  "/api/ingest",
  "/api/cron",
];

/** Refreshes the Supabase session cookie and keeps signed-out users out of the app. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = path === "/" || PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  if (!user && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
