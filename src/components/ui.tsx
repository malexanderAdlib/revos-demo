"use client";

import clsx from "clsx";
import type { RiskTier } from "@/lib/api";

// Shared light-only primitives for the Accounts workspace — pill, signal dot,
// and the card shell — so every panel in the deep-dive reads as one system.

export function Pill({ tier, children }: { tier: RiskTier; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "rounded-[20px] px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.03em]",
        tier === "hi" && "bg-revos-critwash text-revos-crit",
        tier === "md" && "bg-revos-warnwash text-revos-warn",
        tier === "lo" && "bg-revos-goodwash text-revos-good",
        tier === "na" && "bg-revos-card text-revos-ink3",
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tier, className }: { tier: RiskTier; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-block rounded-full",
        tier === "hi" && "bg-revos-crit",
        tier === "md" && "bg-revos-warn",
        tier === "lo" && "bg-revos-good",
        tier === "na" && "bg-revos-ink3",
        className,
      )}
    />
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-xl border border-revos-line bg-revos-panel shadow-card", className)}>
      {children}
    </div>
  );
}

export function CardHead({
  kick,
  title,
  meta,
}: {
  kick: string;
  title?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-b border-revos-line px-4 py-[13px]">
      <div className="flex items-center gap-[9px]">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-revos-brand">{kick}</span>
        {title && <span className="text-[13px] font-semibold text-revos-ink">{title}</span>}
      </div>
      {meta && <span className="text-[11.5px] text-revos-ink3">{meta}</span>}
    </div>
  );
}
