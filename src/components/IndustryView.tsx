"use client";

import { useEffect, useState } from "react";
import { api, currencyFmt, type Industry } from "@/lib/api";
import { Card, CardHead } from "./ui";
import { Bars, Kpi } from "./charts";

// Industry (Cube) — open pipeline and closed-won FYTD by Adlib industry, on Net
// New ACV Yr1. Charts are CSS bars; RevOS stays recharts-free.

type Loadable = { state: "loading" | "ready" | "error"; data: Industry | null; error?: string };

export function IndustryView() {
  const [ld, setLd] = useState<Loadable>({ state: "loading", data: null });

  useEffect(() => {
    let alive = true;
    api.industry()
      .then((d) => alive && setLd({ state: "ready", data: d }))
      .catch((e) => alive && setLd({ state: "error", data: null, error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  if (ld.state === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading industry pipeline…</span></Card>;
  }
  if (ld.state === "error" || !ld.data) {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load industry pipeline</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{ld.error}</div>
      </Card>
    );
  }

  const d = ld.data;
  const t = d.totals;
  const openBars = [...d.rows].sort((a, b) => b.open_nnacv - a.open_nnacv).map((r) => ({ key: r.industry, value: r.open_nnacv })).slice(0, 12);
  const cwBars = [...d.rows].sort((a, b) => b.cw_nnacv - a.cw_nnacv).map((r) => ({ key: r.industry, value: r.cw_nnacv })).slice(0, 12);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-revos-ink">Industry</h2>
        <p className="text-[12.5px] text-revos-ink3">Open pipeline and closed-won FYTD by industry · Net New ACV Yr1 · as of {d.as_of}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="Open pipeline" value={currencyFmt(t.open_nnacv)} sub={`${t.open_opps} open opps · NN ACV Yr1`} />
        <Kpi label="Closed-won FYTD" value={currencyFmt(t.cw_nnacv)} sub={`${t.cw_opps} wins · NN ACV Yr1`} />
        <Kpi label="Industries" value={String(d.rows.length)} sub="verticals with pipeline or wins" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardHead kick="Cube" title="Open pipeline by industry" meta="NN ACV Yr1" /><Bars data={openBars} /></Card>
        <Card><CardHead kick="Cube" title="Closed-won FYTD by industry" meta="NN ACV Yr1" /><Bars data={cwBars} /></Card>
      </div>

      <Card>
        <CardHead kick="Cube" title="Industry summary" meta="open + closed-won FYTD · NN ACV Yr1" />
        <div className="overflow-x-auto p-4 pt-2">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
              <tr>
                <th className="pb-1.5 pr-3 text-left">Industry</th>
                <th className="pb-1.5 pr-3 text-right">Open opps</th>
                <th className="pb-1.5 pr-3 text-right">Open value</th>
                <th className="pb-1.5 pr-3 text-right">CW opps FYTD</th>
                <th className="pb-1.5 text-right">CW value FYTD</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.industry} className="border-t border-revos-line">
                  <td className="py-1.5 pr-3 font-medium text-revos-ink">{r.industry}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{r.open_opps}</td>
                  <td className="py-1.5 pr-3 text-right font-medium tabular-nums text-revos-ink">{currencyFmt(r.open_nnacv)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{r.cw_opps}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums text-revos-ink">{currencyFmt(r.cw_nnacv)}</td>
                </tr>
              ))}
              <tr className="border-t border-revos-line2 font-semibold">
                <td className="py-1.5 pr-3 text-revos-ink">Total</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink">{t.open_opps}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink">{currencyFmt(t.open_nnacv)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink">{t.cw_opps}</td>
                <td className="py-1.5 text-right tabular-nums text-revos-ink">{currencyFmt(t.cw_nnacv)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {d.note && <p className="max-w-4xl text-[11px] text-revos-ink3">{d.note}</p>}
    </div>
  );
}
