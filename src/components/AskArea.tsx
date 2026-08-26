"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  api,
  dateShort,
  type AgentResult,
  type AskChart,
  type AskResult,
} from "@/lib/api";
import { Card, CardHead, Dot } from "./ui";

// ---------------------------------------------------------------------------
// Ask — one box across the whole book, in two honest modes:
//   • Analytics (/ask): the question maps to ONE whitelisted metric, runs live
//     SFDC, and comes back as a grounded answer + the real data table + a bar.
//     Read-only. When it can't map, it says so and lists what it CAN answer.
//   • Agent (/agent): the flexible tool loop — reads across tools AND can STAGE a
//     Salesforce write at the human-approval gate (never writes in-loop).
// Both are viewer-scoped server-side. Each turn is independent (the engines hold
// no conversation memory), so the transcript is a log of grounded answers, not a
// chat thread — the copy never implies follow-up context.
// ---------------------------------------------------------------------------

type Mode = "analytics" | "agent";

type Turn =
  | { id: number; mode: "analytics"; q: string; state: "loading" | "ready" | "error"; data?: AskResult; error?: string }
  | { id: number; mode: "agent"; q: string; state: "loading" | "ready" | "error"; data?: AgentResult; error?: string };

const AGENT_STARTERS = [
  "Which of my deals are slipping?",
  "Who went quiet this week?",
  "Draft a follow-up for my top at-risk account",
  "Summarize what changed in my book today",
];

// Shown until the live catalog loads (and if the seed request fails). These map
// to the whitelisted metrics; the effect below replaces them with the engine's
// own answerable list so the chips stay grounded in what it can actually answer.
const ANALYTICS_FALLBACK = [
  "Win rate by revenue type",
  "Closed won by quarter",
  "Open pipeline by industry",
  "Overall win rate",
];

const MODE_COPY: Record<Mode, string> = {
  analytics: "Grounded in one live Salesforce metric — company-wide numbers, read-only. Per-rep detail is leadership-only.",
  agent: "The RevOS agent reads across your tools within your scope and can stage a Salesforce change at the approval gate — nothing writes until you approve.",
};

export function AskArea() {
  const [mode, setMode] = useState<Mode>("analytics");
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [analyticsStarters, setAnalyticsStarters] = useState<string[]>(ANALYTICS_FALLBACK);
  const nextId = useRef(1);

  // Replace the fallback chips with the engine's OWN answerable list (an empty
  // ask returns its suggestions), so the chips are exactly what it can answer —
  // never a promise it can't keep. If the seed fails, the fallback chips stand.
  useEffect(() => {
    let alive = true;
    api
      .ask("")
      .then((r) => {
        if (!alive) return;
        const s = (r.suggestions || []).slice(0, 6);
        if (s.length) setAnalyticsStarters(s);
      })
      .catch(() => { /* backend away — keep the fallback chips */ });
    return () => {
      alive = false;
    };
  }, []);

  const run = useCallback(
    (question: string, runMode: Mode) => {
      const text = question.trim();
      if (!text) return;
      const id = nextId.current++;
      const base = { id, q: text, state: "loading" as const };
      setTurns((prev) => [{ ...base, mode: runMode } as Turn, ...prev]);
      setQ("");

      const settle = (patch: Partial<Turn>) =>
        setTurns((prev) => prev.map((t) => (t.id === id ? ({ ...t, ...patch } as Turn) : t)));

      if (runMode === "analytics") {
        api
          .ask(text)
          .then((data) => settle({ state: "ready", data }))
          .catch((e) => settle({ state: "error", error: String(e?.message || e) }));
      } else {
        api
          .agent(text)
          .then((data) => settle({ state: "ready", data }))
          .catch((e) => settle({ state: "error", error: String(e?.message || e) }));
      }
    },
    [],
  );

  const starters = mode === "analytics" ? analyticsStarters : AGENT_STARTERS;

  return (
    <div>
      {/* Hero */}
      <div className="mx-auto max-w-[1280px] px-[22px] pb-1.5 pt-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-revos-brand">
          One question box, two grounded modes
        </div>
        <h1 className="mb-3 mt-1.5 text-[22px] font-semibold tracking-tight text-revos-ink">
          Ask in plain language, grounded in live Salesforce.
        </h1>

        {/* Mode toggle */}
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-revos-line2 bg-revos-panel p-0.5">
            {(["analytics", "agent"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={clsx(
                  "rounded-md px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                  mode === m ? "bg-revos-brand text-white" : "text-revos-ink2 hover:bg-revos-card",
                )}
              >
                {m === "analytics" ? "Analytics" : "Agent"}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-revos-ink3">{MODE_COPY[mode]}</span>
        </div>

        {/* Prompt box */}
        <div className="flex items-center gap-3 rounded-[11px] border-[1.5px] border-revos-brand bg-revos-panel px-[15px] py-3 shadow-ask focus-within:ring-2 focus-within:ring-revos-brand/40">
          <span className="text-base text-revos-brand" aria-hidden>✦</span>
          <input
            className="flex-1 bg-transparent text-[14px] text-revos-ink outline-none placeholder:text-revos-ink3"
            aria-label={mode === "analytics" ? "Ask a pipeline analytics question" : "Ask or tell the RevOS agent"}
            placeholder={
              mode === "analytics"
                ? "Ask a pipeline number… win rate by rev type · closed won by quarter · pipeline by stage"
                : "Ask or tell RevOS… which deals are slipping? · draft the follow-up · set the next step"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(q, mode)}
          />
          <button
            className="rounded-lg bg-revos-brand px-4 py-[7px] text-[13px] font-semibold text-white disabled:opacity-60"
            onClick={() => run(q, mode)}
            disabled={!q.trim()}
          >
            Ask
          </button>
        </div>

        {/* Starter chips */}
        {starters.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => run(s, mode)}
                className="rounded-[20px] border border-revos-line bg-revos-panel px-[11px] py-[5px] text-[11.5px] font-medium text-revos-ink2 hover:bg-revos-card"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="mx-auto mb-16 mt-3 flex max-w-[1280px] flex-col gap-4 px-[22px]">
        {turns.length === 0 ? (
          <Card className="p-6">
            <div className="text-[13px] font-semibold text-revos-ink">Ask your first question</div>
            <p className="mt-1.5 max-w-[640px] text-[12.5px] text-revos-ink2">
              {mode === "analytics"
                ? "Analytics maps your question to one live Salesforce metric and answers from the real numbers — no raw SQL. These are company-wide pipeline metrics; per-rep detail is leadership-only. Pick a starter above or type your own."
                : "Agent reads across your tools — within your scope — to answer, and can stage a Salesforce change for you to approve. Nothing writes until you approve it."}
            </p>
          </Card>
        ) : (
          turns.map((t) =>
            t.mode === "analytics" ? (
              <AnalyticsTurn key={t.id} t={t} onAsk={(s) => run(s, "analytics")} onEscalate={(s) => run(s, "agent")} />
            ) : (
              <AgentTurn key={t.id} t={t} />
            ),
          )
        )}
      </div>

      <div className="mx-auto max-w-[1280px] px-[22px] pb-10 text-[12px] text-revos-ink3">
        Answers run live. <b className="text-revos-ink2">Analytics</b> returns company-wide pipeline metrics
        (read-only; per-rep detail is leadership-only); the <b className="text-revos-ink2">Agent</b> works within
        your scope and stages any Salesforce change at the human-approval gate — nothing writes until you approve.
        Each question is answered fresh — the engines hold no memory between asks.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics turn — grounded metric answer + the real table + a bar. When the
// question can't map, shows the suggestions and offers to escalate to the agent.
// ---------------------------------------------------------------------------
function AnalyticsTurn({
  t,
  onAsk,
  onEscalate,
}: {
  t: Extract<Turn, { mode: "analytics" }>;
  onAsk: (s: string) => void;
  onEscalate: (s: string) => void;
}) {
  return (
    <Card>
      <TurnHead q={t.q} badge="Analytics" />
      {t.state === "loading" ? (
        <Body muted>Running the metric against live Salesforce…</Body>
      ) : t.state === "error" ? (
        <Body tone="error">{t.error}</Body>
      ) : t.data ? (
        <div className="px-4 py-3.5">
          <p className="text-[13.5px] leading-[1.55] text-revos-ink">{t.data.answer_text}</p>

          {t.data.metric ? (
            <>
              {t.data.chart_spec && t.data.table?.rows?.length ? (
                <MiniBar spec={t.data.chart_spec} rows={t.data.table.rows} />
              ) : null}
              {/* Gate on ROWS, not columns — a matched metric can return a fixed
                  column set with zero rows; the answer already says "no data". */}
              {t.data.table?.rows?.length ? <DataTable table={t.data.table} /> : null}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-revos-ink3">
                <span>
                  metric <b className="font-semibold text-revos-ink2">{humanizeCol(t.data.metric)}</b>
                </span>
                {t.data.source && <span>· source {t.data.source}</span>}
                {t.data.as_of && <span>· as of {dateShort(t.data.as_of)}</span>}
              </div>
            </>
          ) : (
            // No metric matched — surface what it CAN answer, plus an escalate.
            <div className="mt-3">
              {(t.data.suggestions || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(t.data.suggestions || []).map((s) => (
                    <button
                      key={s}
                      onClick={() => onAsk(s)}
                      className="rounded-[20px] border border-revos-line bg-revos-panel px-[11px] py-[5px] text-[11.5px] font-medium text-revos-ink2 hover:bg-revos-card"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => onEscalate(t.q)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-revos-line2 bg-revos-panel px-3.5 py-2 text-[12px] font-semibold text-revos-brand hover:bg-revos-card"
              >
                Ask the agent instead <span aria-hidden>→</span>
              </button>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Agent turn — the tool-loop answer with provenance: steps, which tools ran,
// and any writes staged at the approval gate. Degraded (proxy off-cluster) is
// its own amber state, not a hard error.
// ---------------------------------------------------------------------------
function AgentTurn({ t }: { t: Extract<Turn, { mode: "agent" }> }) {
  return (
    <Card>
      <TurnHead q={t.q} badge="Agent" />
      {t.state === "loading" ? (
        <Body muted>Reading your tools and working through it…</Body>
      ) : t.state === "error" ? (
        <Body tone="error">{t.error}</Body>
      ) : t.data ? (
        <div className="px-4 py-3.5">
          {t.data.degraded && (
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-lg border border-revos-warnwash bg-revos-warnwash px-3 py-1.5 text-[12px] text-revos-warn">
              <span>◔</span> Model service unreachable — no tools ran, nothing staged.
            </div>
          )}
          <p className="whitespace-pre-wrap text-[13.5px] leading-[1.55] text-revos-ink">{t.data.answer_text}</p>

          {/* Staged writes — the human gate */}
          {t.data.staged_writes?.length ? (
            <div className="mt-3 rounded-[9px] border border-revos-line border-l-[3px] border-l-revos-brand bg-revos-card px-3.5 py-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-revos-ink3">
                {t.data.staged_writes.length} write proposal{t.data.staged_writes.length === 1 ? "" : "s"} staged · not applied
              </div>
              <pre className="mt-1.5 overflow-x-auto font-sans text-[12px] leading-[1.5] text-revos-ink2">
                {JSON.stringify(t.data.staged_writes, null, 2)}
              </pre>
              <div className="mt-1.5 text-[11px] text-revos-ink3">Nothing writes to Salesforce until you approve.</div>
            </div>
          ) : null}

          {/* Provenance — steps + tools that ran */}
          {!t.data.degraded && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-revos-ink3">
                {t.data.iterations} step{t.data.iterations === 1 ? "" : "s"}
                {t.data.tool_calls?.length ? " ·" : ""}
              </span>
              {(t.data.tool_calls || []).map((tc, i) => (
                <span
                  key={`${tc.name}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-[20px] border border-revos-line bg-revos-card px-[9px] py-[3px] text-[11px] text-revos-ink2"
                  title={tc.ok ? "ran" : "failed / refused"}
                >
                  <Dot tier={tc.ok ? "lo" : "hi"} className="h-1.5 w-1.5" />
                  <span className="sr-only">{tc.ok ? "ran: " : "failed or refused: "}</span>
                  {humanizeCol(tc.name)}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
function TurnHead({ q, badge }: { q: string; badge: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-revos-line px-4 py-3">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-revos-ink3">You asked</div>
        <div className="mt-0.5 text-[13.5px] font-semibold text-revos-ink">{q}</div>
      </div>
      <span className="flex-none rounded-[20px] bg-revos-wash px-2.5 py-[3px] text-[11px] font-semibold text-revos-brand">
        {badge}
      </span>
    </div>
  );
}

function Body({ children, muted, tone }: { children: React.ReactNode; muted?: boolean; tone?: "error" }) {
  return (
    <div
      className={clsx(
        "px-4 py-4 text-[12.5px]",
        tone === "error" ? "text-revos-crit" : muted ? "text-revos-ink3" : "text-revos-ink2",
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A grounded data table — the numbers behind the answer.
// ---------------------------------------------------------------------------
function DataTable({ table }: { table: NonNullable<AskResult["table"]> }) {
  const { columns, rows } = table;
  return (
    <div className="mt-3 overflow-x-auto rounded-[9px] border border-revos-line">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-revos-card">
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-revos-ink2">
                {humanizeCol(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((r, i) => (
            <tr key={i} className="border-t border-revos-line">
              {columns.map((c) => (
                <td key={c} className="whitespace-nowrap px-3 py-[7px] text-revos-ink tabular-nums">
                  {fmtCell(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 50 && (
        <div className="border-t border-revos-line px-3 py-1.5 text-[11px] text-revos-ink3">
          Showing 50 of {rows.length} rows.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A minimal horizontal bar from the metric's default chart spec.
// ---------------------------------------------------------------------------
function MiniBar({ spec, rows }: { spec: NonNullable<AskChart>; rows: Array<Record<string, unknown>> }) {
  // The backend emits both "hbar" and "bar" (vertical); we draw horizontal bars
  // for either — magnitude reads the same regardless of the server's orientation.
  if ((spec.type !== "hbar" && spec.type !== "bar") || !spec.x || !spec.y) return null;
  const pts = rows
    // A null/blank value is "no data" (the server deliberately returns null, not
    // 0, for e.g. an empty win/loss denominator). Map it to NaN so the finite
    // filter drops it — never render it as a fabricated 0, matching the table's "—".
    .map((r) => {
      const raw = r[spec.y];
      return { label: String(r[spec.x] ?? "—"), value: raw == null || raw === "" ? NaN : Number(raw) };
    })
    .filter((p) => Number.isFinite(p.value));
  if (pts.length === 0) return null;
  const max = Math.max(...pts.map((p) => Math.abs(p.value)), 1);
  const pct = spec.unit === "percent";
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {pts.slice(0, 12).map((p, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="w-[130px] shrink-0 truncate text-[11.5px] text-revos-ink2" title={p.label}>
            {p.label}
          </span>
          <span className="relative h-[16px] flex-1 overflow-hidden rounded bg-revos-card">
            <span
              className="absolute inset-y-0 left-0 rounded bg-revos-brand"
              style={{ width: `${Math.max(2, (Math.abs(p.value) / max) * 100)}%` }}
            />
          </span>
          <span className="w-[54px] shrink-0 text-right text-[11.5px] font-semibold tabular-nums text-revos-ink">
            {pct ? `${p.value.toFixed(1)}%` : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small formatters.
// ---------------------------------------------------------------------------
const COL_LABELS: Record<string, string> = {
  win_rate_pct: "Win rate %",
  nnacv: "NNACV",
  net_new_acv_y1: "Net New ACV Y1",
  n: "N",
};
function humanizeCol(c: string): string {
  if (COL_LABELS[c]) return COL_LABELS[c];
  return c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
function fmtCell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") {
    return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  return String(v);
}
