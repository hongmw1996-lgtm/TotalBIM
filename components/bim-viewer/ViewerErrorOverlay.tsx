"use client";

import { AlertTriangle } from "lucide-react";

type ViewerErrorOverlayProps = {
  message: string;
};

export function ViewerErrorOverlay({ message }: ViewerErrorOverlayProps) {
  return (
    <div className="absolute bottom-4 left-4 right-4 flex justify-center">
      <div className="flex max-w-[720px] items-start gap-3 rounded-md border border-[#e0b4ad] bg-[#fff5f3] px-4 py-3 text-sm text-[#91342b] shadow-sm">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
        <p>{message}</p>
      </div>
    </div>
  );
}
