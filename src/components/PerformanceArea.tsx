"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  api,
  currencyFmt,
  dateShort,
  type CsmScorecard,
  type FunnelVelocity,
  type Rag,
  type RepScorecard,
  type RiskTier,
  type ScoreCell,
  type ScoreUnit,
  type Viewer,
  type XdrScorecard,
} from "@/lib/api";
import { Card, CardHead, Dot } from "./ui";

type Loadable<T> = { state: "loading" | "ready" | "error"; data: T | null; error?: string };
const idle = <T,>(): Loadable<T> => ({ state: "loading", data: null });

// ---------------------------------------------------------------------------
// Performance — the numbers Sharon's deck is built on, scoped to the viewer.
// /me decides which scorecard is theirs (AE/manager/GM → the rep grid; an XDR →
// the XDR grid; a CSM → the CSM grid), plus pipeline velocity for opp owners.
// Leadership additionally sees the XDR + CSM grids. All scoping is enforced
// server-side; this only decides what to REQUEST. The full scorecard app (linked
// out) has the deep tabs — this is the one-view summary.
// ---------------------------------------------------------------------------

export function PerformanceArea() {
  const [me, setMe] = useState<Loadable<Viewer>>({ state: "loading", data: null });

  useEffect(() => {
    let alive = true;
    api
      .me()
      .then((v) => alive && setMe({ state: "ready", data: v }))
      .catch((e) => alive && setMe({ state: "error", data: null, error: String(e?.message || e) }));
    return () => {
      alive = false;
    };
  }, []);

  if (me.state === "loading") {
    return <Shell><Note>Resolving your access…</Note></Shell>;
  }
  if (me.state === "error" || !me.data) {
    return (
      <Shell>
        <Card className="p-5">
          <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t resolve your access</div>
          <p className="mt-1.5 max-w-[620px] text-[12.5px] text-revos-ink2">{accessReason(me.error || "")}</p>
        </Card>
      </Shell>
    );
  }

  return <Resolved me={me.data} />;
}

// ---------------------------------------------------------------------------
function Resolved({ me }: { me: Viewer }) {
  const isXdr = me.is_xdr === true;
  const isCsm = me.is_csm === true;
  const isLeader = me.role === "manager" || me.role === "gm";
  // An AE seat with an empty book: every opp-based card is definitionally empty,
  // so say why instead of rendering rows of zeros (Tommy/Adam reported this as a
  // bug three times in the scorecard app before it was explained).
  const emptyBook = me.role === "ae" && !isXdr && !isCsm && me.book != null && me.book.open_opps === 0;
  const segment = me.role === "gm" ? me.segment ?? undefined : undefined;

  // Which scorecard is the viewer's own?
  const primary: "rep" | "xdr" | "csm" = isXdr ? "xdr" : isCsm ? "csm" : "rep";
  const showVelocity = !isXdr && !isCsm && !emptyBook; // opp-owning scopes only
  const showLeaderGrids = isLeader; // leadership also sees XDR + CSM

  const [rep, setRep] = useState<Loadable<RepScorecard>>(idle);
  const [xdr, setXdr] = useState<Loadable<XdrScorecard>>(idle);
  const [csm, setCsm] = useState<Loadable<CsmScorecard>>(idle);
  const [vel, setVel] = useState<Loadable<FunnelVelocity>>(idle);

  useEffect(() => {
    let alive = true;
    const guard = <T,>(setter: (l: Loadable<T>) => void) => ({
      ok: (data: T) => alive && setter({ state: "ready", data }),
      err: (e: unknown) => alive && setter({ state: "error", data: null, error: String((e as Error)?.message || e) }),
    });

    if ((primary === "rep" || showLeaderGrids) && !emptyBook) {
      const g = guard(setRep);
      api.repScorecard({ segment }).then(g.ok).catch(g.err);
    }
    if (primary === "xdr" || showLeaderGrids) {
      const g = guard(setXdr);
      api.xdrScorecard().then(g.ok).catch(g.err);
    }
    if (primary === "csm" || showLeaderGrids) {
      const g = guard(setCsm);
      api.csmScorecard().then(g.ok).catch(g.err);
    }
    if (showVelocity) {
      const g = guard(setVel);
      api.funnelVelocity({ segment }).then(g.ok).catch(g.err);
    }
    return () => {
      alive = false;
    };
  }, [primary, showLeaderGrids, showVelocity, emptyBook, segment]);

  return (
    <Shell>
      <ScopeBanner me={me} />

      {emptyBook ? (
        <Card className="border-revos-warn/40 bg-revos-warnwash p-5">
          <div className="text-[13px] font-semibold text-revos-ink">RevOS doesn&apos;t have a seat that matches your role yet.</div>
          <p className="mt-1.5 text-[12.5px] text-revos-ink2">
            You&apos;re scoped to <span className="font-mono text-revos-ink">{me.owner}</span>, who owns no open
            opportunities
            {me.book?.open_leads
              ? ` (but ${me.book.open_leads.toLocaleString()} open lead${me.book.open_leads === 1 ? "" : "s"})`
              : ""}
            , so the scorecard would be rows of zeros. This is a question of access, not a broken view — ask Malik for
            the seat that matches what you do. The team-wide views live in the full scorecard.
          </p>
          <FullScorecardLink />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* The viewer's own scorecard */}
          {primary === "rep" && (
            <ScorecardGrid
              kicker={isLeader ? "AE Scorecard" : "Your scorecard"}
              title={me.role === "ae" ? "Your metrics vs target" : "The team vs target"}
              loadable={rep}
              toGrid={repToGrid}
            />
          )}
          {primary === "xdr" && (
            <ScorecardGrid kicker="XDR Scorecard" title="Prospecting vs target" loadable={xdr} toGrid={xdrToGrid} />
          )}
          {primary === "csm" && (
            <ScorecardGrid kicker="CSM Scorecard" title="Strategic book vs target" loadable={csm} toGrid={csmToGrid} />
          )}

          {/* Pipeline velocity — open pipeline by stage */}
          {showVelocity && <VelocityCard loadable={vel} />}

          {/* Leadership also sees the XDR + CSM grids in one place. These are
              company-wide (the endpoints take no segment), so they're tagged as
              such — a GM's segment scope does NOT apply to them. */}
          {showLeaderGrids && primary !== "xdr" && (
            <ScorecardGrid kicker="XDR Scorecard" title="Prospecting vs target" loadable={xdr} toGrid={xdrToGrid} companyWide />
          )}
          {showLeaderGrids && primary !== "csm" && (
            <ScorecardGrid kicker="CSM Scorecard" title="Strategic book vs target" loadable={csm} toGrid={csmToGrid} companyWide />
          )}

          <Card className="p-4">
            <div className="text-[12.5px] text-revos-ink2">
              This is the one-view summary. The full scorecard has the deep tabs — Account 360, Deal Activity, Call
              Blitz, Meetings Booked, the funnel, and drill-into-opps.
            </div>
            <FullScorecardLink />
          </Card>
        </div>
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// A normalized grid shape every scorecard maps into.
// ---------------------------------------------------------------------------
type GridMetric = { key: string; label: string; target: number | null; unit: ScoreUnit; graded: boolean };
type GridColumn = { name: string; sub?: string; cells: Record<string, ScoreCell> };
type Grid = { metrics: GridMetric[]; columns: GridColumn[]; asOf?: string | null; source?: string | null; note?: string };

// asOf is the REAL data-freshness date (data_as_of) only — never the read-time
// `as_of`, which is always "now" and would fake freshness (the backend returns
// data_as_of=null on purpose for the hand-maintained CSM fields). null → the
// grid header says "freshness unknown", matching the scorecard app.
function repToGrid(s: RepScorecard): Grid {
  return {
    metrics: s.metrics.map((m) => ({ key: m.key, label: m.label, target: m.target, unit: m.unit, graded: m.grade !== false })),
    columns: s.reps.map((r) => ({ name: r.seller, sub: `${r.open_opps} open`, cells: r.cells })),
    asOf: s.data_as_of ?? null, source: s.source, note: s.note,
  };
}
function xdrToGrid(s: XdrScorecard): Grid {
  return {
    metrics: s.metrics.map((m) => ({ key: m.key, label: m.label, target: m.target, unit: m.unit as ScoreUnit, graded: m.grade !== false && m.dir !== "info" })),
    columns: s.xdrs.map((x) => ({ name: x.name, cells: x.cells })),
    // XdrScorecard carries no data_as_of, and its as_of is read-time — so we
    // don't claim a freshness date for it.
    asOf: null, note: s.note,
  };
}
function csmToGrid(s: CsmScorecard): Grid {
  return {
    metrics: s.metrics.map((m) => ({ key: m.key, label: m.label, target: m.target, unit: m.unit, graded: m.dir !== "info" })),
    columns: s.csms.map((c) => ({ name: c.name, sub: `${c.accounts} accts`, cells: c.cells })),
    asOf: s.data_as_of ?? null, source: s.source, note: s.note,
  };
}

// ---------------------------------------------------------------------------
function ScorecardGrid<T>({
  kicker,
  title,
  loadable,
  toGrid,
  companyWide = false,
}: {
  kicker: string;
  title: string;
  loadable: Loadable<T>;
  toGrid: (data: T) => Grid;
  companyWide?: boolean;
}) {
  const grid = useMemo(() => (loadable.data ? toGrid(loadable.data) : null), [loadable.data, toGrid]);

  const meta =
    loadable.state === "loading"
      ? "loading…"
      : grid
        ? [companyWide ? "company-wide" : null, grid.asOf ? `as of ${dateShort(grid.asOf)}` : "freshness unknown"]
            .filter(Boolean)
            .join(" · ")
        : undefined;

  return (
    <Card>
      <CardHead kick={kicker} title={title} meta={meta} />
      {loadable.state === "loading" ? (
        <Empty>Loading the scorecard…</Empty>
      ) : loadable.state === "error" ? (
        <Empty tone="error">{loadable.error}</Empty>
      ) : !grid || grid.columns.length === 0 || grid.metrics.length === 0 ? (
        <Empty>No scorecard rows in scope yet.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-revos-line bg-revos-card">
                <th className="sticky left-0 z-[1] whitespace-nowrap bg-revos-card px-3 py-2 text-left font-semibold text-revos-ink2">
                  Metric
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-revos-ink3">Target</th>
                {grid.columns.map((c) => (
                  <th key={c.name} className="whitespace-nowrap px-3 py-2 text-right font-semibold text-revos-ink">
                    {c.name}
                    {c.sub && <span className="block text-[10.5px] font-normal text-revos-ink3">{c.sub}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.metrics.map((m) => (
                <tr key={m.key} className="border-t border-revos-line">
                  <td className="sticky left-0 z-[1] whitespace-nowrap bg-revos-panel px-3 py-[7px] font-medium text-revos-ink">
                    {m.label}
                  </td>
                  <td className="whitespace-nowrap px-3 py-[7px] text-right text-revos-ink3 tabular-nums">
                    {m.target != null ? fmtValue(m.target, m.unit) : "—"}
                  </td>
                  {grid.columns.map((c) => (
                    <CellTd key={c.name} cell={c.cells[m.key]} unit={m.unit} graded={m.graded} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {grid.note && <div className="border-t border-revos-line px-3 py-2 text-[11px] text-revos-ink3">{grid.note}</div>}
        </div>
      )}
    </Card>
  );
}

function CellTd({ cell, unit, graded }: { cell: ScoreCell | undefined; unit: ScoreUnit; graded: boolean }) {
  if (!cell || cell.value == null) {
    return <td className="whitespace-nowrap px-3 py-[7px] text-right text-revos-ink3 tabular-nums">—</td>;
  }
  return (
    <td className="whitespace-nowrap px-3 py-[7px] text-right tabular-nums">
      <span className="inline-flex items-center justify-end gap-1.5">
        {graded && <Dot tier={ragTier(cell.rag)} className="h-[7px] w-[7px]" />}
        <span className="font-semibold text-revos-ink">{fmtValue(cell.value, unit)}</span>
        {typeof cell.delta === "number" && cell.delta !== 0 && (
          <span className="text-[10.5px] text-revos-ink3" title={cell.prev_week ? `vs ${cell.prev_week}` : undefined}>
            {cell.delta > 0 ? "▲" : "▼"}
            {fmtValue(Math.abs(cell.delta), unit)}
          </span>
        )}
      </span>
    </td>
  );
}

// ---------------------------------------------------------------------------
// Pipeline velocity — open pipeline by stage (count, $, days sat there).
// ---------------------------------------------------------------------------
function VelocityCard({ loadable }: { loadable: Loadable<FunnelVelocity> }) {
  const v = loadable.data;
  const maxAmt = useMemo(
    () => (v ? Math.max(...v.stages.map((s) => Number(s.amount_usd) || 0), 1) : 1),
    [v],
  );
  return (
    <Card>
      <CardHead
        kick="Pipeline velocity"
        title="Open pipeline by stage"
        meta={
          v
            ? `${v.total_count} open · ${currencyFmt(Number(v.total_amount_usd))}`
            : loadable.state === "loading"
              ? "loading…"
              : undefined
        }
      />
      {loadable.state === "loading" ? (
        <Empty>Loading pipeline…</Empty>
      ) : loadable.state === "error" ? (
        <Empty tone="error">{loadable.error}</Empty>
      ) : !v || v.stages.length === 0 ? (
        <Empty>No open pipeline in scope.</Empty>
      ) : (
        <div className="p-4">
          <div className="overflow-x-auto">
            <div className="flex min-w-[440px] flex-col gap-2">
          {v.stages.map((s) => {
            const amt = Number(s.amount_usd) || 0;
            return (
              <div key={s.stage} className="flex items-center gap-3">
                <span className="w-[104px] shrink-0 truncate text-[12px] font-medium text-revos-ink" title={s.stage}>
                  {s.stage}
                </span>
                <span className="relative h-[20px] flex-1 overflow-hidden rounded bg-revos-card">
                  <span
                    className="absolute inset-y-0 left-0 rounded bg-revos-brand"
                    style={{ width: `${Math.max(2, (amt / maxAmt) * 100)}%` }}
                  />
                </span>
                <span className="w-[68px] shrink-0 text-right text-[12px] font-semibold tabular-nums text-revos-ink">
                  {currencyFmt(amt)}
                </span>
                <span className="w-[52px] shrink-0 text-right text-[11px] tabular-nums text-revos-ink3">
                  {s.count} {s.count === 1 ? "deal" : "deals"}
                </span>
                <span className="w-[92px] shrink-0 text-right text-[11px] tabular-nums text-revos-ink3">
                  {s.median_days_in_stage != null ? `${Math.round(s.median_days_in_stage)}d in stage` : "—"}
                </span>
              </div>
            );
          })}
            </div>
          </div>
          {v.note && <div className="mt-2 text-[11px] text-revos-ink3">{v.note}</div>}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
function ScopeBanner({ me }: { me: Viewer }) {
  const scope =
    me.role === "manager"
      ? "the whole team"
      : me.role === "gm"
        ? `the ${me.segment || "your"} segment`
        : me.is_xdr
          ? "your prospecting activity"
          : me.is_csm
            ? "your strategic book"
            : "your book";
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-revos-ink2">
      <span className="rounded-[20px] bg-revos-wash px-2.5 py-[3px] text-[11px] font-semibold text-revos-brand">
        {me.role === "manager" ? "Leadership" : me.role === "gm" ? "GM" : me.is_xdr ? "XDR" : me.is_csm ? "CSM" : "AE"}
      </span>
      <span>
        Scoped to <b className="text-revos-ink">{scope}</b>
        {me.owner && me.role === "ae" && !me.is_xdr && !me.is_csm ? <> · {me.owner}</> : null}. Reads run live and are
        scoped server-side
        {me.role === "gm" ? <>; the XDR and CSM grids below are company-wide, not limited to your segment</> : null}.
      </span>
    </div>
  );
}

function FullScorecardLink() {
  return (
    <a
      href="/scorecard"
      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-revos-line2 bg-revos-panel px-4 py-2 text-[12.5px] font-semibold text-revos-brand hover:bg-revos-card"
    >
      Open the full scorecard <span aria-hidden>→</span>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Layout + formatters.
// ---------------------------------------------------------------------------
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mx-auto max-w-[1280px] px-[22px] pb-1.5 pt-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-revos-brand">
          The numbers, scoped to you
        </div>
        <h1 className="mb-3.5 mt-1.5 text-[22px] font-semibold tracking-tight text-revos-ink">Performance</h1>
      </div>
      <div className="mx-auto mb-16 max-w-[1280px] px-[22px]">{children}</div>
    </div>
  );
}

function ragTier(rag: Rag): RiskTier {
  // green = good, amber = watch, red = bad, na = neutral. Maps onto the shared
  // Dot scale (lo=green, md=amber, hi=red, na=grey).
  return rag === "green" ? "lo" : rag === "amber" ? "md" : rag === "red" ? "hi" : "na";
}

function fmtValue(v: number, unit: ScoreUnit): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (unit === "usd") return currencyFmt(n);
  if (unit === "pct") return `${n % 1 === 0 ? n : n.toFixed(1)}%`;
  if (unit === "days") return `${Math.round(n)}d`;
  return n.toLocaleString();
}

function Empty({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  return (
    <div className={clsx("px-4 py-6 text-[12.5px]", tone === "error" ? "text-revos-crit" : "text-revos-ink3")}>
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="px-1 py-4 text-[13px] text-revos-ink3">{children}</div>;
}

// Turn a failed /me into something the reader can act on (mirrors the scorecard
// app's accessReason — a typo, a Salesforce outage, and being off the VPN are
// three different problems that used to read identically).
function accessReason(err: string): string {
  if (err.includes("403"))
    return "That address isn't recognized as an Adlib account, so RevOS can't resolve your scope. Check it for a typo — it needs to be your work email, not a personal one.";
  if (err.includes("503"))
    return "RevOS can't reach Salesforce right now, so it can't resolve your access. That's a backend problem, not your account — try again in a few minutes.";
  if (err.includes("401"))
    return "RevOS didn't get an identity for this session. Append ?email=you@adlibsoftware.com to the URL to identify yourself.";
  return "RevOS couldn't reach the server. Check that you're on the VPN — the API is internal-only — then try again.";
}
