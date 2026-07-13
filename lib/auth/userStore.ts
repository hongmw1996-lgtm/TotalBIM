import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

type AuthUser = {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
};

type LocalAuthUser = AuthUser & {
  createdAt: string;
};

export class AuthUserStoreError extends Error {
  constructor(
    message: string,
    public readonly code: "DUPLICATE_USERNAME"
  ) {
    super(message);
  }
}

const localUsersFile = path.join(process.cwd(), ".local", "auth-users.json");

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function readLocalUsers() {
  try {
    const content = await readFile(localUsersFile, "utf8");
    const parsed = JSON.parse(content.replace(/^\uFEFF/, "")) as
      | LocalAuthUser[]
      | LocalAuthUser;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

async function writeLocalUsers(users: LocalAuthUser[]) {
  await mkdir(path.dirname(localUsersFile), { recursive: true });
  await writeFile(localUsersFile, `${JSON.stringify(users, null, 2)}\n`, "utf8");
}

export async function findAuthUser(username: string): Promise<AuthUser | null> {
  if (prisma) {
    try {
      return await prisma.appUser.findUnique({
        where: { username },
        select: {
          id: true,
          name: true,
          username: true,
          passwordHash: true
        }
      });
    } catch {
      // Local development can run without PostgreSQL. Fall back to file storage.
    }
  }

  const users = await readLocalUsers();
  return users.find((user) => user.username === username) ?? null;
}

export async function createAuthUser(
  name: string,
  username: string,
  passwordHash: string
) {
  if (prisma) {
    try {
      return await prisma.appUser.create({
        data: {
          name,
          username,
          passwordHash
        },
        select: {
          id: true,
          name: true,
          username: true,
          passwordHash: true
        }
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AuthUserStoreError(
          "이미 사용 중인 아이디입니다.",
          "DUPLICATE_USERNAME"
        );
      }

      // Local development can run without PostgreSQL. Fall back to file storage.
    }
  }

  const users = await readLocalUsers();

  if (users.some((user) => user.username === username)) {
    throw new AuthUserStoreError(
      "이미 사용 중인 아이디입니다.",
      "DUPLICATE_USERNAME"
    );
  }

  const user: LocalAuthUser = {
    id: randomUUID(),
    name,
    username,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  await writeLocalUsers(users);

  return user;
}
