"use client";

export function ViewerLoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
      <div className="rounded-md border border-[#cfd6e1] bg-white px-4 py-3 text-sm font-medium text-[#203047] shadow-sm">
        모델 로딩 중
      </div>
    </div>
  );
}
