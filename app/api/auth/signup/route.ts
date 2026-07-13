import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { AuthUserStoreError, createAuthUser } from "@/lib/auth/userStore";

export const runtime = "nodejs";

type SignupRequest = {
  name?: string;
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as SignupRequest;
  const name = body.name?.trim() ?? "";
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (name.length < 2) {
    return NextResponse.json(
      { error: "이름을 2자 이상 입력해 주세요." },
      { status: 400 }
    );
  }

  if (username.length < 3) {
    return NextResponse.json(
      { error: "아이디는 3자 이상 입력해 주세요." },
      { status: 400 }
    );
  }

  if (password.length < 4) {
    return NextResponse.json(
      { error: "비밀번호는 4자 이상 입력해 주세요." },
      { status: 400 }
    );
  }

  try {
    await createAuthUser(name, username, await hashPassword(password));
  } catch (error) {
    if (
      error instanceof AuthUserStoreError &&
      error.code === "DUPLICATE_USERNAME"
    ) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다." },
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json({ ok: true });
}
