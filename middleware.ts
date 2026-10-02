import { NextRequest, NextResponse } from "next/server";
import { verifySession, ADMIN_COOKIE } from "./lib/auth";

function secretPath(): string | null {
  // NOTE: env vars are inlined into middleware at build time, so changing
  // ADMIN_PATH takes effect on the next deploy, not instantly.
  const p = (process.env.ADMIN_PATH || "").trim().replace(/^\/+|\/+$/g, "");
  return p || null;
}

// Returns a response when the request is NOT authenticated, else null.
async function requireAdmin(req: NextRequest, loginPath: string, api: boolean) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (await verifySession(token)) return null;
  if (api) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.redirect(new URL(loginPath, req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = secretPath();
  const isProd = process.env.NODE_ENV === "production";

  const legacyUi = pathname === "/admin" || pathname.startsWith("/admin/");
  const legacyApi = pathname === "/api/admin" || pathname.startsWith("/api/admin/");

  // The guessable paths are dead: once a secret path is configured they 404,
  // and in production they 404 until one is configured.
  if (legacyUi || legacyApi) {
    if (secret || isProd) {
      return legacyApi
        ? NextResponse.json({ error: "Not found." }, { status: 404 })
        : new NextResponse("Not found.", { status: 404 });
    }
    // Local dev without ADMIN_PATH keeps the old behavior.
    if (legacyUi && pathname !== "/admin/login") {
      const r = await requireAdmin(req, "/admin/login", false);
      if (r) return r;
    }
    return NextResponse.next();
  }

  if (secret) {
    const ui = `/${secret}`;
    const api = `/api/${secret}`;

    if (pathname === ui || pathname.startsWith(ui + "/")) {
      const internal = "/admin" + pathname.slice(ui.length);
      if (internal !== "/admin/login") {
        const r = await requireAdmin(req, `${ui}/login`, false);
        if (r) return r;
      }
      const url = req.nextUrl.clone();
      url.pathname = internal;
      return NextResponse.rewrite(url);
    }

    if (pathname === api || pathname.startsWith(api + "/")) {
      const internal = "/api/admin" + pathname.slice(api.length);
      if (internal !== "/api/admin/login") {
        const r = await requireAdmin(req, `${ui}/login`, true);
        if (r) return r;
      }
      const url = req.nextUrl.clone();
      url.pathname = internal;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    // Broad catch so the secret path (only known at runtime) is intercepted,
    // skipping static assets and files with extensions.
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
