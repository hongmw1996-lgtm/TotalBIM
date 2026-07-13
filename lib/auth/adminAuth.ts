export const AUTH_COOKIE_NAME = "bim_session";
export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "1111";
export const ADMIN_DISPLAY_NAME = "관리자";

export type AuthSessionUser = {
  username: string;
  name: string;
  role: "admin" | "user";
};

export function createAuthCookieValue(username: string) {
  return Buffer.from(JSON.stringify({ username }), "utf8").toString(
    "base64url"
  );
}

export function readAuthCookieValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as { username?: unknown };

    return typeof payload.username === "string" ? payload.username : null;
  } catch {
    return null;
  }
}

export function getAdminSessionUser(): AuthSessionUser {
  return {
    username: ADMIN_USERNAME,
    name: ADMIN_DISPLAY_NAME,
    role: "admin"
  };
}
