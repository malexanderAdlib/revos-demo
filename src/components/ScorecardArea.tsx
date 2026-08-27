"use client";

import { useState } from "react";
import clsx from "clsx";
import { PerformanceArea } from "./PerformanceArea";
import { Account360View } from "./Account360";
import { DealActivityView } from "./DealActivity";
import { CallBlitzView } from "./CallBlitz";
import { MeetingsBookedView } from "./MeetingsBooked";

// Scorecard — the standalone scorecard app, folded into RevOS as one tab. The
// lightweight Performance summary is the landing; a sub-menu opens the deep tabs
// (Account 360, Deal Activity, Call Blitz, Meetings Booked), each reading the
// same live pipeline API. The old /scorecard app is retired once verified.

type SubTab = "summary" | "account360" | "deal_activity" | "call_blitz" | "meetings";

const SUBTABS: { id: SubTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "account360", label: "Account 360" },
  { id: "deal_activity", label: "Deal Activity" },
  { id: "call_blitz", label: "Call Blitz" },
  { id: "meetings", label: "Meetings Booked" },
];

// Everything but Summary sits in the same centered content shell.
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1280px] px-[22px] pt-6">{children}</div>;
}

export function ScorecardArea() {
  const [tab, setTab] = useState<SubTab>("summary");

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

      {tab === "summary" && <PerformanceArea />}
      {tab === "account360" && <Shell><Account360View /></Shell>}
      {tab === "deal_activity" && <Shell><DealActivityView /></Shell>}
      {tab === "call_blitz" && <Shell><CallBlitzView /></Shell>}
      {tab === "meetings" && <Shell><MeetingsBookedView /></Shell>}
    </div>
  );
}
