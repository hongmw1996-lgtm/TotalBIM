import { NextRequest, NextResponse } from "next/server";

type KmaForecastItem = {
  baseDate: string;
  baseTime: string;
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
  nx: number;
  ny: number;
};

type KmaForecastResponse = {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?: {
        item?: KmaForecastItem[];
      };
    };
  };
};

const SEOUL_GRID = {
  nx: 60,
  ny: 127
};

const KMA_ENDPOINT =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

const forecastBaseTimes = [
  "0200",
  "0500",
  "0800",
  "1100",
  "1400",
  "1700",
  "2000",
  "2300"
];

export async function GET(request: NextRequest) {
  const serviceKey = process.env.KMA_SERVICE_KEY ?? process.env.KMA_API_KEY;

  if (!serviceKey) {
    return NextResponse.json(
      {
        error:
          "KMA_SERVICE_KEY 또는 KMA_API_KEY 환경변수가 설정되지 않았습니다."
      },
      { status: 503 }
    );
  }

  const targetDate = request.nextUrl.searchParams.get("date") ?? getKstDate();
  const baseDateTime = getLatestKmaBaseDateTime();
  const params = new URLSearchParams({
    pageNo: "1",
    numOfRows: "1000",
    dataType: "JSON",
    base_date: baseDateTime.baseDate,
    base_time: baseDateTime.baseTime,
    nx: String(SEOUL_GRID.nx),
    ny: String(SEOUL_GRID.ny)
  });
  const encodedServiceKey = /%[0-9A-Fa-f]{2}/.test(serviceKey)
    ? serviceKey
    : encodeURIComponent(serviceKey);
  const response = await fetch(
    `${KMA_ENDPOINT}?serviceKey=${encodedServiceKey}&${params.toString()}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "기상청 예보 조회에 실패했습니다." },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as KmaForecastResponse;
  const header = payload.response?.header;

  if (header?.resultCode && header.resultCode !== "00") {
    return NextResponse.json(
      { error: header.resultMsg ?? "기상청 예보 조회 결과가 올바르지 않습니다." },
      { status: 502 }
    );
  }

  const items = payload.response?.body?.items?.item ?? [];
  const targetItems = items.filter((item) => item.fcstDate === targetDate);
  const temperatureItems = targetItems.filter((item) => item.category === "TMP");
  const lowTemp =
    findCategoryValue(targetItems, "TMN") ?? getMinTemperature(temperatureItems);
  const highTemp =
    findCategoryValue(targetItems, "TMX") ?? getMaxTemperature(temperatureItems);
  const weather = getWeatherLabel(targetItems);

  return NextResponse.json({
    location: "서울시",
    source: "KMA_VILAGE_FCST",
    baseDate: baseDateTime.baseDate,
    baseTime: baseDateTime.baseTime,
    forecastDate: targetDate,
    weather,
    lowTemp: lowTemp ?? "",
    highTemp: highTemp ?? ""
  });
}

function getKstParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );

  return {
    date: `${parts.year}${parts.month}${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  };
}

function getKstDate(date = new Date()) {
  return getKstParts(date).date;
}

function getLatestKmaBaseDateTime() {
  const now = new Date();
  const safeNow = new Date(now.getTime() - 45 * 60 * 1000);
  const kst = getKstParts(safeNow);
  const currentTime = kst.hour * 100 + kst.minute;
  const baseTime =
    [...forecastBaseTimes]
      .reverse()
      .find((time) => Number(time) <= currentTime) ?? "2300";

  if (baseTime === "2300" && currentTime < 200) {
    const previousDay = new Date(safeNow.getTime() - 24 * 60 * 60 * 1000);

    return {
      baseDate: getKstDate(previousDay),
      baseTime
    };
  }

  return {
    baseDate: kst.date,
    baseTime
  };
}

function findCategoryValue(items: KmaForecastItem[], category: string) {
  return items.find((item) => item.category === category)?.fcstValue;
}

function getMinTemperature(items: KmaForecastItem[]) {
  const values = items
    .map((item) => Number(item.fcstValue))
    .filter(Number.isFinite);

  return values.length > 0 ? String(Math.min(...values)) : null;
}

function getMaxTemperature(items: KmaForecastItem[]) {
  const values = items
    .map((item) => Number(item.fcstValue))
    .filter(Number.isFinite);

  return values.length > 0 ? String(Math.max(...values)) : null;
}

function getWeatherLabel(items: KmaForecastItem[]) {
  const precipitation = findCategoryValue(items, "PTY");

  switch (precipitation) {
    case "1":
      return "비";
    case "2":
      return "비/눈";
    case "3":
      return "눈";
    case "4":
      return "소나기";
    default:
      break;
  }

  const sky = findCategoryValue(items, "SKY");

  switch (sky) {
    case "1":
      return "맑음";
    case "3":
      return "구름많음";
    case "4":
      return "흐림";
    default:
      return "";
  }
}
