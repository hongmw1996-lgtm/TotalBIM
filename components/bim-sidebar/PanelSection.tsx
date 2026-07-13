import { ReactNode } from "react";

type PanelSectionProps = {
  title: string;
  children: ReactNode;
};

export function PanelSection({ title, children }: PanelSectionProps) {
  return (
    <section className="rounded-md border border-[#d8dde6] bg-white">
      <div className="border-b border-[#d8dde6] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#263142]">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
