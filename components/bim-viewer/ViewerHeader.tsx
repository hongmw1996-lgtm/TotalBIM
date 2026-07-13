"use client";

import { useRouter } from "next/navigation";
import { Building2, Upload } from "lucide-react";
import { IfcUploadButton } from "@/components/bim-sidebar/IfcUploadButton";
import { useViewerStore } from "@/store/viewerStore";

export function ViewerHeader() {
  const router = useRouter();
  const activeModelName = useViewerStore((state) => state.activeModelName);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST"
    });

    router.push("/");
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 bg-white px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-[#203047] text-white">
          <Building2 size={19} aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-[#171a1f]">
            IFC BIM Viewer
          </h1>
          <p className="truncate text-xs text-[#647083]">
            선택 모델: {activeModelName ?? "없음"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md border border-[#d8dde6] px-4 text-sm font-medium text-[#203047] transition hover:bg-[#eef1f4]"
          onClick={() => router.push("/projects")}
        >
          프로젝트
        </button>
        <IfcUploadButton
          trigger={
            <span className="inline-flex items-center gap-2">
              <Upload size={16} aria-hidden />
              IFC 업로드
            </span>
          }
        />
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-md border border-[#d8dde6] px-4 text-sm font-medium text-[#203047] transition hover:bg-[#eef1f4]"
          onClick={() => void handleLogout()}
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
