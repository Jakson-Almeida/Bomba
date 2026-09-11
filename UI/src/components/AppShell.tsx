import type { ReactNode } from "react";
import { BrandFooter } from "./BrandFooter";
import { StatusStrip } from "./StatusStrip";

export function AppShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="brand-accent h-[3px] w-full shrink-0" />
      <div
        className={`mx-auto flex w-full flex-1 flex-col ${
          wide ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        <StatusStrip />
        {children}
        <BrandFooter />
      </div>
    </div>
  );
}
