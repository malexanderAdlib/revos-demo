"use client";

import { useState } from "react";
import clsx from "clsx";
import { Card } from "./ui";

// Cube — the pipeline dashboard, folded into RevOS as one tab. Its views migrate
// in as sub-tabs; the standalone dashboard is retired once they're all ported.
// Partner Pipeline just shipped on the dashboard, so it's flagged as ready.

type SubTab =
  | "summary" | "open" | "created" | "industry" | "winrate"
  | "newlogo" | "partner" | "wow" | "forecast" | "exclusions";

const SUBTABS: { id: SubTab; label: string; blurb: string; ready?: boolean }[] = [
  { id: "summary", label: "Summary", blurb: "The headline pipeline KPIs — open NN ACV, coverage vs plan, closed-won FYTD, week-over-week movement." },
  { id: "open", label: "Open Pipeline", blurb: "Open pipeline by stage and close quarter — where the deals actually are." },
  { id: "created", label: "Created", blurb: "New pipeline created FYTD, by lead source." },
  { id: "industry", label: "Industry", blurb: "Open pipeline and win rate by industry — Life Sciences, Insurance, Manufacturing, and the rest." },
  { id: "winrate", label: "Win Rate", blurb: "Win rate by revenue type across current FY, trailing 12 months, and multi-year." },
  { id: "newlogo", label: "New Logo", blurb: "New-logo pipeline and closed-won — the acquisition motion on its own." },
  { id: "partner", label: "Partner Pipeline", blurb: "Sourced vs contracting partner views, keyed on the partner name (not the distrusted channel field).", ready: true },
  { id: "wow", label: "Week-over-Week", blurb: "Deal-level movers — what gained, slipped, or left the pipeline since last snapshot." },
  { id: "forecast", label: "Forecast", blurb: "The forecast call and the build-to-plan waterfall — New Logo → Cross-sell → Migrations → Capacity → Renewal Uplift → Churn." },
  { id: "exclusions", label: "Exclusions", blurb: "Accounts and opportunities held out of the pipeline rollups, and why." },
];

export function CubeArea() {
  const [tab, setTab] = useState<SubTab>("summary");
  const active = SUBTABS.find((t) => t.id === tab)!;

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

      <div className="mx-auto max-w-[1280px] px-[22px] pt-6">
        <Card
          className={clsx(
            "p-5",
            active.ready ? "border-revos-good/40 bg-revos-goodwash" : "border-revos-warn/40 bg-revos-warnwash",
          )}
        >
          <div
            className={clsx(
              "text-[11px] font-bold uppercase tracking-[0.1em]",
              active.ready ? "text-revos-good" : "text-revos-warn",
            )}
          >
            {active.ready ? "Built — porting the view into RevOS" : "Migrating in from the pipeline dashboard"}
          </div>
          <div className="mt-1.5 text-[15px] font-semibold text-revos-ink">{active.label}</div>
          <p className="mt-1.5 max-w-[660px] text-[13px] text-revos-ink2">{active.blurb}</p>
          <p className="mt-3 text-[12px] text-revos-ink3">
            The pipeline dashboard is being migrated into RevOS so the whole cube lives here — same snapshots, same
            live Salesforce, one workspace. The standalone dashboard is retired once every view lands.
          </p>
        </Card>
      </div>
    </div>
  );
}
