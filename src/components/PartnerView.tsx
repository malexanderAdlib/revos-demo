"use client";

import { Fragment, useEffect, useState } from "react";
import { api, currencyFmt, type Partner, type PartnerRollup } from "@/lib/api";
import { Card, CardHead } from "./ui";

// Partner Pipeline — ported from the pipeline dashboard into the Cube tab.
// Two views keyed on the PARTNER NAME: SOURCED (who brought the deal) and
// CONTRACTING (whose paper it's on). Channel Type is a cross-check only.

type Loadable = { state: "loading" | "ready" | "error"; data: Partner | null; error?: string };

export function PartnerView() {
  const [pv, setPv] = useState<Loadable>({ state: "loading", data: null });

  useEffect(() => {
    let alive = true;
    api.partner()
      .then((d) => alive && setPv({ state: "ready", data: d }))
      .catch((e) => alive && setPv({ state: "error", data: null, error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  if (pv.state === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading partner pipeline…</span></Card>;
  }
  if (pv.state === "error" || !pv.data) {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load partner pipeline</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{pv.error}</div>
      </Card>
    );
  }

  const d = pv.data;
  const t = d.totals;
  const il = d.inbound_leads;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Partner-Sourced (open)" value={currencyFmt(t.sourced_nnacv)}
          sub={`${d.sourced_by_partner.length} sourcing partners · NN ACV Yr1`} />
        <Kpi label="Partner-Contracted (open)" value={currencyFmt(t.contracting_nnacv)}
          sub={`${d.contracting_by_partner.length} contracting partners · whose paper`} />
        <Kpi label="Partner Channel" value={currencyFmt(t.partner_channel_nnacv)}
          sub="Channel Type = Partner (free field · cross-check)" />
        <Kpi label="Partner-Influenced" value={currencyFmt(t.influenced_nnacv)}
          sub="influence motion, or hybrid deal (cross-check)" />
      </div>

      {il && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Kpi label="Partner Inbound Leads" value={String(il.total)} sub="all-time · Lead Source = Partner" />
          <Kpi label="Active Partner Leads" value={String(il.active)} sub="point-in-time" />
          <Kpi label="FY Cohort → Oppty" value={String(il.oppty)}
            sub={`${il.fy_cohort} leads · ${il.mql} MQL · ${il.sql} SQL this FY`} />
        </div>
      )}

      <PartnerTable
        title="Sourced pipeline — who brought the deal"
        sub="Sourcing Partner · motion · open NN ACV Yr1 · click a partner for its deals"
        rows={d.sourced_by_partner} />
      <PartnerTable
        title="Contracting pipeline — whose paper it's on"
        sub="Contracting Partner (Opportunity.Partner__c) · motion · open NN ACV Yr1 · click a partner for its deals"
        rows={d.contracting_by_partner} />

      {d.by_channel?.length > 0 && (
        <Card>
          <CardHead kick="Cross-check" title="Channel Type"
            meta="Sales_Type__c — the free picklist; the two views above are the source of truth" />
          <div className="overflow-x-auto p-4 pt-2">
            <table className="w-full text-[12px]">
              <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
                <tr>
                  <th className="pb-1.5 text-left">Channel</th>
                  <th className="pb-1.5 text-right">Deals</th>
                  <th className="pb-1.5 text-right">Open NN ACV</th>
                </tr>
              </thead>
              <tbody>
                {d.by_channel.map((c) => (
                  <tr key={c.channel} className="border-t border-revos-line">
                    <td className="py-1.5 text-revos-ink">{c.channel}</td>
                    <td className="py-1.5 text-right tabular-nums text-revos-ink2">{c.count}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums text-revos-ink">{currencyFmt(c.nnacv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {d.note && <p className="text-[11px] text-revos-ink3">{d.note}</p>}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-revos-line bg-revos-panel p-4 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-revos-ink3">{label}</div>
      <div className="mt-1 text-[22px] font-bold leading-none text-revos-ink">{value}</div>
      <div className="mt-1.5 text-[11px] text-revos-ink3">{sub}</div>
    </div>
  );
}

function PartnerTable({ title, sub, rows }: { title: string; sub: string; rows: PartnerRollup[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (p: string) =>
    setOpen((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; });

  return (
    <Card>
      <CardHead kick="Partner view" title={title} meta={sub} />
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-[12.5px] text-revos-ink3">No partners on open pipeline.</div>
      ) : (
        <div className="overflow-x-auto p-4 pt-2">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
              <tr>
                <th className="pb-1.5 text-left">Partner</th>
                <th className="pb-1.5 text-left">Motion mix</th>
                <th className="pb-1.5 text-right">Deals</th>
                <th className="pb-1.5 text-right">Open NN ACV</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.partner}>
                  <tr onClick={() => toggle(r.partner)}
                    className="cursor-pointer border-t border-revos-line hover:bg-revos-card">
                    <td className="py-1.5 font-medium text-revos-ink">
                      <span className="mr-1 text-revos-ink3">{open.has(r.partner) ? "▾" : "▸"}</span>
                      {r.partner}
                    </td>
                    <td className="py-1.5">
                      {r.motions.map((m) => (
                        <span key={m.motion}
                          className="mb-0.5 mr-1 inline-block rounded bg-revos-wash px-1.5 py-0.5 text-[10px] text-revos-brand">
                          {m.motion} · {m.count}
                        </span>
                      ))}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-revos-ink2">{r.count}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums text-revos-ink">{currencyFmt(r.nnacv)}</td>
                  </tr>
                  {open.has(r.partner) && r.deals.map((dl) => (
                    <tr key={dl.id} className="border-t border-revos-line/50 bg-revos-card">
                      <td className="py-1 pl-5 text-revos-ink">{dl.name || dl.account || "—"}</td>
                      <td className="py-1 text-revos-ink3">
                        {[dl.account, dl.stage, dl.motion || "no motion", dl.lead_source ? `src: ${dl.lead_source}` : null]
                          .filter(Boolean).join(" · ")}
                      </td>
                      <td className="py-1"></td>
                      <td className="py-1 text-right tabular-nums text-revos-ink3">{currencyFmt(dl.nnacv)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
