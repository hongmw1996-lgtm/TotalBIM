import { appendFile, readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

const DEFAULT_REDIRECT_URI = "http://localhost:3000/oauth2callback";
const DEFAULT_SCOPE = "https://www.googleapis.com/auth/drive.file";

function getProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

async function loadEnvFile(fileName) {
  const envPath = path.join(getProjectRoot(), fileName);

  try {
    const content = await readFile(envPath, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);

      if (!match) {
        continue;
      }

      const name = match[1].trim();
      let value = match[2].trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[name] ??= value;
    }
  } catch {
    // Optional local env file.
  }
}

async function loadLocalEnv() {
  await loadEnvFile(".env");
  await loadEnvFile(".env.worker.local");
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    requireEnv("GOOGLE_DRIVE_CLIENT_ID"),
    requireEnv("GOOGLE_DRIVE_CLIENT_SECRET"),
    process.env.GOOGLE_DRIVE_REDIRECT_URI ?? DEFAULT_REDIRECT_URI
  );
}

function printAuthUrl() {
  const auth = getOAuthClient();
  const scope = process.env.GOOGLE_DRIVE_SCOPE ?? DEFAULT_SCOPE;
  const url = auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope
  });

  console.log("Open this URL, approve access, then copy the `code` query value:");
  console.log(url);
}

async function exchangeCode(code) {
  const auth = getOAuthClient();
  const response = await auth.getToken(code);
  const refreshToken = response.tokens.refresh_token;

  if (!refreshToken) {
    throw new Error(
      "Google did not return a refresh token. Re-run auth-url and approve with prompt=consent."
    );
  }

  const envPath = path.join(getProjectRoot(), ".env.worker.local");
  await appendFile(
    envPath,
    `\nGOOGLE_DRIVE_REFRESH_TOKEN="${refreshToken}"\n`
  );

  console.log("GOOGLE_DRIVE_REFRESH_TOKEN was appended to .env.worker.local.");
}

async function listenForCode() {
  const auth = getOAuthClient();
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI ?? DEFAULT_REDIRECT_URI;
  const callbackUrl = new URL(redirectUri);
  const port = Number(callbackUrl.port || 80);
  const scope = process.env.GOOGLE_DRIVE_SCOPE ?? DEFAULT_SCOPE;
  const url = auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope
  });

  await new Promise((resolve, reject) => {
    const server = http.createServer(async (request, response) => {
      try {
        const requestUrl = new URL(request.url ?? "/", redirectUri);

        if (requestUrl.pathname !== callbackUrl.pathname) {
          response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Not found.");
          return;
        }

        const error = requestUrl.searchParams.get("error");
        const code = requestUrl.searchParams.get("code");

        if (error) {
          response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
          response.end(`Google OAuth failed: ${error}`);
          reject(new Error(`Google OAuth failed: ${error}`));
          server.close();
          return;
        }

        if (!code) {
          response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Missing OAuth code.");
          reject(new Error("Missing OAuth code."));
          server.close();
          return;
        }

        await exchangeCode(code);
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(
          "<!doctype html><title>Google Drive connected</title><h1>Google Drive connected.</h1><p>You can close this tab and return to Codex.</p>"
        );
        resolve();
        server.close();
      } catch (error) {
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(error instanceof Error ? error.message : String(error));
        reject(error);
        server.close();
      }
    });

    server.once("error", reject);
    server.listen(port, callbackUrl.hostname, () => {
      console.log(`Listening for Google OAuth callback at ${redirectUri}`);
      console.log("Open this URL and approve access:");
      console.log(url);
    });
  });
}

async function main() {
  await loadLocalEnv();

  const command = process.argv[2];

  if (command === "auth-url") {
    printAuthUrl();
    return;
  }

  if (command === "exchange-code") {
    const code = process.argv[3];

    if (!code) {
      throw new Error("Usage: npm.cmd run gdrive:exchange-code -- <code>");
    }

    await exchangeCode(code);
    return;
  }

  if (command === "listen") {
    await listenForCode();
    return;
  }

  console.log("Usage:");
  console.log("  npm.cmd run gdrive:auth-url");
  console.log("  npm.cmd run gdrive:exchange-code -- <code>");
  console.log("  npm.cmd run gdrive:listen");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
