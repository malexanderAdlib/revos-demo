"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { api, currencyFmt, type Forecast, type ForecastStep } from "@/lib/api";
import { Card, CardHead } from "./ui";

// Forecast (Cube) — build-to-plan for the quarter, from the Manager Forecast
// field (no weekly upload — Sharon 8/6). Inside/Outside-the-Call + Manager-
// Forecast rollup KPIs, then the New Logo → Cross-sell → Migrations → Capacity →
// Renewal Uplift → Churn → Gap → Plan waterfall as CSS floating bars. Recharts-free.

type Loadable = { state: "loading" | "ready" | "error"; data: Forecast | null; error?: string };

// currencyFmt(-x) prints an ugly "$-x"; format magnitude + a real minus sign.
const signedMoney = (n: number) => (n < 0 ? `−${currencyFmt(-n)}` : currencyFmt(n));

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "crit" }) {
  return (
    <div className="rounded-xl border border-revos-line bg-revos-panel p-4 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-revos-ink3">{label}</div>
      <div className={clsx("mt-1 text-[22px] font-bold leading-none tabular-nums", tone === "good" ? "text-revos-good" : tone === "crit" ? "text-revos-crit" : "text-revos-ink")}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-revos-ink3">{sub}</div>}
    </div>
  );
}

// Floating-bar geometry for one waterfall step, as left/width percentages of max.
function barFor(step: ForecastStep, max: number) {
  const delta = Number(step.delta);
  const running = Number(step.running);
  const pct = (v: number) => (v / max) * 100;
  switch (step.kind) {
    case "build":    return { left: pct(running - delta), width: pct(delta), cls: "bg-revos-brand" };
    case "risk":     return { left: pct(running), width: pct(-delta), cls: "bg-revos-crit" };
    case "gap":      return { left: pct(running - delta), width: pct(delta), cls: "border border-dashed border-revos-warn bg-revos-warnwash" };
    case "subtotal": return { left: 0, width: pct(running), cls: "bg-revos-brand2" };
    case "total":    return { left: 0, width: pct(running), cls: "border-2 border-revos-brand bg-transparent" };
  }
}

export function ForecastView() {
  const [ld, setLd] = useState<Loadable>({ state: "loading", data: null });

  useEffect(() => {
    let alive = true;
    api.forecast()
      .then((d) => alive && setLd({ state: "ready", data: d }))
      .catch((e) => alive && setLd({ state: "error", data: null, error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  if (ld.state === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading the forecast call…</span></Card>;
  }
  if (ld.state === "error" || !ld.data) {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load the forecast</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{ld.error}</div>
      </Card>
    );
  }

  const d = ld.data;
  const max = Math.max(d.plan, ...d.waterfall.map((s) => Number(s.running)));
  const planLeft = (d.plan / max) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-revos-ink">Forecast</h2>
        <p className="text-[12.5px] text-revos-ink3">Build to plan · {d.period} · as of {d.as_of}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Inside the call" value={currencyFmt(d.inside_call)} sub={`${d.opps_in_call} of ${d.opps_total} opps`} />
        <Tile label="Outside the call" value={currencyFmt(d.outside_call)} />
        <Tile label="Inside + won" value={currencyFmt(d.inside_plus_won)} sub={`incl. ${currencyFmt(d.won_to_date)} won`} />
        <Tile label="Gap to plan" value={signedMoney(d.gap)} sub={`plan ${currencyFmt(d.plan)}`} tone={d.gap >= 0 ? "good" : "crit"} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Commit" value={currencyFmt(d.commit)} sub={`${d.commit_opps} in-call opps`} tone="good" />
        <Tile label="Upside" value={currencyFmt(d.upside)} sub={`${d.upside_opps} out-of-call opps`} />
        <Tile label="Churn" value={signedMoney(-d.churn)} sub="open renewal risk" tone="crit" />
        <Tile label="Down-sell" value={signedMoney(-d.downsell)} sub="in-quarter" tone="crit" />
      </div>
      {d.uncategorized > 0 && (
        <p className="text-[11px] text-revos-ink3">
          + {currencyFmt(d.uncategorized)} in-quarter open pipeline has no Manager Forecast category set.
        </p>
      )}

      <Card>
        <CardHead kick="Build to plan" title="How the quarter gets to plan" meta="current forecast → plan · NN ACV Yr1" />
        <div className="relative flex flex-col gap-2 p-4 pt-3">
          {d.waterfall.map((s) => {
            const b = barFor(s, max);
            const isMarker = s.kind === "subtotal" || s.kind === "total";
            return (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-[12px] font-medium text-revos-ink">{s.label}</div>
                <div className="relative h-6 flex-1">
                  <div className={clsx("absolute h-6 rounded", b.cls)} style={{ left: `${b.left}%`, width: `${Math.max(1.5, b.width)}%` }} />
                </div>
                <div className={clsx("w-32 shrink-0 text-right text-[12px] tabular-nums", isMarker ? "font-semibold text-revos-ink" : s.kind === "risk" ? "text-revos-crit" : "text-revos-ink2")}>
                  {isMarker ? currencyFmt(Number(s.running)) : signedMoney(Number(s.delta))}
                </div>
              </div>
            );
          })}
          {/* Plan reference line across the track column */}
          <div className="pointer-events-none absolute bottom-4 top-3" style={{ left: `calc(7rem + 0.75rem + (100% - 7rem - 0.75rem - 8rem - 0.75rem) * ${planLeft / 100})` }}>
            <div className="h-full border-l border-dashed border-revos-ink3" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-revos-line px-4 py-2.5 text-[11px] text-revos-ink3">
          <Legend cls="bg-revos-brand" label="Build" />
          <Legend cls="bg-revos-crit" label="Churn / down-sell" />
          <Legend cls="border border-dashed border-revos-warn bg-revos-warnwash" label="Gap" />
          <Legend cls="bg-revos-brand2" label="Current forecast" />
          <Legend cls="border-2 border-revos-brand bg-transparent" label="Plan" />
        </div>
      </Card>

      <Card>
        <CardHead kick="Detail" title="Waterfall steps" />
        <div className="overflow-x-auto p-4 pt-2">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
              <tr>
                <th className="pb-1.5 pr-3 text-left">Step</th>
                <th className="pb-1.5 pr-3 text-right">Movement</th>
                <th className="pb-1.5 text-right">Running</th>
              </tr>
            </thead>
            <tbody>
              {d.waterfall.map((s) => (
                <tr key={s.label} className={clsx("border-t", s.kind === "total" ? "border-revos-line2 font-semibold" : "border-revos-line")}>
                  <td className="py-1.5 pr-3 text-revos-ink">{s.label}</td>
                  <td className={clsx("py-1.5 pr-3 text-right tabular-nums", s.kind === "risk" ? "text-revos-crit" : "text-revos-ink2")}>
                    {Number(s.delta) === 0 ? "—" : signedMoney(Number(s.delta))}
                  </td>
                  <td className="py-1.5 text-right font-medium tabular-nums text-revos-ink">{currencyFmt(Number(s.running))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {d.note && <p className="max-w-4xl text-[11px] text-revos-ink3">{d.note}</p>}
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={clsx("inline-block h-2.5 w-3 rounded-sm", cls)} />
      {label}
    </span>
  );
}
