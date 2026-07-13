import { NextResponse } from "next/server";
import { ApsConfigurationError, getApsViewerToken } from "@/lib/aps/apsClient";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getApsViewerToken();

    return NextResponse.json({
      access_token: token.access_token,
      expires_in: token.expires_in,
      token_type: token.token_type
    });
  } catch (error) {
    if (error instanceof ApsConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "APS viewer token 발급에 실패했습니다."
      },
      { status: 500 }
    );
  }
}
