"use client";

import { useEffect, useMemo, useState } from "react";
import { api, currencyFmt, sumBy, type Opp } from "@/lib/api";
import { Card, CardHead } from "./ui";
import { Bars, Kpi, OppTable } from "./charts";

// Open Pipeline (Cube) — ported from the pipeline dashboard. Breaks open pipe
// (Net New ACV Yr1, Manager-Forecast "Omitted" excluded) by sales motion,
// channel, type, and forecast category, and lists the top deals — all rolled up
// client-side from the raw /opps snapshot. Charts are CSS bars; RevOS stays
// recharts-free.

type State = { status: "loading" | "ready" | "error"; opps: Opp[]; error?: string };

export function OpenPipelineView() {
  const [st, setSt] = useState<State>({ status: "loading", opps: [] });

  useEffect(() => {
    let alive = true;
    api.opps({ snapshot_type: "open", limit: 1000 })
      .then((opps) => alive && setSt({ status: "ready", opps }))
      .catch((e) => alive && setSt({ status: "error", opps: [], error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  const agg = useMemo(() => {
    const counted = st.opps.filter((o) => o.manager_forecast_category !== "Omitted");
    const totalOpen = counted.reduce((a, o) => a + (o.net_new_acv_y1 || 0), 0);
    return {
      counted,
      totalOpen,
      avgDeal: counted.length ? totalOpen / counted.length : 0,
      byMotion: sumBy(counted, (o) => o.sales_motion, (o) => o.net_new_acv_y1),
      byChannel: sumBy(counted, (o) => o.channel_type, (o) => o.net_new_acv_y1),
      byType: sumBy(counted, (o) => o.type, (o) => o.net_new_acv_y1),
      byForecast: sumBy(counted, (o) => o.forecast_category, (o) => o.net_new_acv_y1),
      byManager: sumBy(counted, (o) => o.manager_forecast_category, (o) => o.net_new_acv_y1),
      top: [...counted].sort((a, b) => (b.net_new_acv_y1 || 0) - (a.net_new_acv_y1 || 0)).slice(0, 10),
    };
  }, [st.opps]);

  if (st.status === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading open pipeline…</span></Card>;
  }
  if (st.status === "error") {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load open pipeline</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{st.error}</div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-revos-ink">Open Pipeline</h2>
        <p className="text-[12.5px] text-revos-ink3">
          Open pipeline · Net New ACV Yr1 · Manager-Forecast &quot;Omitted&quot; excluded · {agg.counted.length} opps
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="Open pipeline" value={currencyFmt(agg.totalOpen)} sub={`${agg.counted.length} opps · NN ACV Yr1`} />
        <Kpi label="Avg deal" value={currencyFmt(agg.avgDeal)} sub="open NN ACV ÷ opps" />
        <Kpi label="Top deal" value={currencyFmt(agg.top[0]?.net_new_acv_y1 || 0)} sub={agg.top[0]?.account_name || ""} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card><CardHead kick="Open pipe" title="By sales motion" /><Bars data={agg.byMotion} /></Card>
        <Card><CardHead kick="Open pipe" title="By channel type" /><Bars data={agg.byChannel} /></Card>
        <Card><CardHead kick="Open pipe" title="By type" /><Bars data={agg.byType} /></Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardHead kick="Open pipe" title="By forecast category" meta="SFDC stock" /><Bars data={agg.byForecast} /></Card>
        <Card><CardHead kick="Open pipe" title="By manager forecast" meta="Sharon's overlay" /><Bars data={agg.byManager} /></Card>
      </div>

      <Card>
        <CardHead kick="Deals" title="Top 10 open deals" meta="by NN ACV Yr1 · all types" />
        <OppTable opps={agg.top} />
      </Card>
    </div>
  );
}
