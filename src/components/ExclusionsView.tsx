"use client";

import { useEffect, useMemo, useState } from "react";
import { api, dateShort, type Exclusion } from "@/lib/api";
import { Card, CardHead } from "./ui";
import { Bars, Kpi } from "./charts";

// Exclusions (Cube) — accounts deliberately held out of the pipeline rollups and
// why. Read-only; opportunity-level exclusions still filter the cube server-side
// but aren't surfaced here (Sharon 8/6). Bars are counts; RevOS stays recharts-free.

type Loadable = { state: "loading" | "ready" | "error"; data: Exclusion[] | null; error?: string };

export function ExclusionsView() {
  const [ld, setLd] = useState<Loadable>({ state: "loading", data: null });

  useEffect(() => {
    let alive = true;
    api.accountExclusions()
      .then((d) => alive && setLd({ state: "ready", data: d }))
      .catch((e) => alive && setLd({ state: "error", data: null, error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  const rows = ld.data ?? [];
  const byReason = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.reason, (m.get(r.reason) || 0) + 1);
    return Array.from(m.entries()).map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
  }, [rows]);

  if (ld.state === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading exclusions…</span></Card>;
  }
  if (ld.state === "error" || !ld.data) {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load exclusions</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{ld.error}</div>
      </Card>
    );
  }

  const mostCommon = byReason[0]?.key ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-revos-ink">Exclusions</h2>
        <p className="text-[12.5px] text-revos-ink3">Accounts held out of the pipeline cube and why · read-only · {rows.length} accounts</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="Excluded accounts" value={String(rows.length)} sub="held out of the cube" />
        <Kpi label="Distinct reasons" value={String(byReason.length)} />
        <Kpi label="Most common" value={mostCommon} />
      </div>

      <Card>
        <CardHead kick="Cube" title="Why they're excluded" meta="by reason · account count" />
        <Bars data={byReason} unit="count" labelWidth={160} valueWidth={40} />
      </Card>

      <Card>
        <CardHead kick="Cube" title="Account exclusions" meta={`read-only · ${rows.length} accounts`} />
        <div className="max-h-[560px] overflow-auto p-4 pt-2">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
              <tr>
                <th className="pb-1.5 pr-3 text-left">Account</th>
                <th className="pb-1.5 pr-3 text-left">Reason</th>
                <th className="pb-1.5 pr-3 text-left">Detail</th>
                <th className="pb-1.5 text-left">Added</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={a.sfdc_account_id ?? a.account_name ?? i} className="border-t border-revos-line hover:bg-revos-card">
                  <td className="py-1.5 pr-3 font-medium text-revos-ink">{a.account_name || "—"}</td>
                  <td className="py-1.5 pr-3">
                    <span className="inline-block rounded bg-revos-wash px-1.5 py-0.5 text-[10px] text-revos-brand">{a.reason}</span>
                  </td>
                  <td className="max-w-[24rem] py-1.5 pr-3 text-revos-ink3">{a.reason_detail || "—"}</td>
                  <td className="whitespace-nowrap py-1.5 tabular-nums text-revos-ink3">{a.added_by} · {dateShort(a.added_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-[12.5px] text-revos-ink3">No accounts are excluded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="max-w-4xl text-[11px] text-revos-ink3">
        Excluded accounts are legitimately outside the commercial motion — royalty / OEM revenue, Dassault / RMS resale,
        or a dormant book. Opportunity-level exclusions still filter the cube server-side but aren&apos;t listed here.
      </p>
    </div>
  );
}
