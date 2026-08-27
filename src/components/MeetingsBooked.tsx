"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { api, type MeetingsBooked as MB } from "@/lib/api";
import { Card, CardHead } from "./ui";

// Meetings Booked (Sharon 8/19) — ported from the scorecard app into the
// Scorecard tab. Forward-looking: customer meetings each AE has SET on their
// Outlook calendar over the next few weeks, read from the calendar directly
// (organiser-filtered, series deduped, customer attendees only). A booked
// meeting lives in the calendar, not Regie or a Salesforce Event — this reads
// the source. A mailbox not in the calendar-read group shows "—", never a zero.

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-revos-line bg-revos-panel p-4 shadow-card">
      <div className="text-[11px] uppercase tracking-[0.06em] text-revos-ink3">{label}</div>
      <div className="mt-1 text-[24px] font-bold leading-none tabular-nums text-revos-ink">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-revos-ink3">{sub}</div>}
    </div>
  );
}

export function MeetingsBookedView() {
  const [data, setData] = useState<MB | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setErr(null);
    api.meetingsBooked()
      .then((r) => setData(r))
      .catch((e) => setErr(String((e as Error)?.message || e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-revos-ink">Meetings Booked</h2>
          <p className="text-[12.5px] text-revos-ink3">
            Customer meetings each AE has set on their calendar
            {data ? ` · next ${data.days_ahead} days · as of ${data.as_of}` : " …"}
          </p>
        </div>
        <button onClick={() => load()}
          className="rounded-md border border-revos-line px-3 py-1.5 text-[12.5px] text-revos-ink2 hover:text-revos-brand">
          Refresh
        </button>
      </div>

      {err && (
        <Card className="p-5">
          <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load Meetings Booked</div>
          <div className="mt-1 text-[12.5px] text-revos-ink2">{err}</div>
        </Card>
      )}
      {loading && !data && <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading…</span></Card>}

      {data && t && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Tile label="Booked" value={String(t.booked)} sub={`next ${data.days_ahead} days`} />
            <Tile label="Reps with meetings" value={String(t.reps_with_meetings)} />
            <Tile label="Mailboxes not visible" value={String(t.reps_blind)} sub="not in the calendar-read group" />
          </div>

          <div className="flex flex-col gap-3">
            {data.reps.map((r) => {
              const blind = r.count === null;
              const quiet = r.count === 0;
              return (
                <Card key={r.name} className={clsx((blind || quiet) && "opacity-70")}>
                  <div className="flex items-center justify-between border-b border-revos-line px-4 py-[13px]">
                    <div className="text-[13px] font-semibold text-revos-ink">{r.name}</div>
                    <div className="text-[12.5px] font-semibold tabular-nums text-revos-brand">
                      {blind ? "—" : `${r.count} booked`}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    {blind && <div className="text-[12px] text-revos-ink3">Calendar not readable for this mailbox.</div>}
                    {!blind && r.meetings.length === 0 && (
                      <div className="text-[12px] text-revos-ink3">No customer meetings booked in this window.</div>
                    )}
                    {r.meetings.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                          <tbody>
                            {r.meetings.map((m, i) => (
                              <tr key={i} className="border-t border-revos-line/60 first:border-t-0">
                                <td className="w-28 whitespace-nowrap py-1.5 pr-3 align-top tabular-nums text-revos-ink3">{m.start}</td>
                                <td className="py-1.5 pr-3 text-revos-ink">{m.subject}</td>
                                <td className="whitespace-nowrap py-1.5 align-top text-revos-ink3">{m.customer}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {data.note && <p className="max-w-4xl text-[11px] leading-relaxed text-revos-ink3">{data.note}</p>}
        </>
      )}
    </div>
  );
}
