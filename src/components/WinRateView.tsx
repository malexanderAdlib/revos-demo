"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { api, type WinRateByRevType, type WinRateWindow } from "@/lib/api";
import { Card, CardHead } from "./ui";

// Win Rate by Rev Type (Sharon 8/21) — ported from the pipeline dashboard into
// the Cube tab. won / (won + lost) by deal count, split Insurance / Life Sciences
// / Other, across Current FY / Trailing 12mo / Multi-year. One fetch; the window
// is a client-side toggle over the single payload. Charts are CSS bars.

type Loadable = { state: "loading" | "ready" | "error"; data: WinRateByRevType | null; error?: string };

const WINDOWS: { id: keyof WinRateByRevType["windows"]; label: string }[] = [
  { id: "current_fy", label: "Current FY" },
  { id: "ttm", label: "Trailing 12mo" },
  { id: "multi_year", label: "Multi-year" },
];

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

export function WinRateView() {
  const [ld, setLd] = useState<Loadable>({ state: "loading", data: null });
  const [win, setWin] = useState<keyof WinRateByRevType["windows"]>("current_fy");

  useEffect(() => {
    let alive = true;
    api.winRateByRevType()
      .then((d) => alive && setLd({ state: "ready", data: d }))
      .catch((e) => alive && setLd({ state: "error", data: null, error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  if (ld.state === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading win rate from Salesforce…</span></Card>;
  }
  if (ld.state === "error" || !ld.data) {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load win rate by rev type</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{ld.error}</div>
        <p className="mt-2 text-[11.5px] text-revos-ink3">This runs a live Salesforce aggregate over Closed Won/Lost opportunities.</p>
      </Card>
    );
  }

  const d = ld.data;
  const w: WinRateWindow = d.windows[win];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-revos-ink">Win Rate</h2>
        <p className="text-[12.5px] text-revos-ink3">won / (won + lost) by count · Insurance / Life Sciences / Other · as of {d.as_of}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-revos-ink3">Window</span>
        <div className="inline-flex overflow-hidden rounded-lg border border-revos-line">
          {WINDOWS.map((o) => (
            <button key={o.id} onClick={() => setWin(o.id)}
              className={clsx(
                "border-l border-revos-line px-3 py-1.5 text-[11.5px] font-medium transition-colors first:border-l-0",
                win === o.id ? "bg-revos-brand text-white" : "bg-revos-panel text-revos-ink2 hover:text-revos-brand")}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead kick="Cube" title={`Win rate — ${w.label}`} meta="won / (won + lost), by count" />
          <div className="flex flex-col gap-3 p-4 pt-3">
            {w.buckets.map((b) => (
              <div key={b.bucket}>
                <div className="mb-1 flex items-baseline justify-between text-[12px]">
                  <span className="font-medium text-revos-ink">{b.bucket}</span>
                  <span className="tabular-nums text-revos-ink2">{pct(b.win_rate_pct)} <span className="text-revos-ink3">· {b.won}/{b.n}</span></span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-revos-card">
                  <div className="h-full rounded-full bg-revos-brand" style={{ width: `${b.win_rate_pct ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead kick="Detail" title="Won / lost / N per bucket" meta={w.label} />
          <div className="overflow-x-auto p-4 pt-2">
            <table className="w-full text-[12px]">
              <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
                <tr><th className="pb-1.5 text-left">Bucket</th><th className="pb-1.5 text-right">Won</th><th className="pb-1.5 text-right">Lost</th><th className="pb-1.5 text-right">N</th><th className="pb-1.5 text-right">Win rate</th></tr>
              </thead>
              <tbody>
                {w.buckets.map((b) => (
                  <tr key={b.bucket} className="border-t border-revos-line">
                    <td className="py-1.5 text-revos-ink">{b.bucket}</td>
                    <td className="py-1.5 text-right tabular-nums text-revos-ink2">{b.won}</td>
                    <td className="py-1.5 text-right tabular-nums text-revos-ink2">{b.lost}</td>
                    <td className="py-1.5 text-right tabular-nums text-revos-ink2">{b.n}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums text-revos-ink">{pct(b.win_rate_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {win === "multi_year" && w.by_year && w.by_year.length > 0 && (
        <Card>
          <CardHead kick="Trend" title="Win rate by fiscal year" meta="overall + Insurance, last 10 FY" />
          <div className="overflow-x-auto p-4 pt-2">
            <table className="w-full text-[12px]">
              <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
                <tr><th className="pb-1.5 text-left">FY</th><th className="pb-1.5 text-right">Won</th><th className="pb-1.5 text-right">Lost</th><th className="pb-1.5 text-right">N</th><th className="pb-1.5 text-right">Win rate</th><th className="pb-1.5 text-right">Insurance WR</th></tr>
              </thead>
              <tbody>
                {w.by_year.map((r) => (
                  <tr key={r.fy} className="border-t border-revos-line">
                    <td className="py-1.5 text-revos-ink">{r.fy}</td>
                    <td className="py-1.5 text-right tabular-nums text-revos-ink2">{r.won}</td>
                    <td className="py-1.5 text-right tabular-nums text-revos-ink2">{r.lost}</td>
                    <td className="py-1.5 text-right tabular-nums text-revos-ink2">{r.n}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums text-revos-ink">{pct(r.win_rate_pct)}</td>
                    <td className="py-1.5 text-right tabular-nums text-revos-ink2">{pct(r.insurance_wr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="max-w-4xl text-[11px] text-revos-ink3">{d.note}</p>
      <p className="text-[10px] text-revos-ink3">{d.source}</p>
    </div>
  );
}
