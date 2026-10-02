import { NextRequest, NextResponse } from "next/server";
import {
  checkPassword,
  checkSecurityAnswer,
  signSession,
  ADMIN_COOKIE,
  issueStepToken,
  verifyStepToken,
  ADMIN_STEP_COOKIE,
  SECURITY_QUESTION,
} from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const stepCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`admin-login:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));

  // Step 2: the security question. Only reachable with a valid step-1 token.
  if (body.step === 2) {
    const stepToken = req.cookies.get(ADMIN_STEP_COOKIE)?.value;
    if (!(await verifyStepToken(stepToken))) {
      return NextResponse.json({ error: "Session expired. Start again." }, { status: 401 });
    }
    if (!process.env.ADMIN_SECURITY_ANSWER) {
      return NextResponse.json(
        { error: "The security answer is not configured on the server." },
        { status: 500 }
      );
    }
    if (!checkSecurityAnswer(String(body.answer || ""))) {
      await sleep(800);
      return NextResponse.json({ error: "That did not match." }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_STEP_COOKIE, "", { ...stepCookie, maxAge: 0 });
    res.cookies.set(ADMIN_COOKIE, await signSession(), {
      ...stepCookie,
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  // Step 1: the password.
  if (!checkPassword(String(body.password || ""))) {
    await sleep(800);
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const { token, expiresAt } = await issueStepToken();
  const res = NextResponse.json({ step: 2, question: SECURITY_QUESTION });
  res.cookies.set(ADMIN_STEP_COOKIE, token, {
    ...stepCookie,
    maxAge: Math.max(60, Math.floor((expiresAt - Date.now()) / 1000)),
  });
  return res;
}
