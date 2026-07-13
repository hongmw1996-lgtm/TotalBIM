type ApsTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type ApsBucketResponse = {
  bucketKey: string;
};

type ApsObjectResponse = {
  objectId: string;
  objectKey: string;
  size: number;
};

export type ApsDerivativeManifest = {
  status?: string;
  progress?: string;
  region?: string;
  urn?: string;
  derivatives?: Array<{
    name?: string;
    status?: string;
    progress?: string;
    messages?: unknown[];
    outputType?: string;
    children?: unknown[];
  }>;
  messages?: unknown[];
};

export class ApsConfigurationError extends Error {
  constructor() {
    super("APS_CLIENT_ID/APS_CLIENT_SECRET 설정이 필요합니다.");
    this.name = "ApsConfigurationError";
  }
}

const APS_API_BASE = "https://developer.api.autodesk.com";
const DEFAULT_REGION = "US";

function requireApsCredential(name: "APS_CLIENT_ID" | "APS_CLIENT_SECRET") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ApsConfigurationError();
  }

  return value;
}

function getApsCredentials() {
  return {
    clientId: requireApsCredential("APS_CLIENT_ID"),
    clientSecret: requireApsCredential("APS_CLIENT_SECRET")
  };
}

function getApsRegion() {
  const region = process.env.APS_REGION?.trim().toUpperCase();

  return region === "EMEA" ? "EMEA" : DEFAULT_REGION;
}

function getDefaultBucketKey(clientId: string) {
  const suffix = process.env.APS_BUCKET_SUFFIX?.trim() || "bim-viewer";
  const rawKey = `${clientId}-${suffix}`.toLowerCase();

  return rawKey.replace(/[^a-z0-9._-]/g, "-").slice(0, 128);
}

export function isApsConfigured() {
  return Boolean(process.env.APS_CLIENT_ID && process.env.APS_CLIENT_SECRET);
}

export function getApsBucketKey() {
  const { clientId } = getApsCredentials();
  const configuredBucketKey = process.env.APS_BUCKET_KEY?.trim();

  return configuredBucketKey || getDefaultBucketKey(clientId);
}

export function encodeApsUrn(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function parseApsResponse<T>(response: Response, fallbackMessage: string) {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T & { reason?: string; message?: string }) : null;

  if (!response.ok) {
    throw new Error(payload?.reason ?? payload?.message ?? fallbackMessage);
  }

  if (!payload) {
    throw new Error(fallbackMessage);
  }

  return payload;
}

export async function getApsAccessToken(scopes: string[]) {
  const { clientId, clientSecret } = getApsCredentials();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: scopes.join(" ")
  });
  const response = await fetch(`${APS_API_BASE}/authentication/v2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  return parseApsResponse<ApsTokenResponse>(
    response,
    "APS access token 발급에 실패했습니다."
  );
}

async function getInternalToken() {
  return getApsAccessToken([
    "bucket:create",
    "bucket:read",
    "data:create",
    "data:read",
    "data:write",
    "viewables:read"
  ]);
}

export async function getApsViewerToken() {
  return getApsAccessToken(["viewables:read"]);
}

export async function ensureApsBucket() {
  const token = await getInternalToken();
  const bucketKey = getApsBucketKey();
  const detailResponse = await fetch(
    `${APS_API_BASE}/oss/v2/buckets/${encodeURIComponent(bucketKey)}/details`,
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`
      }
    }
  );

  if (detailResponse.ok) {
    return parseApsResponse<ApsBucketResponse>(
      detailResponse,
      "APS bucket 정보를 확인하지 못했습니다."
    );
  }

  if (detailResponse.status !== 404) {
    await parseApsResponse(detailResponse, "APS bucket 조회에 실패했습니다.");
  }

  const createResponse = await fetch(`${APS_API_BASE}/oss/v2/buckets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
      "x-ads-region": getApsRegion()
    },
    body: JSON.stringify({
      bucketKey,
      policyKey: "transient"
    })
  });

  return parseApsResponse<ApsBucketResponse>(
    createResponse,
    "APS bucket 생성에 실패했습니다."
  );
}

export async function uploadApsObject({
  objectName,
  body,
  contentLength
}: {
  objectName: string;
  body: Buffer;
  contentLength: number;
}) {
  const token = await getInternalToken();
  const bucketKey = getApsBucketKey();
  await ensureApsBucket();

  const response = await fetch(
    `${APS_API_BASE}/oss/v2/buckets/${encodeURIComponent(
      bucketKey
    )}/objects/${encodeURIComponent(objectName)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(contentLength)
      },
      body: body as unknown as BodyInit
    }
  );

  return parseApsResponse<ApsObjectResponse>(
    response,
    "APS OSS 업로드에 실패했습니다."
  );
}

export async function startApsSvf2Translation(urn: string, rootFileName: string) {
  const token = await getInternalToken();
  const response = await fetch(`${APS_API_BASE}/modelderivative/v2/designdata/job`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
      "x-ads-force": "true"
    },
    body: JSON.stringify({
      input: {
        urn,
        rootFilename: rootFileName
      },
      output: {
        formats: [
          {
            type: "svf2",
            views: ["2d", "3d"]
          }
        ]
      }
    })
  });

  return parseApsResponse<Record<string, unknown>>(
    response,
    "APS Model Derivative 변환 요청에 실패했습니다."
  );
}

export async function getApsDerivativeManifest(urn: string) {
  const token = await getInternalToken();
  const response = await fetch(
    `${APS_API_BASE}/modelderivative/v2/designdata/${encodeURIComponent(
      urn
    )}/manifest`,
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`
      }
    }
  );

  return parseApsResponse<ApsDerivativeManifest>(
    response,
    "APS 변환 상태 조회에 실패했습니다."
  );
}

export function getApsDerivativeStatus(manifest: ApsDerivativeManifest) {
  const status = manifest.status?.toLowerCase();

  if (status === "success") {
    return "READY";
  }

  if (status === "failed" || status === "timeout") {
    return "FAILED";
  }

  return "PROCESSING";
}
