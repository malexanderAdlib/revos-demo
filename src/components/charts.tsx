"use client";

import clsx from "clsx";
import { currencyFmt, type Bucket, type Opp } from "@/lib/api";

// Shared no-recharts chart primitives for the Cube tab. Every bar chart consumes
// the same Bucket ({key,value}[]) shape with a unit formatter, so the views stay
// consistent and RevOS never pulls in a charting library.

export type Unit = "usd" | "count" | "percent";

export const fmtUnit = (u: Unit) => (v: number): string =>
  u === "usd" ? currencyFmt(v) : u === "percent" ? `${v.toFixed(1)}%` : String(Math.round(v));

// Horizontal bars — label · track · fill · value. The default for category
// breakdowns (motion, channel, industry, source…).
export function Bars({
  data, unit = "usd", labelWidth = 116, valueWidth = 64, max,
}: {
  data: Bucket[]; unit?: Unit; labelWidth?: number; valueWidth?: number; max?: number;
}) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  const f = fmtUnit(unit);
  if (data.length === 0) return <div className="p-4 pt-3 text-[12px] text-revos-ink3">No data.</div>;
  return (
    <div className="flex flex-col gap-2 p-4 pt-3">
      {data.map((d) => (
        <div key={d.key} className="flex items-center gap-2.5">
          <div className="shrink-0 truncate text-[11px] text-revos-ink2" style={{ width: labelWidth }} title={d.key}>{d.key}</div>
          <div className="relative h-4 flex-1 rounded bg-revos-card">
            <div className="absolute inset-y-0 left-0 rounded bg-revos-brand"
              style={{ width: `${Math.max(1, (d.value / m) * 100)}%` }} />
          </div>
          <div className="shrink-0 text-right text-[11px] font-medium tabular-nums text-revos-ink" style={{ width: valueWidth }}>{f(d.value)}</div>
        </div>
      ))}
    </div>
  );
}

// Vertical bars — for a chronological series (by period / by quarter). The first
// bar is emphasized (brand) vs the rest (brand2), matching the dashboard.
export function VBars({ data, unit = "usd", height = 120 }: { data: Bucket[]; unit?: Unit; height?: number }) {
  const m = Math.max(1, ...data.map((d) => d.value));
  const f = fmtUnit(unit);
  if (data.length === 0) return <div className="p-4 pt-3 text-[12px] text-revos-ink3">No data.</div>;
  return (
    <div className="flex items-end gap-3 overflow-x-auto p-4 pt-3">
      {data.map((d, i) => (
        <div key={d.key} className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
          <div className="text-[10px] tabular-nums text-revos-ink2">{f(d.value)}</div>
          <div className={clsx("w-full max-w-[52px] rounded-t", i === 0 ? "bg-revos-brand" : "bg-revos-brand2")}
            style={{ height: Math.max(2, (d.value / m) * height) }} />
          <div className="w-full truncate text-center text-[10px] text-revos-ink3" title={d.key}>{d.key}</div>
        </div>
      ))}
    </div>
  );
}

// The shared opportunity table used by Open / Created / New Logo / Summary.
// Money is net_new_acv_y1 (NN ACV Yr1) — never amount.
export function OppTable({ opps, limit = 200 }: { opps: Opp[]; limit?: number }) {
  const rows = opps.slice(0, limit);
  return (
    <div className="overflow-x-auto p-4 pt-2">
      <table className="w-full text-[12px]">
        <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
          <tr>
            <th className="pb-1.5 pr-3 text-left">Account</th>
            <th className="pb-1.5 pr-3 text-left">Opportunity</th>
            <th className="pb-1.5 pr-3 text-left">Type</th>
            <th className="pb-1.5 pr-3 text-left">Stage</th>
            <th className="pb-1.5 pr-3 text-left">Owner</th>
            <th className="pb-1.5 pr-3 text-left">Period</th>
            <th className="pb-1.5 text-right">NN ACV Y1</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.sfdc_opportunity_id} className="border-t border-revos-line hover:bg-revos-card">
              <td className="max-w-[12rem] truncate py-1.5 pr-3 text-revos-ink">{o.account_name || "—"}</td>
              <td className="max-w-[16rem] truncate py-1.5 pr-3 text-revos-ink2">{o.opportunity_name || "—"}</td>
              <td className="py-1.5 pr-3 text-revos-ink3">{o.opportunity_record_type || "—"}</td>
              <td className="py-1.5 pr-3 text-revos-ink2">{o.stage || "—"}</td>
              <td className="py-1.5 pr-3 text-revos-ink3">{o.opportunity_owner || "—"}</td>
              <td className="py-1.5 pr-3 tabular-nums text-revos-ink3">{o.fiscal_period || "—"}</td>
              <td className="py-1.5 text-right font-medium tabular-nums text-revos-ink">{currencyFmt(o.net_new_acv_y1 || 0)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="py-6 text-center text-[12.5px] text-revos-ink3">No opportunities.</td></tr>
          )}
        </tbody>
      </table>
      {opps.length > limit && (
        <div className="px-1 pt-2 text-[11px] text-revos-ink3">Showing first {limit} of {opps.length}.</div>
      )}
    </div>
  );
}

// The KPI tile used across the Cube views (lifted from the PartnerView pattern).
export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "crit" }) {
  return (
    <div className="rounded-xl border border-revos-line bg-revos-panel p-4 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-revos-ink3">{label}</div>
      <div className="mt-1 text-[22px] font-bold leading-none tabular-nums text-revos-ink">{value}</div>
      {sub && (
        <div className={clsx("mt-1.5 text-[11px]", tone === "good" ? "text-revos-good" : tone === "crit" ? "text-revos-crit" : "text-revos-ink3")}>{sub}</div>
      )}
    </div>
  );
}
