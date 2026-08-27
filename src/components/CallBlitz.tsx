"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type CallBlitz as CB } from "@/lib/api";
import { Card, CardHead } from "./ui";

// Call Blitz (Alex 8/17) — ported from the scorecard app into the Scorecard tab.
// One day of concentrated dialling per AE, with a history strip. Two things this
// deliberately shows rather than hides: "no disposition" dials (why a connect
// rate can read blank), and meetings booked from each rep's Outlook calendar
// (the real source) with the Salesforce count in parens — a mailbox we can't
// read shows "—", not zero.

const num = (n: number | null | undefined) => (n === null || n === undefined ? "—" : String(n));

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-revos-line bg-revos-panel p-4 shadow-card">
      <div className="text-[11px] uppercase tracking-[0.06em] text-revos-ink3">{label}</div>
      <div className="mt-1 text-[24px] font-bold leading-none tabular-nums text-revos-ink">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-revos-ink3">{sub}</div>}
    </div>
  );
}

export function CallBlitzView() {
  const [data, setData] = useState<CB | null>(null);
  const [day, setDay] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback((d?: string) => {
    setLoading(true); setErr(null);
    api.callBlitz(d ? { day: d } : {})
      .then((r) => { setData(r); setDay(r.day); })
      .catch((e) => setErr(String((e as Error)?.message || e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals;
  const peak = Math.max(1, ...(data?.history ?? []).map((h) => h.dials));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-revos-ink">Call Blitz</h2>
          <p className="text-[12.5px] text-revos-ink3">
            Dials and meetings booked by AE for a single day · {data?.day ?? "…"}
            {data ? ` · ${data.active_reps} reps active` : ""}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-[11px] text-revos-ink3">
            Blitz day
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
              className="ml-2 rounded-md border border-revos-line px-2 py-1 text-[12.5px]" />
          </label>
          <button onClick={() => load(day)}
            className="rounded-md bg-revos-brand px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-revos-brand2">
            Show
          </button>
          <button onClick={() => load()}
            className="rounded-md border border-revos-line px-3 py-1.5 text-[12.5px] text-revos-ink2 hover:text-revos-brand">
            Today
          </button>
        </div>
      </div>

      {err && (
        <Card className="p-5">
          <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load Call Blitz</div>
          <div className="mt-1 text-[12.5px] text-revos-ink2">{err}</div>
        </Card>
      )}
      {loading && !data && <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading…</span></Card>}

      {data && t && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <Tile label="In sequence" value={num(t.in_sequence)} sub="leads with a live Regie step" />
            <Tile label="Dials" value={num(t.dials)} sub={`${data.active_reps} reps dialling`} />
            <Tile label="Connects" value={num(t.connects)} />
            <Tile label="Connect rate" value={t.connect_rate === null ? "—" : `${t.connect_rate}%`}
              sub="of dials with an outcome logged" />
            <Tile label="Meetings booked" value={num(t.meetings_from_calendar)}
              sub={`on reps' calendars${t.meetings_calendar_blind ? ` · ${t.meetings_calendar_blind} not visible` : ""} · ${t.meetings} logged in Salesforce`} />
            <Tile label="Bad numbers" value={num(t.bad_data)} sub="wrong person / bad number" />
          </div>

          <Card>
            <CardHead kick="Call blitz" title="By AE" meta={`${data.day} · ${data.active_reps} active`} />
            <div className="overflow-x-auto p-4 pt-2">
              <table className="w-full text-[12px]">
                <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
                  <tr>
                    <th className="pb-1.5 pr-3 text-left">AE</th>
                    <th className="pb-1.5 pr-3 text-right">In seq</th>
                    <th className="pb-1.5 pr-3 text-right">Dials</th>
                    <th className="pb-1.5 pr-3 text-right">Connects</th>
                    <th className="pb-1.5 pr-3 text-right">Connect rate</th>
                    <th className="pb-1.5 pr-3 text-right">Meetings</th>
                    <th className="pb-1.5 pr-3 text-right">No answer</th>
                    <th className="pb-1.5 pr-3 text-right">Bad number</th>
                    <th className="pb-1.5 text-right">No disposition</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reps.map((r) => {
                    const quiet = r.dials === 0 && r.meetings === 0 && !r.meetings_from_calendar && !r.in_sequence;
                    return (
                      <tr key={r.name}
                        className={quiet ? "border-t border-revos-line text-revos-ink3" : "border-t border-revos-line hover:bg-revos-card"}>
                        <td className="py-1.5 pr-3 font-medium text-revos-ink">{r.name}</td>
                        <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-revos-ink2">{num(r.in_sequence)}</td>
                        <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-revos-ink">{r.dials}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{r.connects}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{r.connect_rate === null ? "—" : `${r.connect_rate}%`}</td>
                        <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-revos-ink">
                          {num(r.meetings_from_calendar)}
                          {r.meetings > 0 && <span className="font-normal text-[11px] text-revos-ink3"> ({r.meetings} SF)</span>}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{r.no_answer}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{r.bad_data}</td>
                        <td className="py-1.5 text-right tabular-nums text-revos-ink2">{r.untagged}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHead kick="History" title="Previous days — which ones were blitzes"
              meta="click a day to load it" />
            <div className="overflow-x-auto p-4 pt-2">
              <table className="w-full text-[12px]">
                <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
                  <tr>
                    <th className="pb-1.5 pr-3 text-left">Day</th>
                    <th className="pb-1.5 pr-3 text-right">Dials</th>
                    <th className="pb-1.5 pr-3 text-right">Connects</th>
                    <th className="pb-1.5 pr-3 text-right">Meetings</th>
                    <th className="pb-1.5 pr-3 text-right">Reps</th>
                    <th className="w-1/3 pb-1.5 text-left">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.history].reverse().map((h) => (
                    <tr key={h.day}
                      className={h.day === data.day ? "border-t border-revos-line bg-revos-wash/50 font-medium" : "border-t border-revos-line"}>
                      <td className="py-1.5 pr-3">
                        <button className="text-revos-brand hover:underline" onClick={() => load(h.day)}>{h.day}</button>
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{h.dials}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{h.connects}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{h.meetings}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{h.reps_dialling}</td>
                      <td className="py-1.5">
                        <div className="h-2 rounded bg-revos-brand/70"
                          style={{ width: `${Math.round((h.dials / peak) * 100)}%`, minWidth: h.dials ? 2 : 0 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {data.note && <p className="max-w-4xl text-[11px] leading-relaxed text-revos-ink3">{data.note}</p>}
        </>
      )}
    </div>
  );
}
