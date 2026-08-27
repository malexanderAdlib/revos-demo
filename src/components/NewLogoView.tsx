"use client";

import { useEffect, useState } from "react";
import { api, currencyFmt, type NewLogo } from "@/lib/api";
import { Card, CardHead } from "./ui";
import { VBars, Kpi } from "./charts";

// New Logo (Cube) — new-logo pipeline vs cross-sell/renewal by period, new-logo
// closed-won FYTD, and the win-rate trend. Money = Net New ACV Yr1. Charts are
// CSS bars; RevOS stays recharts-free.

type Loadable = { state: "loading" | "ready" | "error"; data: NewLogo | null; error?: string };

export function NewLogoView() {
  const [ld, setLd] = useState<Loadable>({ state: "loading", data: null });

  useEffect(() => {
    let alive = true;
    api.newLogo()
      .then((d) => alive && setLd({ state: "ready", data: d }))
      .catch((e) => alive && setLd({ state: "error", data: null, error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  if (ld.state === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading new-logo pipeline…</span></Card>;
  }
  if (ld.state === "error" || !ld.data) {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load new-logo pipeline</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{ld.error}</div>
      </Card>
    );
  }

  const d = ld.data;
  const t = d.totals;
  const openByPeriod = d.by_period.map((p) => ({ key: p.period, value: p.new_logo_nnacv })).filter((b) => b.value > 0);
  const cwByPeriod = d.cw_by_period.map((c) => ({ key: c.period, value: c.nnacv }));
  const winRate = d.win_rate_by_period.map((w) => ({ key: w.period, value: w.win_rate_pct ?? 0 }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-revos-ink">New Logo</h2>
        <p className="text-[12.5px] text-revos-ink3">New-logo pipeline vs cross-sell/renewal · Net New ACV Yr1 · as of {d.as_of}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Open new-logo pipeline" value={currencyFmt(t.open_new_logo_nnacv)} sub={`${t.open_new_logo_count} opps · NN ACV Yr1`} />
        <Kpi label="Open cross-sell + renewal" value={currencyFmt(t.open_cross_sell_nnacv)} sub={`${t.open_cross_sell_count} opps`} />
        <Kpi label="New-logo CW FYTD" value={currencyFmt(t.new_logo_cw_nnacv)} sub={`${t.new_logo_cw_wins} wins`} tone="good" />
        <Kpi label="Cross-sell CW FYTD" value={currencyFmt(t.cross_sell_cw_nnacv)} sub={`${t.cross_sell_cw_wins} wins`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead kick="Mix" title="New Logo vs Cross-Sell" meta="open by period · NN ACV Yr1" />
          <div className="overflow-x-auto p-4 pt-2">
            <table className="w-full text-[12px]">
              <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
                <tr>
                  <th className="pb-1.5 pr-3 text-left">Period</th>
                  <th className="pb-1.5 pr-3 text-right">New Logo</th>
                  <th className="pb-1.5 pr-3 text-right">Cross-Sell</th>
                  <th className="pb-1.5 text-right">% new logo</th>
                </tr>
              </thead>
              <tbody>
                {d.by_period.map((r) => {
                  const tot = r.new_logo_nnacv + r.cross_sell_nnacv;
                  return (
                    <tr key={r.period} className="border-t border-revos-line">
                      <td className="py-1.5 pr-3 font-medium text-revos-ink">{r.period}</td>
                      <td className="py-1.5 pr-3 text-right font-medium tabular-nums text-revos-ink">{currencyFmt(r.new_logo_nnacv)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{currencyFmt(r.cross_sell_nnacv)}</td>
                      <td className="py-1.5 text-right tabular-nums text-revos-ink2">{tot ? `${Math.round((r.new_logo_nnacv / tot) * 100)}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card><CardHead kick="Trend" title="New-logo win rate" meta="won / (won + lost)" /><VBars data={winRate} unit="percent" /></Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardHead kick="Pipeline" title="Open new-logo by period" /><VBars data={openByPeriod} unit="usd" /></Card>
        <Card><CardHead kick="Closed-won" title="New-logo CW by period" /><VBars data={cwByPeriod} unit="usd" /></Card>
      </div>

      <Card>
        <CardHead kick="Detail" title="New-logo open detail" meta={`${d.open_detail.length} opps`} />
        <div className="overflow-x-auto p-4 pt-2">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
              <tr>
                <th className="pb-1.5 pr-3 text-left">Account</th>
                <th className="pb-1.5 pr-3 text-left">Opportunity</th>
                <th className="pb-1.5 pr-3 text-left">Stage</th>
                <th className="pb-1.5 pr-3 text-left">Owner</th>
                <th className="pb-1.5 pr-3 text-left">Industry</th>
                <th className="pb-1.5 pr-3 text-left">Period</th>
                <th className="pb-1.5 text-right">NN ACV Y1</th>
              </tr>
            </thead>
            <tbody>
              {d.open_detail.map((o) => (
                <tr key={o.id} className="border-t border-revos-line hover:bg-revos-card">
                  <td className="py-1.5 pr-3 font-medium text-revos-ink">{o.account || "—"}</td>
                  <td className="max-w-[16rem] truncate py-1.5 pr-3 text-revos-ink2">{o.name || "—"}</td>
                  <td className="py-1.5 pr-3 text-revos-ink2">{o.stage || "—"}</td>
                  <td className="py-1.5 pr-3 text-revos-ink3">{o.owner || "—"}</td>
                  <td className="py-1.5 pr-3 text-revos-ink3">{o.industry || "—"}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-revos-ink3">{o.fiscal_period || "—"}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums text-revos-ink">{currencyFmt(o.net_new_acv_y1)}</td>
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
