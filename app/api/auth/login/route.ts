import { NextResponse } from "next/server";
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  AUTH_COOKIE_NAME,
  createAuthCookieValue
} from "@/lib/auth/adminAuth";
import { verifyPassword } from "@/lib/auth/password";
import { findAuthUser } from "@/lib/auth/userStore";

export const runtime = "nodejs";

type LoginRequest = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as LoginRequest;
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (username.length < 3) {
    return NextResponse.json(
      { error: "아이디를 입력해 주세요." },
      { status: 400 }
    );
  }

  const isAdminLogin = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
  const user = isAdminLogin ? null : await findAuthUser(username);

  if (
    !isAdminLogin &&
    (!user || !(await verifyPassword(password, user.passwordHash)))
  ) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: createAuthCookieValue(username),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12
  });

  return response;
}
