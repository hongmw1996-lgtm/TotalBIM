export type ViewerLoadMode =
  | "metadata-only"
  | "preview"
  | "by-storey"
  | "by-category"
  | "full"
  | "original-ifc";

export const viewerLoadModes: Array<{
  mode: ViewerLoadMode;
  label: string;
  description: string;
}> = [
  {
    mode: "metadata-only",
    label: "메타데이터",
    description: "형상 없이 모델 정보와 파생 파일 상태만 확인합니다."
  },
  {
    mode: "preview",
    label: "미리보기",
    description: "가능하면 가장 가벼운 Fragments 파생 파일을 로드합니다."
  },
  {
    mode: "by-storey",
    label: "층별",
    description: "층 단위 파생 파일을 우선 사용하고, 없으면 전체 Fragments를 사용합니다."
  },
  {
    mode: "by-category",
    label: "카테고리",
    description: "카테고리 단위 파생 파일을 우선 사용하고, 없으면 전체 Fragments를 사용합니다."
  },
  {
    mode: "full",
    label: "전체",
    description: "전체 Fragments 형상을 로드합니다."
  },
  {
    mode: "original-ifc",
    label: "원본 IFC",
    description: "원본 IFC 직접 로딩 경로입니다. 대용량 보호를 위해 현재는 다운로드 확인만 제공합니다."
  }
];
