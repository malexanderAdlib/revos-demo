"use client";

import { useEffect, useMemo, useState } from "react";
import { api, currencyFmt, sumBy, sortByPeriod, type Opp } from "@/lib/api";
import { Card, CardHead } from "./ui";
import { Bars, VBars, Kpi, OppTable } from "./charts";

// Created (Cube) — new pipeline created FYTD, rolled up client-side from the raw
// /opps?snapshot_type=created snapshot. Money = Net New ACV Yr1 throughout
// (the tab's headline uses NNACV, not TCV). Charts are CSS bars; no recharts.

type State = { status: "loading" | "ready" | "error"; opps: Opp[]; error?: string };

const isClosed = (s: string | null) => s === "Closed Won" || s === "Closed Lost";
const sumN = (a: Opp[]) => a.reduce((s, o) => s + (o.net_new_acv_y1 || 0), 0);

export function CreatedView() {
  const [st, setSt] = useState<State>({ status: "loading", opps: [] });

  useEffect(() => {
    let alive = true;
    api.opps({ snapshot_type: "created", limit: 1000 })
      .then((opps) => alive && setSt({ status: "ready", opps }))
      .catch((e) => alive && setSt({ status: "error", opps: [], error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  const agg = useMemo(() => {
    const opps = st.opps;
    const won = opps.filter((o) => o.stage === "Closed Won");
    const lost = opps.filter((o) => o.stage === "Closed Lost");
    const open = opps.filter((o) => !isClosed(o.stage));
    return {
      opps, won, lost, open,
      total: sumN(opps),
      byQuarter: sortByPeriod(sumBy(opps, (o) => o.fiscal_period, (o) => o.net_new_acv_y1)),
      byIndustry: sumBy(opps, (o) => o.adlib_industry, (o) => o.net_new_acv_y1).slice(0, 10),
      byRep: sumBy(opps, (o) => o.opportunity_owner, (o) => o.net_new_acv_y1).slice(0, 10),
      bySource: sumBy(opps, (o) => o.lead_source, (o) => o.net_new_acv_y1).slice(0, 10),
      byStage: sumBy(opps, (o) => o.stage, (o) => o.net_new_acv_y1),
      detail: [...opps].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || "")),
    };
  }, [st.opps]);

  if (st.status === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading created pipeline…</span></Card>;
  }
  if (st.status === "error") {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load created pipeline</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{st.error}</div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-revos-ink">Created</h2>
        <p className="text-[12.5px] text-revos-ink3">New pipeline created FYTD · Net New ACV Yr1 · {agg.opps.length} opps</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Created FYTD" value={currencyFmt(agg.total)} sub={`${agg.opps.length} opps · NN ACV Yr1`} />
        <Kpi label="Still open" value={String(agg.open.length)} sub={currencyFmt(sumN(agg.open))} tone="good" />
        <Kpi label="Already Closed-Won" value={String(agg.won.length)} sub={currencyFmt(sumN(agg.won))} tone="good" />
        <Kpi label="Already Closed-Lost" value={String(agg.lost.length)} sub={currencyFmt(sumN(agg.lost))} tone="crit" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardHead kick="Created" title="By quarter" meta="NN ACV Yr1" /><VBars data={agg.byQuarter} /></Card>
        <Card><CardHead kick="Created" title="By industry" /><Bars data={agg.byIndustry} /></Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Card><CardHead kick="Created" title="By rep" /><Bars data={agg.byRep} /></Card>
        <Card><CardHead kick="Created" title="By lead source" /><Bars data={agg.bySource} /></Card>
        <Card><CardHead kick="Created" title="By stage today" /><Bars data={agg.byStage} /></Card>
      </div>

      <Card>
        <CardHead kick="Detail" title="Created opps" meta={`${agg.opps.length} opps · newest first`} />
        <OppTable opps={agg.detail} />
      </Card>
    </div>
  );
}
