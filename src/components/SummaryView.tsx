"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { api, currencyFmt, dateShort, ragToTier, type Summary } from "@/lib/api";
import { Card, CardHead, Dot } from "./ui";
import { Bars, VBars, Kpi } from "./charts";

// Summary (Cube landing) — ported from the pipeline dashboard's Summary tab.
// Headline open-pipeline KPIs, the report-aligned scorecard tie-out, the
// week-over-week top-line, the marketing lead funnel, renewals-by-churn-risk
// RAG bands, top accounts, and every open-pipeline breakdown. Money = Net New
// ACV Yr1; open excludes Manager-Forecast "Omitted". Charts are CSS bars.

type Loadable = { state: "loading" | "ready" | "error"; data: Summary | null; error?: string };

const signedUsd = (v: number) => `${v >= 0 ? "+" : "−"}${currencyFmt(Math.abs(v))}`;

const BAND_COLOR: Record<string, string> = {
  Red: "text-revos-crit", Amber: "text-revos-warn", Green: "text-revos-good", Unrated: "text-revos-ink3",
};

export function SummaryView() {
  const [ld, setLd] = useState<Loadable>({ state: "loading", data: null });

  useEffect(() => {
    let alive = true;
    api.summary()
      .then((d) => alive && setLd({ state: "ready", data: d }))
      .catch((e) => alive && setLd({ state: "error", data: null, error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  if (ld.state === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading summary…</span></Card>;
  }
  if (ld.state === "error" || !ld.data) {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load summary</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{ld.error}</div>
      </Card>
    );
  }

  const d = ld.data;
  const o = d.open;
  const sc = d.scorecard;
  const w = d.wow;
  const lead = d.lead;
  const moved = w.counts ? w.counts.new + w.counts.gone + w.counts.increased + w.counts.decreased : 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-revos-ink">Summary</h2>
        <p className="text-[12.5px] text-revos-ink3">Open pipeline · {d.scope} · as of {d.as_of}</p>
      </div>

      {/* Open pipeline */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Kpi label="Open pipeline" value={currencyFmt(o.nnacv)}
          sub={`${o.count} opps · NN ACV Yr1 · excl. Omitted (${currencyFmt(o.omitted_value)})`} />
        <Kpi label={`In-quarter (${o.period})`} value={currencyFmt(o.in_quarter_nnacv)}
          sub={`${Math.round((o.in_quarter_nnacv / o.nnacv) * 100)}% of open · ${o.in_quarter_count} opps`} />
      </div>

      {/* Week-over-week */}
      {w.available && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-revos-ink3">Week-over-week pipeline</div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="This week" value={currencyFmt(w.this_week_total || 0)} sub={w.this_week} />
            <Kpi label="Last week" value={currencyFmt(w.last_week_total || 0)} sub={w.last_week} />
            <div className="rounded-xl border border-revos-line bg-revos-panel p-4 shadow-card">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-revos-ink3">Net change</div>
              <div className={clsx("mt-1 text-[22px] font-bold leading-none tabular-nums", (w.delta || 0) >= 0 ? "text-revos-good" : "text-revos-crit")}>
                {signedUsd(w.delta || 0)}
              </div>
              <div className="mt-1.5 text-[11px] text-revos-ink3">vs last week</div>
            </div>
            <Kpi label="Deals moved" value={String(moved)}
              sub={w.counts ? `${w.counts.new} new · ${w.counts.gone} gone · ${w.counts.increased}↑ · ${w.counts.decreased}↓` : ""} />
          </div>
        </div>
      )}

      {/* Report tie-out */}
      <div className="flex items-center justify-end text-[11px] text-revos-ink3">
        Tie-out tiles · as of {dateShort(sc.data_as_of)} · {sc.source}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Closed-won" value={String(sc.closed_won_cy.count)} sub={`${currencyFmt(sc.closed_won_cy.value_year1)} · ${sc.period} · NN ACV Yr1`} />
        <Kpi label="Created FYTD" value={currencyFmt(sc.created_fytd.value)} sub={`${sc.created_fytd.count} opps · YTD`} />
        <Kpi label="New logo open" value={currencyFmt(sc.new_logo_open.value)} sub={`${sc.new_logo_open.count} opps · excl. winbacks`} />
        <Kpi label="Active accounts" value={String(sc.active_accounts)} sub={`${currencyFmt(sc.active_prior_year_acv)} prior-yr ACV`} />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Kpi label="Churn forecast" value={currencyFmt(sc.churn_forecast.value)} sub="open renewal risk" />
        <Kpi label="Down-sell" value={currencyFmt(Math.abs(sc.downsell_cy.value_year1))} sub={`${sc.downsell_cy.count} deals · ${sc.period}`} />
        <Kpi label="Churn + down-sell" value={currencyFmt(sc.churn_forecast.value + Math.abs(sc.downsell_cy.value_year1))} sub="combined headwind" />
      </div>

      {/* Renewals by churn risk */}
      <Card>
        <CardHead kick="Renewals" title="By churn risk" meta="open renewals · by Churn_Risk__c" />
        <div className="grid grid-cols-2 gap-3 p-4 pt-3 lg:grid-cols-4">
          {d.renewals_rag.map((b) => (
            <div key={b.band} className="rounded-lg border border-revos-line bg-revos-card p-3">
              <div className="flex items-center gap-1.5">
                <Dot tier={ragToTier(b.band)} className="h-2.5 w-2.5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-revos-ink3">{b.band}</span>
              </div>
              <div className={clsx("mt-1 text-[18px] font-bold tabular-nums", BAND_COLOR[b.band] || "text-revos-ink")}>{currencyFmt(b.value)}</div>
              <div className="text-[11px] text-revos-ink3">{b.count} renewals</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Marketing funnel */}
      {lead && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Active leads" value={String(lead.active_leads ?? lead.stages[0]?.count ?? 0)} sub="in the pool" />
            <Kpi label="Leads (FY)" value={String(lead.stages[0]?.count ?? 0)} />
            <Kpi label="MQLs" value={String(lead.stages[1]?.count ?? 0)} sub={lead.stages[1]?.conv_from_prev != null ? `${lead.stages[1].conv_from_prev}% of leads` : undefined} />
            <Kpi label="Lead → oppty" value={`${lead.overall_lead_to_oppty_pct}%`} sub={`${lead.stages[3]?.count ?? 0} became opps`} />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Card><CardHead kick="Funnel" title="Progression" /><Bars unit="count" data={lead.stages.map((s) => ({ key: s.stage, value: s.count }))} /></Card>
            <Card><CardHead kick="Funnel" title="Leads by source" /><Bars unit="count" data={(lead.by_source ?? []).map((s) => ({ key: s.source, value: s.leads }))} /></Card>
            <Card><CardHead kick="Funnel" title="Leads by industry" /><Bars unit="count" data={(lead.by_industry ?? []).map((s) => ({ key: s.industry, value: s.leads }))} /></Card>
          </div>
        </div>
      )}

      {/* Open-pipeline breakdowns */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card><CardHead kick="Open pipe" title="By industry group" /><Bars data={d.by_industry_group} /></Card>
        <Card><CardHead kick="Open pipe" title="By type" /><Bars data={d.by_type} /></Card>
      </div>
      <Card><CardHead kick="Open pipe" title="By industry" /><Bars data={d.by_industry} /></Card>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card><CardHead kick="Open pipe" title="Expansions by sales motion" /><Bars data={d.exp_by_sales_motion} /></Card>
        <Card><CardHead kick="Open pipe" title="Forecast posture" meta="manager forecast" /><Bars data={d.by_manager_forecast} /></Card>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card><CardHead kick="Open pipe" title="By stage" /><VBars data={d.by_stage} /></Card>
        <Card><CardHead kick="Open pipe" title="By fiscal period" /><VBars data={d.by_period} /></Card>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card><CardHead kick="Open pipe" title="By rep" /><Bars data={d.by_owner} /></Card>
        <Card><CardHead kick="Open pipe" title="By lead source" /><Bars data={d.by_source} /></Card>
        <Card><CardHead kick="Open pipe" title="By revenue range" /><Bars data={d.by_rev_range} /></Card>
      </div>

      {/* Top accounts */}
      <Card>
        <CardHead kick="Concentration" title="Top accounts by open pipeline" meta="NN ACV Yr1" />
        <div className="overflow-x-auto p-4 pt-2">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
              <tr>
                <th className="pb-1.5 pr-3 text-left">Account</th>
                <th className="pb-1.5 pr-3 text-left">Industry</th>
                <th className="pb-1.5 pr-3 text-left">Owner</th>
                <th className="pb-1.5 text-right">Open NN ACV</th>
              </tr>
            </thead>
            <tbody>
              {d.top_accounts.map((a) => (
                <tr key={a.acct} className="border-t border-revos-line hover:bg-revos-card">
                  <td className="py-1.5 pr-3 font-medium text-revos-ink">{a.acct}</td>
                  <td className="py-1.5 pr-3 text-revos-ink3">{a.industry}</td>
                  <td className="py-1.5 pr-3 text-revos-ink2">{a.owner}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums text-revos-ink">{currencyFmt(a.value)}</td>
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
