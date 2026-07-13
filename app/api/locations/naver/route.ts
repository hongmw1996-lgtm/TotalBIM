import { NextRequest, NextResponse } from "next/server";

type NaverLocalSearchItem = {
  address?: string;
  category?: string;
  link?: string;
  mapx?: string;
  mapy?: string;
  roadAddress?: string;
  title?: string;
};

type NaverLocalSearchResponse = {
  errorCode?: string;
  errorMessage?: string;
  items?: NaverLocalSearchItem[];
};

const NAVER_LOCAL_SEARCH_ENDPOINT =
  "https://openapi.naver.com/v1/search/local.json";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json(
      { error: "검색어를 2자 이상 입력해 주세요." },
      { status: 400 }
    );
  }

  const clientId =
    process.env.NAVER_SEARCH_CLIENT_ID ?? process.env.NAVER_CLIENT_ID;
  const clientSecret =
    process.env.NAVER_SEARCH_CLIENT_SECRET ?? process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "NAVER_SEARCH_CLIENT_ID와 NAVER_SEARCH_CLIENT_SECRET 환경변수가 설정되지 않았습니다."
      },
      { status: 503 }
    );
  }

  const params = new URLSearchParams({
    query,
    display: "5",
    start: "1",
    sort: "random"
  });
  const response = await fetch(`${NAVER_LOCAL_SEARCH_ENDPOINT}?${params}`, {
    cache: "no-store",
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret
    }
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "네이버 지도 위치 검색에 실패했습니다." },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as NaverLocalSearchResponse;

  if (payload.errorCode) {
    return NextResponse.json(
      {
        error:
          payload.errorMessage ?? "네이버 지도 위치 검색 결과가 올바르지 않습니다."
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    locations: (payload.items ?? []).map((item) => ({
      address: stripHtml(item.address ?? ""),
      category: stripHtml(item.category ?? ""),
      link: item.link ?? "",
      mapx: item.mapx ?? "",
      mapy: item.mapy ?? "",
      roadAddress: stripHtml(item.roadAddress ?? ""),
      title: stripHtml(item.title ?? "")
    }))
  });
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}
