"use client";

import { useState } from "react";
import clsx from "clsx";
import { PerformanceArea } from "./PerformanceArea";
import { Card } from "./ui";

// Scorecard — the standalone scorecard app, folded into RevOS as one tab. The
// lightweight Performance summary is the landing; a sub-menu opens the deep tabs
// (Account 360, Deal Activity, Call Blitz, Meetings Booked). The old /scorecard
// app is retired once these are all ported.

type SubTab = "summary" | "account360" | "deal_activity" | "call_blitz" | "meetings";

const SUBTABS: { id: SubTab; label: string; blurb: string }[] = [
  { id: "summary", label: "Summary", blurb: "" },
  { id: "account360", label: "Account 360", blurb: "The full account picture — pipeline, health, contacts, and activity in one view, per account." },
  { id: "deal_activity", label: "Deal Activity", blurb: "Every touch on a deal — calls, emails, meetings, stage moves — on one timeline." },
  { id: "call_blitz", label: "Call Blitz", blurb: "Dials, connects, and conversations per rep per day, against the blitz target." },
  { id: "meetings", label: "Meetings Booked", blurb: "Meetings booked and held per rep, sourced from the calendar sync — not just the Regie dialer." },
];

export function ScorecardArea() {
  const [tab, setTab] = useState<SubTab>("summary");
  const active = SUBTABS.find((t) => t.id === tab)!;

  return (
    <div>
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

      {tab === "summary" ? (
        <PerformanceArea />
      ) : (
        <div className="mx-auto max-w-[1280px] px-[22px] pt-6">
          <Card className="border-revos-warn/40 bg-revos-warnwash p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-revos-warn">
              Migrating in from the scorecard app
            </div>
            <div className="mt-1.5 text-[15px] font-semibold text-revos-ink">{active.label}</div>
            <p className="mt-1.5 max-w-[640px] text-[13px] text-revos-ink2">{active.blurb}</p>
            <p className="mt-3 text-[12px] text-revos-ink3">
              This tab lives in the standalone scorecard app today. It&apos;s being folded into RevOS so everything
              is one place — same live data, no leaving the workspace. Next up in the consolidation.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
