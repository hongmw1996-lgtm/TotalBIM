"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "signup";

export function AuthLanding() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignupComplete, setIsSignupComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isIntroCollapsed, setIsIntroCollapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsIntroCollapsed(true);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  async function handleLogin() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "로그인에 실패했습니다.");
      }

      router.push("/projects");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "로그인에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignup() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          username,
          password
        })
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "회원가입에 실패했습니다.");
      }

      setMode("login");
      setIsSignupComplete(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "회원가입에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#171717]">
      <section
        className="min-h-screen lg:grid lg:transition-[grid-template-columns] lg:duration-1000 lg:ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          gridTemplateColumns: isIntroCollapsed
            ? "minmax(0, 77%) minmax(280px, 23%)"
            : "minmax(0, 100%) minmax(0, 0%)"
        }}
      >
        <div className="relative min-h-[44vh] overflow-hidden border-b border-[#e6e1d8] bg-[#f3efe7] lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,101,84,0.18),transparent_26%),radial-gradient(circle_at_74%_22%,rgba(196,125,26,0.16),transparent_24%),radial-gradient(circle_at_64%_76%,rgba(19,55,92,0.15),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.56),rgba(255,255,255,0))]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(23,23,23,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(23,23,23,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40" />

          <div className="relative flex min-h-[44vh] items-center px-6 py-10 lg:min-h-screen lg:px-10 lg:py-8">
            <div
              className={`mx-auto flex w-full max-w-[1160px] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isIntroCollapsed ? "justify-start" : "justify-center"
              }`}
            >
              <div
                className={`transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isIntroCollapsed ? "max-w-[680px]" : "max-w-[920px] text-center"
                }`}
              >
                <p className="font-mono text-[12px] uppercase tracking-[0.24em] text-[#746d62]">
                  Develop. Preview. Review.
                </p>
                <h2
                  className={`mt-6 font-semibold leading-[0.92] tracking-[-0.08em] text-[#171717] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isIntroCollapsed
                      ? "max-w-[10ch] text-[clamp(3.4rem,7vw,5.8rem)]"
                      : "mx-auto max-w-[12ch] text-[clamp(4rem,8vw,7rem)]"
                  }`}
                >
                  IFC workflows for production review.
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`min-h-[56vh] overflow-hidden bg-[#f7f7f5] transition-opacity duration-700 lg:min-h-screen ${
            isIntroCollapsed
              ? "opacity-100 delay-300"
              : "pointer-events-none opacity-0"
          }`}
        >
          <div className="flex h-full min-h-[56vh] items-center justify-center px-6 py-8 lg:min-h-screen lg:px-8">
            <section className="w-full max-w-[360px]">
              <div className="inline-flex rounded-[100px] border border-[#ebebeb] bg-[#fcfcfc] p-1">
                <button
                  type="button"
                  className={`rounded-[100px] px-4 py-2 text-sm font-medium transition ${
                    mode === "login"
                      ? "bg-[#171717] text-white"
                      : "text-[#4d4d4d]"
                  }`}
                  onClick={() => {
                    setMode("login");
                    setMessage(null);
                  }}
                >
                  로그인
                </button>
                <button
                  type="button"
                  className={`rounded-[100px] px-4 py-2 text-sm font-medium transition ${
                    mode === "signup"
                      ? "bg-[#171717] text-white"
                      : "text-[#4d4d4d]"
                  }`}
                  onClick={() => {
                    setMode("signup");
                    setMessage(null);
                  }}
                >
                  회원가입
                </button>
              </div>

              <div className="mt-6">
                <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#8f8f8f]">
                  Account Access
                </p>
                <h3 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.06em] text-[#171717]">
                  {mode === "login" ? "로그인" : "회원가입"}
                </h3>
              </div>

              <form
                className="mt-8 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();

                  if (mode === "login") {
                    void handleLogin();
                    return;
                  }

                  void handleSignup();
                }}
              >
                {mode === "signup" ? (
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[#8f8f8f]">
                      이름(성명)
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="성명 입력"
                      className="h-12 w-full rounded-[6px] border border-[#ebebeb] bg-white px-4 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                    />
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[#8f8f8f]">
                    아이디
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="아이디 입력"
                    className="h-12 w-full rounded-[6px] border border-[#ebebeb] bg-white px-4 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[#8f8f8f]">
                    비밀번호
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="비밀번호 입력"
                    className="h-12 w-full rounded-[6px] border border-[#ebebeb] bg-white px-4 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                {message ? (
                  <p className="rounded-[12px] border border-[#ebebeb] bg-[#fcfcfc] px-4 py-3 text-sm text-[#4d4d4d]">
                    {message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  className="h-12 w-full rounded-[100px] bg-[#171717] text-sm font-medium text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "확인 중..."
                    : mode === "login"
                      ? "로그인"
                      : "회원가입"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </section>

      {isSignupComplete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,23,23,0.32)] px-6">
          <div className="w-full max-w-[360px] rounded-[8px] border border-[#ebebeb] bg-white p-6 shadow-[0_18px_56px_rgba(0,0,0,0.16)]">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#8f8f8f]">
              Signup Complete
            </p>
            <h4 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.04em] text-[#171717]">
              회원가입 완료
            </h4>
            <p className="mt-3 text-sm leading-6 text-[#4d4d4d]">
              {username} 계정이 생성되었습니다.
            </p>
            <button
              type="button"
              className="mt-6 h-12 w-full rounded-[100px] bg-[#171717] text-sm font-medium text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                setIsSignupComplete(false);
                setMode("login");
                setMessage(null);
              }}
            >
              로그인하기
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
