"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { api, currencyFmt, type Wow, type WowMover } from "@/lib/api";
import { Card, CardHead } from "./ui";
import { Kpi } from "./charts";

// Week-over-Week (Cube) — deal-level diff of the two most recent OPEN snapshots
// on NN ACV Yr1: what was created, dropped, and where value moved. available=false
// (with a reason) until two snapshots exist to diff — the calm LIVE default today
// (daily capture is off). Charts are CSS bars; money coerced locally.

type Loadable = { state: "loading" | "ready" | "error"; data: Wow | null; error?: string };

const signed = (n: number) => `${n < 0 ? "−" : "+"}${currencyFmt(Math.abs(n))}`;

function MoverTable({ kick, title, rows, kind, tone }: {
  kick: string; title: string; rows?: WowMover[]; kind: "value" | "delta"; tone: "good" | "warn";
}) {
  const list = rows ?? [];
  return (
    <Card>
      <CardHead kick={kick} title={title} meta={list.length ? `${list.length} shown` : undefined} />
      {list.length === 0 ? (
        <div className="px-4 py-6 text-[12.5px] text-revos-ink3">None.</div>
      ) : (
        <div className="overflow-x-auto p-4 pt-2">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
              <tr>
                <th className="pb-1.5 pr-3 text-left">Account · opportunity</th>
                <th className="pb-1.5 pr-3 text-left">Owner</th>
                <th className="pb-1.5 pr-3 text-left">Stage</th>
                <th className="pb-1.5 text-right">{kind === "delta" ? "Δ NN ACV" : "NN ACV"}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={i} className="border-t border-revos-line">
                  <td className="max-w-[18rem] py-1.5 pr-3">
                    <div className="truncate font-medium text-revos-ink">{r.account}</div>
                    <div className="truncate text-revos-ink3">{r.name}</div>
                  </td>
                  <td className="py-1.5 pr-3 text-revos-ink2">{r.owner}</td>
                  <td className="py-1.5 pr-3 text-revos-ink2">{r.stage || "—"}</td>
                  <td className={clsx("py-1.5 text-right font-medium tabular-nums", tone === "good" ? "text-revos-good" : "text-revos-warn")}>
                    {kind === "delta" ? signed(Number(r.delta || 0)) : currencyFmt(Number(r.value || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function WowView() {
  const [ld, setLd] = useState<Loadable>({ state: "loading", data: null });

  useEffect(() => {
    let alive = true;
    api.wow()
      .then((d) => alive && setLd({ state: "ready", data: d }))
      .catch((e) => alive && setLd({ state: "error", data: null, error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  if (ld.state === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading week-over-week…</span></Card>;
  }
  if (ld.state === "error" || !ld.data) {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load week-over-week</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{ld.error}</div>
      </Card>
    );
  }

  const d = ld.data;
  if (!d.available) {
    return (
      <Card>
        <CardHead kick="Cube" title="Week-over-Week" />
        <div className="px-4 py-6 text-[12.5px] text-revos-ink3">
          {d.reason || "Needs two successful open snapshots to diff. The daily snapshot capture has to run twice before there's a week-over-week movement to show."}
        </div>
      </Card>
    );
  }

  const delta = Number(d.delta || 0);
  const c = d.counts;
  const moved = c ? (c.new || 0) + (c.gone || 0) + (c.increased || 0) + (c.decreased || 0) : 0;
  const max = Math.max(Number(d.this_week_total || 0), Number(d.last_week_total || 0), 1);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-revos-ink">Week-over-Week</h2>
        <p className="text-[12.5px] text-revos-ink3">Deal movers since last snapshot · Net New ACV Yr1 · {d.last_week} → {d.this_week}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Open pipeline (NN ACV)" value={currencyFmt(Number(d.this_week_total || 0))} sub={`this week · ${d.this_week}`} />
        <Kpi label="Last week" value={currencyFmt(Number(d.last_week_total || 0))} sub={d.last_week} />
        <div className="rounded-xl border border-revos-line bg-revos-panel p-4 shadow-card">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-revos-ink3">Net change</div>
          <div className={clsx("mt-1 text-[22px] font-bold leading-none tabular-nums", delta >= 0 ? "text-revos-good" : "text-revos-warn")}>{signed(delta)}</div>
          <div className="mt-1.5 text-[11px] text-revos-ink3">week-over-week</div>
        </div>
        <Kpi label="Deals moved" value={String(moved)}
          sub={c ? `${c.new || 0} new · ${c.gone || 0} gone · ${c.increased || 0}↑ · ${c.decreased || 0}↓` : ""} />
      </div>

      <Card>
        <CardHead kick="Cube" title="Open pipeline · this week vs last" meta="NN ACV Yr1" />
        <div className="flex flex-col gap-2.5 p-4 pt-3">
          {([["Last week", Number(d.last_week_total || 0), "bg-revos-brand"], ["This week", Number(d.this_week_total || 0), "bg-revos-brand2"]] as const).map(([label, val, cls]) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-[92px] shrink-0 text-[11px] text-revos-ink3">{label}</div>
              <div className="h-2.5 flex-1 rounded bg-revos-card">
                <div className={clsx("h-2.5 rounded", cls)} style={{ width: `${((val / max) * 100).toFixed(1)}%` }} />
              </div>
              <div className="w-20 shrink-0 text-right text-[11px] font-medium tabular-nums text-revos-ink">{currencyFmt(val)}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <MoverTable kick="Added" title="Newly created" rows={d.new} kind="value" tone="good" />
        <MoverTable kick="Dropped" title="Dropped / closed out" rows={d.gone} kind="value" tone="warn" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <MoverTable kick="Gained" title="Value gained" rows={d.increased} kind="delta" tone="good" />
        <MoverTable kick="Slipped" title="Value slipped" rows={d.decreased} kind="delta" tone="warn" />
      </div>

      <p className="max-w-4xl text-[11px] text-revos-ink3">
        Diff of the two most recent open snapshots ({d.last_week} → {d.this_week}) on Net New ACV Yr1, by opportunity. Excludes royalty / non-sales.
      </p>
    </div>
  );
}
