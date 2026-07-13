import {
  ADMIN_USERNAME,
  type AuthSessionUser,
  getAdminSessionUser,
  readAuthCookieValue
} from "@/lib/auth/adminAuth";
import { findAuthUser } from "@/lib/auth/userStore";

export async function getAuthSessionUser(
  cookieValue: string | undefined
): Promise<AuthSessionUser | null> {
  const username = readAuthCookieValue(cookieValue);

  if (!username) {
    return null;
  }

  if (username === ADMIN_USERNAME) {
    return getAdminSessionUser();
  }

  const user = await findAuthUser(username);

  if (!user) {
    return null;
  }

  return {
    username: user.username,
    name: user.name || user.username,
    role: "user"
  };
}
