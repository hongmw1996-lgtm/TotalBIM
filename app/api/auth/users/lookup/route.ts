import { NextResponse } from "next/server";
import {
  ADMIN_USERNAME,
  AUTH_COOKIE_NAME,
  getAdminSessionUser
} from "@/lib/auth/adminAuth";
import { getAuthSessionUser } from "@/lib/auth/session";
import { findAuthUser } from "@/lib/auth/userStore";

export const runtime = "nodejs";

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}

export async function GET(request: Request) {
  const currentUser = await getAuthSessionUser(
    readCookie(request.headers.get("cookie"), AUTH_COOKIE_NAME)
  );

  if (!currentUser) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim() ?? "";

  if (username.length < 3) {
    return NextResponse.json(
      { error: "아이디를 3자 이상 입력해 주세요." },
      { status: 400 }
    );
  }

  const user =
    username === ADMIN_USERNAME ? getAdminSessionUser() : await findAuthUser(username);

  if (!user) {
    return NextResponse.json(
      { error: "가입된 아이디를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    user: {
      name: user.name,
      username: user.username
    }
  });
}
