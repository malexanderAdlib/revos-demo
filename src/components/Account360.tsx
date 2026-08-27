"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { api, ragToTier, type Account360 as A360 } from "@/lib/api";
import { Card, CardHead, Dot } from "./ui";

// Account 360 (Sharon/Chris 8/6) — ported from the scorecard app into the
// Scorecard tab. Activity evidence per seller-owned account: contacts +
// email/call/LinkedIn/meeting touches over a trailing window, last-touch
// recency, and STALL / SINGLE-THREAD flags for forecast-call inspection.
// Touches/wk (Sharon 8/27) normalizes total touches to a weekly cadence.
// Scope is server-enforced by role (AE = own book, GM = industry, manager = all).

type Loadable = { state: "loading" | "ready" | "error"; data: A360 | null; error?: string };

const money = (v: number): string =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v > 0 ? `$${Math.round(v / 1e3)}K` : "—";

function Tile({ label, value, tone }: { label: string; value: number | string; tone?: "crit" | "warn" }) {
  return (
    <div className="min-w-[7rem] rounded-xl border border-revos-line bg-revos-panel px-3.5 py-2.5 shadow-card">
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

export function Account360View() {
  const [ld, setLd] = useState<Loadable>({ state: "loading", data: null });
  const [openOnly, setOpenOnly] = useState(true);   // start on the forecast set
  const [stalledOnly, setStalledOnly] = useState(false);
  const [singleOnly, setSingleOnly] = useState(false);
  const [inQtrOnly, setInQtrOnly] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    api.account360()
      .then((d) => alive && setLd({ state: "ready", data: d }))
      .catch((e) => alive && setLd({ state: "error", data: null, error: String((e as Error)?.message || e) }));
    return () => { alive = false; };
  }, []);

  const data = ld.data;
  const perWeek = (r: { touches: number }) =>
    data ? (r.touches * 7) / data.window_days : 0;

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((r) =>
      (!openOnly || r.open_opp_count > 0) &&
      (!stalledOnly || r.stalled) &&
      (!singleOnly || r.single_thread) &&
      (!inQtrOnly || r.bucket === "in_quarter") &&
      (!q || (r.name || "").toLowerCase().includes(q) || (r.owner || "").toLowerCase().includes(q)));
  }, [data, openOnly, stalledOnly, singleOnly, inQtrOnly, search]);

  if (ld.state === "loading") {
    return <Card className="p-6"><span className="text-[12.5px] text-revos-ink3">Loading account activity…</span></Card>;
  }
  if (ld.state === "error" || !data) {
    return (
      <Card className="p-5">
        <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load Account 360</div>
        <div className="mt-1 text-[12.5px] text-revos-ink2">{ld.error}</div>
      </Card>
    );
  }

  const c = data.counts;
  const cell = (n: number) => (n > 0 ? String(n) : <span className="text-revos-ink3">0</span>);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-revos-ink">Account 360</h2>
        <p className="text-[12.5px] text-revos-ink3">
          Activity evidence per seller-owned account · {data.scope} · last {data.window_days}d · as of {data.as_of}
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Tile label="Seller accounts" value={c.accounts} />
        <Tile label="With open pipe" value={c.with_open_pipe} />
        <Tile label="Stalled — open deals" value={c.stalled_with_pipe} tone="crit" />
        <Tile label="Single-threaded — open deals" value={c.single_thread_with_pipe} tone="warn" />
        <Tile label={`No touch in ${data.window_days}d`} value={c.no_touch_window} />
        <Tile label="Closing this quarter" value={c.in_quarter} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip on={openOnly} onClick={() => setOpenOnly((v) => !v)}>Open pipeline only</Chip>
        <Chip on={stalledOnly} onClick={() => setStalledOnly((v) => !v)}>Stalled &gt;30d</Chip>
        <Chip on={singleOnly} onClick={() => setSingleOnly((v) => !v)}>Single-threaded</Chip>
        <Chip on={inQtrOnly} onClick={() => setInQtrOnly((v) => !v)}>Closing this quarter</Chip>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search account or owner…"
          className="ml-auto w-64 rounded-md border border-revos-line px-3 py-1.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-revos-brand/30"
        />
      </div>

      <Card>
        <CardHead kick="Scorecard" title="Account activity"
          meta={`${rows.length} of ${c.accounts} accounts`} />
        <div className="overflow-x-auto p-4 pt-2">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.06em] text-revos-ink3">
              <tr>
                <th className="pb-1.5 pr-3 text-left">Account</th>
                <th className="pb-1.5 pr-3 text-left">Owner</th>
                <th className="pb-1.5 pr-3 text-right">Open pipe</th>
                <th className="pb-1.5 pr-3 text-right">Contacts</th>
                <th className="pb-1.5 pr-3 text-right">Email</th>
                <th className="pb-1.5 pr-3 text-right">Call</th>
                <th className="pb-1.5 pr-3 text-right">LinkedIn</th>
                <th className="pb-1.5 pr-3 text-right">Mtgs</th>
                <th className="pb-1.5 pr-3 text-right">Touches/wk</th>
                <th className="pb-1.5 pr-3 text-right">Last touch</th>
                <th className="pb-1.5 text-left">Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.account_id} className="border-t border-revos-line hover:bg-revos-card">
                  <td className="max-w-[16rem] truncate py-1.5 pr-3">
                    <a href={r.sfdc_url} target="_blank" rel="noreferrer"
                      className="font-medium text-revos-brand hover:underline">{r.name || "(unnamed)"}</a>
                    {r.industry && <span className="ml-2 text-[10px] text-revos-ink3">{r.industry}</span>}
                  </td>
                  <td className="py-1.5 pr-3 text-revos-ink2">{r.owner || "—"}</td>
                  <td className="py-1.5 pr-3 text-right font-medium tabular-nums text-revos-ink">{money(r.open_amount)}</td>
                  <td className={clsx("py-1.5 pr-3 text-right tabular-nums",
                    r.single_thread ? "font-semibold text-revos-warn" : "text-revos-ink2")}>{r.contacts}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{cell(r.emails)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{cell(r.calls)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{cell(r.linkedin)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-revos-ink2">{cell(r.meetings)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums" title={`${r.touches} touches in ${data.window_days} days`}>
                    {r.touches > 0
                      ? <span className="font-semibold text-revos-brand">{perWeek(r).toFixed(1)}</span>
                      : <span className="text-revos-ink3">0.0</span>}
                  </td>
                  <td className={clsx("py-1.5 pr-3 text-right tabular-nums",
                    (r.days_since === null || r.days_since > 30) ? "text-revos-crit" : "text-revos-ink3")}>
                    {r.days_since === null ? "never" : `${r.days_since}d`}
                  </td>
                  <td className="py-1.5">
                    <span className="inline-flex items-center gap-1">
                      {r.rag && <Dot tier={ragToTier(r.rag)} className="h-2 w-2" />}
                      {r.stalled && <Flag tone="crit">STALLED</Flag>}
                      {r.single_thread && <Flag tone="warn">SINGLE-THREAD</Flag>}
                      {r.bucket === "in_quarter" && <Flag tone="good">IN-QTR</Flag>}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={11} className="py-6 text-center text-[12.5px] text-revos-ink3">No accounts match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="max-w-4xl text-[11px] text-revos-ink3">
        Touches are Salesforce Tasks/Events over the last {data.window_days} days (LinkedIn counts Regie&apos;s
        connection-request and message steps). <strong>Touches/wk</strong> normalizes that total to a weekly
        cadence. <strong>Stalled</strong> = no logged touch in 30 days; <strong>single-threaded</strong> = 2 or
        fewer contacts. Click an account name to open it in Salesforce.
      </p>
    </div>
  );
}

function Flag({ tone, children }: { tone: "crit" | "warn" | "good"; children: React.ReactNode }) {
  return (
    <span className={clsx(
      "rounded px-1.5 py-0.5 text-[10px] font-semibold",
      tone === "crit" && "bg-revos-critwash text-revos-crit",
      tone === "warn" && "bg-revos-warnwash text-revos-warn",
      tone === "good" && "bg-revos-goodwash text-revos-good")}>
      {children}
    </span>
  );
}
