import { NextResponse } from "next/server";
import { ApsConfigurationError } from "@/lib/aps/apsClient";
import { refreshApsConversionStatus } from "@/lib/aps/ifcModelApsConversion";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const result = await refreshApsConversionStatus(id);

    if (!result) {
      return NextResponse.json(
        { error: "APS 변환 파생파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApsConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "APS 변환 상태 조회에 실패했습니다."
      },
      { status: 500 }
    );
  }
}
