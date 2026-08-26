"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  api,
  currencyFmt,
  dateShort,
  eventLabel,
  eventSource,
  ragToTier,
  severityToTier,
  tierLabel,
  type Account,
  type ChangeEvent,
} from "@/lib/api";
import { Card, CardHead, Dot, Pill } from "./ui";

type Loadable<T> = { state: "loading" | "ready" | "error"; data: T | null; error?: string };

// ---------------------------------------------------------------------------
// Home — the morning landing. The ranked cross-tool nudge feed (today's
// change-events, viewer-scoped) plus the day's priority tiles and the at-risk
// book. Every account row deep-links into the Accounts area via onOpenAccount.
// Runs on the exact same /pipeline engine as Accounts — change-events +
// accounts — so the two surfaces never disagree.
// ---------------------------------------------------------------------------

export function HomeArea({ onOpenAccount }: { onOpenAccount: (id: string) => void }) {
  const [events, setEvents] = useState<Loadable<ChangeEvent[]>>({ state: "loading", data: null });
  const [accounts, setAccounts] = useState<Loadable<Account[]>>({ state: "loading", data: null });

  useEffect(() => {
    let alive = true;
    api
      .changeEvents()
      .then((r) => alive && setEvents({ state: "ready", data: r.events }))
      .catch((e) => alive && setEvents({ state: "error", data: null, error: String(e?.message || e) }));
    api
      .accounts({ limit: 500 })
      .then((rows) => alive && setAccounts({ state: "ready", data: rows }))
      .catch((e) => alive && setAccounts({ state: "error", data: null, error: String(e?.message || e) }));
    return () => {
      alive = false;
    };
  }, []);

  const evs = events.data || [];
  const acctById = useMemo(() => {
    const m = new Map<string, Account>();
    for (const a of accounts.data || []) m.set(a.sfdc_account_id, a);
    return m;
  }, [accounts.data]);

  // Priority counts off today's ranked feed + the book.
  const counts = useMemo(() => {
    let attention = 0;
    let slipping = 0;
    let quiet = 0;
    for (const e of evs) {
      if (e.severity >= 3) attention++;                                   // high / critical
      if (e.event_type === "stage_slip" || e.event_type === "close_date_push") slipping++;
      if (e.event_type === "activity_quiet") quiet++;
    }
    const atRisk = (accounts.data || []).filter((a) => ragToTier(a.rag_status) === "hi").length;
    return { attention, slipping, quiet, atRisk };
  }, [evs, accounts.data]);

  // The detected_date the feed is stamped with (all rows share it).
  const detected = evs[0]?.detected_date || null;
  const atRiskAccounts = useMemo(
    () => (accounts.data || []).filter((a) => ragToTier(a.rag_status) === "hi").slice(0, 8),
    [accounts.data],
  );

  const loading = events.state === "loading" || accounts.state === "loading";
  const hardError = events.state === "error" && accounts.state === "error";

  return (
    <div>
      <Greeting
        signalCount={evs.length}
        attention={counts.attention}
        detected={detected}
        loading={loading}
        errored={events.state === "error"}
      />

      <div className="mx-auto max-w-[1280px] px-[22px] pb-16">
        {hardError && (
          <Card className="p-4">
            <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load your morning brief</div>
            <div className="mt-1 text-[12.5px] text-revos-ink2">{events.error || accounts.error}</div>
            <div className="mt-2 text-[12px] text-revos-ink3">
              If this says 401/403, append <code>?email=you@adlibsoftware.com</code> to the URL to identify yourself.
            </div>
          </Card>
        )}

        {!hardError && (
          <>
            {/* Priority tiles */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Need attention" value={counts.attention} tone="crit" hint="high-severity signals today" loading={events.state === "loading"} />
              <StatTile label="Slipping" value={counts.slipping} tone="warn" hint="stage slips + pushed close dates" loading={events.state === "loading"} />
              <StatTile label="Gone quiet" value={counts.quiet} tone="warn" hint="past the 14-day activity line" loading={events.state === "loading"} />
              <StatTile label="At-risk accounts" value={counts.atRisk} tone="crit" hint="red on the health rollup" loading={accounts.state === "loading"} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
              {/* Today's priorities — the ranked nudge feed */}
              <Card>
                <CardHead
                  kick="Today's priorities"
                  title="What changed since yesterday"
                  meta={
                    events.state === "ready"
                      ? `${evs.length} ${evs.length === 1 ? "signal" : "signals"}${detected ? ` · ${dateShort(detected)}` : ""}`
                      : "ranked"
                  }
                />
                {events.state === "loading" ? (
                  <Empty>Loading today&apos;s signals…</Empty>
                ) : events.state === "error" ? (
                  <Empty tone="error">{events.error}</Empty>
                ) : evs.length === 0 ? (
                  <Empty>
                    Nothing moved in your book today. The feed fills from the daily Salesforce state diff — a stage
                    slip, a pushed close date, a deal going quiet — the moment it happens.
                  </Empty>
                ) : (
                  evs.slice(0, 14).map((e, i) => (
                    <FeedRow
                      key={`${e.event_type}-${e.sfdc_opportunity_id}-${i}`}
                      e={e}
                      account={e.sfdc_account_id ? acctById.get(e.sfdc_account_id) || null : null}
                      onOpen={onOpenAccount}
                    />
                  ))
                )}
              </Card>

              {/* At-risk book */}
              <Card className="self-start">
                <CardHead kick="Your at-risk book" meta={`${counts.atRisk} red`} />
                {accounts.state === "loading" ? (
                  <Empty>Loading your book…</Empty>
                ) : atRiskAccounts.length === 0 ? (
                  <Empty>No accounts are red right now.</Empty>
                ) : (
                  atRiskAccounts.map((a) => (
                    <button
                      key={a.sfdc_account_id}
                      onClick={() => onOpenAccount(a.sfdc_account_id)}
                      className="flex w-full items-center gap-3 border-t border-revos-line px-4 py-2.5 text-left first:border-t-0 hover:bg-revos-card"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-revos-ink">
                          {a.account_name || "—"}
                        </span>
                        <span className="text-[11.5px] text-revos-ink3">
                          {[a.adlib_industry || a.industry, a.account_owner].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                      <Pill tier="hi">{tierLabel("hi")}</Pill>
                    </button>
                  ))
                )}
              </Card>
            </div>

            <div className="mt-4 text-[12px] text-revos-ink3">
              Home runs on the same daily Salesforce state-diff and warm-context engine as Accounts. Open any
              signal to land in that account&apos;s deep-dive — every read is scoped to your book; nothing writes
              to Salesforce until you approve.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Greeting({
  signalCount,
  attention,
  detected,
  loading,
  errored,
}: {
  signalCount: number;
  attention: number;
  detected: string | null;
  loading: boolean;
  errored: boolean;
}) {
  // Time-of-day greeting (browser-local; this is a client component, not a
  // workflow script, so new Date() is fine here).
  const hour = new Date().getHours();
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  // Never claim "you're clear" when the feed didn't load — signalCount is 0 on
  // an error too, and the two mean opposite things.
  const summary = loading
    ? "Pulling today's signals across your book…"
    : errored
      ? "Couldn't reach your book right now — details below."
      : signalCount === 0
        ? "Nothing moved in your book today — you're clear."
        : attention > 0
          ? `${signalCount} ${signalCount === 1 ? "signal" : "signals"} today · ${attention} need${attention === 1 ? "s" : ""} your attention.`
          : `${signalCount} ${signalCount === 1 ? "signal" : "signals"} today · none urgent.`;

  return (
    <div className="mx-auto max-w-[1280px] px-[22px] pb-1.5 pt-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-revos-brand">
        Your morning brief{detected ? ` · ${dateShort(detected)}` : ""}
      </div>
      <h1 className="mb-1 mt-1.5 text-[22px] font-semibold tracking-tight text-revos-ink">
        Good {part}. Here&apos;s what needs you.
      </h1>
      <p className="mb-3.5 text-[13.5px] text-revos-ink2">{summary}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function StatTile({
  label,
  value,
  tone,
  hint,
  loading,
}: {
  label: string;
  value: number;
  tone: "crit" | "warn";
  hint: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-revos-line bg-revos-panel p-4 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-revos-ink3">{label}</div>
      <div
        className={clsx(
          "mt-1 text-[26px] font-bold leading-none",
          loading && "text-revos-ink3",
          !loading && value > 0 && tone === "crit" && "text-revos-crit",
          !loading && value > 0 && tone === "warn" && "text-revos-warn",
          !loading && value === 0 && "text-revos-ink",
        )}
      >
        {loading ? "—" : value}
      </div>
      <div className="mt-1.5 text-[11.5px] text-revos-ink3">{hint}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function FeedRow({
  e,
  account,
  onOpen,
}: {
  e: ChangeEvent;
  account: Account | null;
  onOpen: (id: string) => void;
}) {
  const acctName = account?.account_name || null;
  return (
    <div className="grid grid-cols-[auto_auto_1fr_auto] items-start gap-[11px] border-t border-revos-line px-4 py-[11px]">
      <Dot tier={severityToTier(e.severity)} className="mt-[5px] h-[7px] w-[7px]" />
      <span className="mt-[1px] self-start whitespace-nowrap rounded-[5px] border border-revos-line bg-revos-card px-[7px] py-[2px] text-[10.5px] font-bold lowercase tracking-[0.02em] text-revos-ink2">
        {eventSource(e.event_type)}
      </span>
      <div className="min-w-0 text-[12.5px] text-revos-ink">
        <b className="font-semibold">{eventLabel(e.event_type)}</b>
        {e.summary ? <> — {e.summary}</> : null}
        <div className="mt-[3px] text-[11.5px] text-revos-ink3">
          {acctName ? <span className="text-revos-ink2">{acctName}</span> : <span>account linking on next daily run</span>}
          {e.owner ? <> · {e.owner}</> : null}
          {e.detail && typeof e.detail === "object" && "last_net_new_acv_y1" in e.detail
            ? <> · {currencyFmt(Number((e.detail as Record<string, unknown>).last_net_new_acv_y1) || 0)}</>
            : null}
        </div>
      </div>
      {e.sfdc_account_id ? (
        <button
          onClick={() => onOpen(e.sfdc_account_id as string)}
          className="mt-[1px] whitespace-nowrap rounded-md border border-revos-line2 bg-revos-panel px-2.5 py-1 text-[11.5px] font-semibold text-revos-brand hover:bg-revos-card"
        >
          Open →
        </button>
      ) : (
        <span className="mt-[1px] whitespace-nowrap text-[11px] text-revos-ink3">{dateShort(e.detected_date)}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function Empty({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  return (
    <div className={clsx("px-4 py-6 text-[12.5px]", tone === "error" ? "text-revos-crit" : "text-revos-ink3")}>
      {children}
    </div>
  );
}
