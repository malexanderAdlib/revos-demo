"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { api, type DealActivity as DA } from "@/lib/api";
import { Card, CardHead } from "./ui";

// Deal Activity (Sharon 8/7) — ported from the scorecard app into the Scorecard
// tab. Per-opp activity on the Q3/Q4 forecast over a trailing window
// (email/call/meeting logged ON the opportunity), contact-role count, next-step,
// last-touch. The deal-grain complement to Account 360. No LinkedIn column —
// Regie logs LinkedIn to leads/contacts, not opps. Scope is server-enforced.

type Loadable = { state: "loading" | "ready" | "error"; data: DA | null; error?: string };

const money = (v: number): string =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v > 0 ? `$${Math.round(v / 1e3)}K` : "—";

function Tile({ label, value, tone }: { label: string; value: number | string; tone?: "crit" | "warn" }) {
  return (
    <div className="min-w-[6.5rem] rounded-xl border border-revos-line bg-revos-panel px-3.5 py-2.5 shadow-card">
      <div className={clsx("text-[20px] font-bold leading-none tabular-nums",
        tone === "crit" ? "text-revos-crit" : tone === "warn" ? "text-revos-warn" : "text-revos-ink")}>
        {value}
      </div>
      <div className="mt-1.5 text-[11px] leading-tight text-revos-ink3">{label}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={clsx(
        "rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors",
        on ? "border-revos-brand bg-revos-brand text-white"
           : "border-revos-line bg-revos-panel text-revos-ink2 hover:text-revos-brand")}>
      {children}
    </button>
  );
}

function Flag({ tone, children }: { tone: "crit" | "warn" | "muted"; children: React.ReactNode }) {
  return (
    <span className={clsx(
      "rounded px-1.5 py-0.5 text-[10px] font-semibold",
      tone === "crit" && "bg-revos-critwash text-revos-crit",
      tone === "warn" && "bg-revos-warnwash text-revos-warn",
      tone === "muted" && "bg-revos-card text-revos-ink2")}>
      {children}
    </span>
  );
}

export function DealActivityView() {
  const [ld, setLd] = useState<Loadable>({ state: "loading", data: null });
  const [rep, setRep] = useState("");
  const [qtr, setQtr] = useState<"" | "Q3" | "Q4">("");
  const [stalledOnly, setStalledOnly] = useState(false);
  const [singleOnly, setSingleOnly] = useState(false);
  const [noNextOnly, setNoNextOnly] = useState(false);

  useEffect(() => {
    let alive = true;
    api.dealActivity()
      .then((d) => alive && setLd({ state: "ready", data: d }))
      .catch((e) => alive && setLd({ state: "error", data: null, error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  const data = ld.data;
  const reps = useMemo(
    () => Array.from(new Set((data?.rows ?? []).map((r) => r.owner).filter(Boolean))).sort() as string[],
    [data]);
  const rows = useMemo(() => (data?.rows ?? []).filter((r) =>
    (!rep || r.owner === rep) && (!qtr || r.quarter === qtr) &&
    (!stalledOnly || r.stalled) && (!singleOnly || r.single_thread) && (!noNextOnly || r.no_next_step)),
    [data, rep, qtr, stalledOnly, singleOnly, noNextOnly]);

  if (ld.state === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading deal activity…</span></Card>;
  }
  if (ld.state === "error" || !data) {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load Deal Activity</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{ld.error}</div>
      </Card>
    );
  }

  const c = data.counts;
  const cell = (n: number) => (n > 0 ? String(n) : <span className="text-revos-ink3">0</span>);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-revos-ink">Deal Activity — Q3 &amp; Q4 forecast</h2>
        <p className="text-[12.5px] text-revos-ink3">
          What&apos;s actually happening on the forecast deals · {data.scope} · last {data.window_days}d · as of {data.as_of}
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Tile label="Forecast opps" value={c.opps} />
        <Tile label="Q3 / Q4" value={`${c.q3} / ${c.q4}`} />
        <Tile label="Pipeline" value={money(c.pipe_usd)} />
        <Tile label="Stalled — no touch 30d" value={c.stalled} tone="crit" />
        <Tile label="Single-threaded" value={c.single_thread} tone="warn" />
        <Tile label="No next step" value={c.no_next_step} tone={c.no_next_step ? "warn" : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={rep} onChange={(e) => setRep(e.target.value)}
          className="rounded-md border border-revos-line bg-revos-panel px-3 py-1.5 text-[12.5px] text-revos-brand focus:outline-none focus:ring-2 focus:ring-revos-brand/30">
          <option value="">All reps</option>
          {reps.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <Chip on={qtr === "Q3"} onClick={() => setQtr((v) => (v === "Q3" ? "" : "Q3"))}>Q3</Chip>
        <Chip on={qtr === "Q4"} onClick={() => setQtr((v) => (v === "Q4" ? "" : "Q4"))}>Q4</Chip>
        <Chip on={stalledOnly} onClick={() => setStalledOnly((v) => !v)}>Stalled &gt;30d</Chip>
        <Chip on={singleOnly} onClick={() => setSingleOnly((v) => !v)}>Single-threaded</Chip>
        <Chip on={noNextOnly} onClick={() => setNoNextOnly((v) => !v)}>No next step</Chip>
      </div>

      <Card>
        <CardHead kick="Scorecard" title="Forecast deal activity"
          meta={`${rows.length} of ${c.opps} opps`} />
        <div className="overflow-x-auto p-4 pt-2">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
              <tr>
                <th className="pb-1.5 pr-3 text-left">Opportunity</th>
                <th className="pb-1.5 pr-3 text-left">Owner</th>
                <th className="pb-1.5 pr-3 text-center">Qtr</th>
                <th className="pb-1.5 pr-3 text-right">Amount</th>
                <th className="pb-1.5 pr-3 text-right">Email</th>
                <th className="pb-1.5 pr-3 text-right">Call</th>
                <th className="pb-1.5 pr-3 text-right">Mtg</th>
                <th className="pb-1.5 pr-3 text-right">Contacts</th>
                <th className="pb-1.5 pr-3 text-right">Last touch</th>
                <th className="pb-1.5 text-left">Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.opp_id} className="border-t border-revos-line hover:bg-revos-card">
                  <td className="max-w-[22rem] truncate py-1.5 pr-3">
                    <a href={r.sfdc_url} target="_blank" rel="noreferrer"
                      className="font-medium text-revos-brand hover:underline">{r.name || "(unnamed)"}</a>
                    <span className="ml-2 text-[10px] text-revos-ink3">{r.account} · {r.stage}</span>
                  </td>
                  <td className="py-1.5 pr-3 text-revos-ink2">{r.owner || "—"}</td>
                  <td className="py-1.5 pr-3 text-center text-revos-ink2">{r.quarter}</td>
                  <td className="py-1.5 pr-3 text-right font-medium tabular-nums text-revos-ink">{money(r.amount)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{cell(r.emails)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{cell(r.calls)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{cell(r.meetings)}</td>
                  <td className={clsx("py-1.5 pr-3 text-right tabular-nums",
                    r.single_thread ? "font-semibold text-revos-warn" : "text-revos-ink2")}>{r.contacts}</td>
                  <td className={clsx("py-1.5 pr-3 text-right tabular-nums",
                    (r.days_since === null || r.days_since > 30) ? "text-revos-crit" : "text-revos-ink3")}>
                    {r.days_since === null ? "never" : `${r.days_since}d`}
                  </td>
                  <td className="py-1.5">
                    <span className="inline-flex items-center gap-1">
                      {r.stalled && <Flag tone="crit">STALLED</Flag>}
                      {r.single_thread && <Flag tone="warn">SINGLE-THREAD</Flag>}
                      {r.no_next_step && <Flag tone="muted">NO NEXT STEP</Flag>}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={10} className="py-6 text-center text-[12.5px] text-revos-ink3">No forecast opps match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="max-w-4xl text-[11px] text-revos-ink3">
        Activity is Salesforce Tasks/Events logged <strong>on the opportunity</strong> over the last {data.window_days} days
        (email/call/meeting) — the deal-specific view, distinct from Account 360&apos;s whole-account engagement.
        <strong> Stalled</strong> = no touch on the deal in 30 days; <strong>single-threaded</strong> = fewer than 2
        contact roles. Click an opp to open it in Salesforce.
      </p>
    </div>
  );
}
