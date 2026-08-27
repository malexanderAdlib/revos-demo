"use client";

import { useState } from "react";
import clsx from "clsx";
import { PartnerView } from "./PartnerView";
import { OpenPipelineView } from "./OpenPipeline";
import { CreatedView } from "./CreatedView";
import { IndustryView } from "./IndustryView";
import { SummaryView } from "./SummaryView";
import { ForecastView } from "./ForecastView";
import { NewLogoView } from "./NewLogoView";
import { WinRateView } from "./WinRateView";
import { ExclusionsView } from "./ExclusionsView";
import { WowView } from "./WowView";

// Cube — the pipeline dashboard, folded into RevOS as one tab. All ten views now
// read the same live pipeline API (demo fixtures on the preview). The standalone
// dashboard is retired once verified against live data.

type SubTab =
  | "summary" | "open" | "created" | "industry" | "winrate"
  | "newlogo" | "partner" | "wow" | "forecast" | "exclusions";

const SUBTABS: { id: SubTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "open", label: "Open Pipeline" },
  { id: "created", label: "Created" },
  { id: "industry", label: "Industry" },
  { id: "winrate", label: "Win Rate" },
  { id: "newlogo", label: "New Logo" },
  { id: "partner", label: "Partner Pipeline" },
  { id: "wow", label: "Week-over-Week" },
  { id: "forecast", label: "Forecast" },
  { id: "exclusions", label: "Exclusions" },
];

const VIEWS: Record<SubTab, React.ReactNode> = {
  summary: <SummaryView />,
  open: <OpenPipelineView />,
  created: <CreatedView />,
  industry: <IndustryView />,
  winrate: <WinRateView />,
  newlogo: <NewLogoView />,
  partner: <PartnerView />,
  wow: <WowView />,
  forecast: <ForecastView />,
  exclusions: <ExclusionsView />,
};

export function CubeArea() {
  const [tab, setTab] = useState<SubTab>("summary");

  return (
    <div>
      {/* Hero */}
      <div className="mx-auto max-w-[1280px] px-[22px] pb-1.5 pt-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-revos-brand">The pipeline cube</div>
        <h1 className="mb-2 mt-1.5 text-[22px] font-semibold tracking-tight text-revos-ink">Cube</h1>
      </div>

      {/* Sub-nav */}
      <div className="border-b border-revos-line bg-revos-panel">
        <div className="mx-auto flex max-w-[1280px] items-center gap-1 overflow-x-auto px-[18px]">
          {SUBTABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "whitespace-nowrap border-b-2 px-3 py-2.5 text-[12.5px] font-semibold transition-colors",
                tab === t.id
                  ? "border-revos-brand text-revos-brand"
                  : "border-transparent text-revos-ink2 hover:text-revos-brand",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-[22px] pt-6">{VIEWS[tab]}</div>
    </div>
  );
}
