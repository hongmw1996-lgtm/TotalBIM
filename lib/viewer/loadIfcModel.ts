import { ViewerLoadMode } from "@/lib/viewer/loadModes";
import type { IfcModelSummary } from "@/store/viewerStore";

export type IfcDerivativeSummary = {
  id: string;
  modelId: string;
  kind: string;
  format: string;
  lod?: string | null;
  storageProvider?: string;
  storageBucket?: string | null;
  storageKey?: string;
  fileName: string;
  fileSize: number;
  status: string;
  manifest?: unknown;
  fileUrl: string;
};

export type IfcModelDetailResponse = {
  model: IfcModelSummary;
  derivatives: IfcDerivativeSummary[];
  warning?: string;
};

export type LoadIfcModelInput = {
  modelId: string;
  loadMode: ViewerLoadMode;
  signal?: AbortSignal;
};

export type IfcLoadSource =
  | {
      kind: "fragments";
      model: IfcModelSummary;
      derivative: IfcDerivativeSummary;
      reason: string;
    }
  | {
      kind: "metadata";
      model: IfcModelSummary;
      derivative: IfcDerivativeSummary | null;
      reason: string;
    }
  | {
      kind: "aps";
      model: IfcModelSummary;
      derivative: IfcDerivativeSummary;
      urn: string;
      reason: string;
    }
  | {
      kind: "original-ifc";
      model: IfcModelSummary;
      fileUrl: string;
      reason: string;
    };

const lodPreference: Record<ViewerLoadMode, Array<string | null>> = {
  "metadata-only": [],
  preview: ["preview", "low", "full", null],
  "by-storey": ["storey", "by-storey", "full", null],
  "by-category": ["category", "by-category", "full", null],
  full: ["full", null],
  "original-ifc": []
};

function isReadyDerivative(derivative: IfcDerivativeSummary) {
  return derivative.status === "READY";
}

function pickFragmentsDerivative(
  derivatives: IfcDerivativeSummary[],
  loadMode: ViewerLoadMode
) {
  const candidates = derivatives.filter(
    (derivative) =>
      isReadyDerivative(derivative) &&
      derivative.kind === "GEOMETRY" &&
      derivative.format === "FRAG"
  );
  const preferredLods = lodPreference[loadMode];

  for (const preferredLod of preferredLods) {
    const match = candidates.find(
      (candidate) => (candidate.lod ?? null) === preferredLod
    );

    if (match) {
      return match;
    }
  }

  return candidates[0] ?? null;
}

function pickApsDerivative(derivatives: IfcDerivativeSummary[]) {
  return (
    derivatives.find(
      (derivative) =>
        isReadyDerivative(derivative) &&
        derivative.kind === "GEOMETRY" &&
        derivative.format === "SVF2" &&
        derivative.storageProvider === "APS" &&
        derivative.storageKey
    ) ?? null
  );
}

export async function loadIfcModel({
  modelId,
  loadMode,
  signal
}: LoadIfcModelInput): Promise<IfcLoadSource> {
  const response = await fetch(`/api/ifc/models/${modelId}`, {
    cache: "no-store",
    signal
  });
  const payload = (await response.json()) as Partial<IfcModelDetailResponse> & {
    error?: string;
  };

  if (!response.ok || !payload.model) {
    throw new Error(payload.error ?? "IFC 모델 상세 정보를 불러오지 못했습니다.");
  }

  const derivatives = payload.derivatives ?? [];

  if (payload.model.fileFormat && payload.model.fileFormat !== "IFC") {
    const derivative = pickApsDerivative(derivatives);

    if (derivative?.storageKey) {
      return {
        kind: "aps",
        model: payload.model,
        derivative,
        urn: derivative.storageKey,
        reason: `${payload.model.fileFormat} APS 변환 파일을 사용합니다.`
      };
    }

    return {
      kind: "metadata",
      model: payload.model,
      derivative: null,
      reason:
        payload.model.status === "PROCESSING"
          ? `${payload.model.fileFormat} 파일을 APS 뷰어 형식으로 변환하는 중입니다.`
          : `${payload.model.fileFormat} 파일은 업로드되었습니다. 변환을 실행하면 뷰어에 표시됩니다.`
    };
  }

  if (loadMode === "metadata-only") {
    const metadata = derivatives.find(
      (derivative) =>
        isReadyDerivative(derivative) &&
        derivative.kind === "METADATA" &&
        derivative.format === "JSON"
    );

    return {
      kind: "metadata",
      model: payload.model,
      derivative: metadata ?? null,
      reason: metadata
        ? "메타데이터 파생 파일을 확인했습니다."
        : "사용 가능한 메타데이터 파생 파일이 없습니다."
    };
  }

  if (loadMode === "original-ifc") {
    return {
      kind: "original-ifc",
      model: payload.model,
      fileUrl: payload.model.fileUrl,
      reason: "원본 IFC 직접 로딩은 대용량 보호를 위해 아직 비활성화되어 있습니다."
    };
  }

  const derivative = pickFragmentsDerivative(derivatives, loadMode);

  if (!derivative) {
    const metadata = derivatives.find(
      (candidate) =>
        isReadyDerivative(candidate) &&
        candidate.kind === "METADATA" &&
        candidate.format === "JSON"
    );

    return {
      kind: "metadata",
      model: payload.model,
      derivative: metadata ?? null,
      reason:
        payload.model.status === "PROCESSING"
          ? "경량 Fragments 파생 파일을 생성하는 중입니다."
          : "아직 로드 가능한 Fragments 파생 파일이 없습니다. 왼쪽 목록에서 경량화를 실행해 주세요."
    };
  }

  return {
    kind: "fragments",
    model: payload.model,
    derivative,
    reason:
      derivative.lod && derivative.lod !== loadMode
        ? `${loadMode} 전용 파생 파일이 없어 ${derivative.lod} Fragments를 사용합니다.`
        : "Fragments 파생 파일을 사용합니다."
  };
}

