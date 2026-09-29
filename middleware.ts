import { NextRequest, NextResponse } from "next/server";
import { verifySession, ADMIN_COOKIE } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin")) {
    const res = NextResponse.next();
    res.headers.set("x-admin", "1");
    if (pathname !== "/admin/login") {
      const token = req.cookies.get(ADMIN_COOKIE)?.value;
      if (!(await verifySession(token))) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }
    return res;
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
