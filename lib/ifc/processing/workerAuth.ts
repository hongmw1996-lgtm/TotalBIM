import { NextResponse } from "next/server";

export function assertWorkerAuthorized(request: Request) {
  const expectedToken = process.env.IFC_WORKER_TOKEN;
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const headerToken = request.headers.get("x-ifc-worker-token");

  if (!expectedToken) {
    return NextResponse.json(
      { error: "IFC_WORKER_TOKEN is not configured." },
      { status: 503 }
    );
  }

  if (bearerToken !== expectedToken && headerToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}
