"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  api,
  currencyFmt,
  dateShort,
  daysAgo,
  eventLabel,
  eventSource,
  ragToTier,
  severityToTier,
  tierLabel,
  type Account,
  type AccountContext,
  type AgentResult,
  type ChangeEvent,
} from "@/lib/api";
import { Card, CardHead, Dot, Pill } from "./ui";
import { ProspectingBox } from "./ProspectingBox";

type Loadable<T> = { state: "loading" | "ready" | "error"; data: T | null; error?: string };

// ---------------------------------------------------------------------------
// The Accounts workspace — hero Ask bar, the searchable book, and the opened
// account's full deep-dive. Wired to /pipeline: accounts, warm context,
// change-events, and the agent loop.
// ---------------------------------------------------------------------------

export function AccountsArea({ initialAccountId }: { initialAccountId?: string | null } = {}) {
  const [accounts, setAccounts] = useState<Loadable<Account[]>>({ state: "loading", data: null });
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<string | null>(null); // null | "atrisk" | "watch" | "ind:<name>"
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(true); // book list open (vs. deep-dive focused)

  // Warm context for the selected account (null = 404 "warming up").
  const [ctx, setCtx] = useState<{ state: "idle" | "loading" | "ready" | "warming" | "error"; data: AccountContext | null; error?: string }>({
    state: "idle",
    data: null,
  });
  // The viewer's change-events (most recent detected_date, owner/segment scoped).
  const [events, setEvents] = useState<Loadable<ChangeEvent[]>>({ state: "loading", data: null });

  // ---- initial load: the book --------------------------------------------
  useEffect(() => {
    let alive = true;
    api
      .accounts({ limit: 500 })
      .then((rows) => {
        if (!alive) return;
        setAccounts({ state: "ready", data: rows });
        // Deep-linked from Home? Open that account. Else the first at-risk, else
        // the first account.
        const deepLinked = initialAccountId
          ? rows.find((a) => a.sfdc_account_id === initialAccountId)
          : undefined;
        const firstAtRisk = rows.find((a) => ragToTier(a.rag_status) === "hi");
        const first = deepLinked || firstAtRisk || rows[0];
        if (first) {
          setSelectedId(first.sfdc_account_id);
          setBrowsing(false);
        }
      })
      .catch((e) => alive && setAccounts({ state: "error", data: null, error: String(e?.message || e) }));
    return () => {
      alive = false;
    };
  }, [initialAccountId]);

  // ---- warm context + change-events on selection change -------------------
  // Both are fetched per-account. Events are scoped server-side by account_id
  // (within the viewer's role scope) rather than pulling the whole book and
  // guessing the account from currently-open opps — that guess silently dropped
  // left_pipeline signals, whose opp is by definition no longer open.
  useEffect(() => {
    if (!selectedId) {
      setCtx({ state: "idle", data: null });
      setEvents({ state: "ready", data: [] });
      return;
    }
    let alive = true;
    setCtx({ state: "loading", data: null });
    setEvents({ state: "loading", data: null });
    api
      .accountContext(selectedId)
      .then((rec) => {
        if (!alive) return;
        setCtx(rec ? { state: "ready", data: rec } : { state: "warming", data: null });
      })
      .catch((e) => alive && setCtx({ state: "error", data: null, error: String(e?.message || e) }));
    api
      .changeEvents({ account_id: selectedId })
      .then((r) => alive && setEvents({ state: "ready", data: r.events }))
      .catch((e) => alive && setEvents({ state: "error", data: null, error: String(e?.message || e) }));
    return () => {
      alive = false;
    };
  }, [selectedId]);

  const rows = accounts.data || [];
  const selected = useMemo(
    () => rows.find((a) => a.sfdc_account_id === selectedId) || null,
    [rows, selectedId],
  );

  // ---- derived filters ----------------------------------------------------
  const counts = useMemo(() => {
    let atrisk = 0;
    let watch = 0;
    const byInd = new Map<string, number>();
    for (const a of rows) {
      const t = ragToTier(a.rag_status);
      if (t === "hi") atrisk++;
      if (t === "md") watch++;
      const ind = a.adlib_industry || a.industry;
      if (ind) byInd.set(ind, (byInd.get(ind) || 0) + 1);
    }
    const topInds = Array.from(byInd.entries()).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k]) => k);
    return { atrisk, watch, topInds };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((a) => {
      if (chip === "atrisk" && ragToTier(a.rag_status) !== "hi") return false;
      if (chip === "watch" && ragToTier(a.rag_status) !== "md") return false;
      if (chip?.startsWith("ind:")) {
        const want = chip.slice(4);
        if ((a.adlib_industry || a.industry) !== want) return false;
      }
      if (!q) return true;
      return [a.account_name, a.account_owner, a.segment, a.adlib_industry, a.industry, a.region]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [rows, query, chip]);

  const selIndex = useMemo(
    () => filtered.findIndex((a) => a.sfdc_account_id === selectedId),
    [filtered, selectedId],
  );

  const open = useCallback((id: string) => {
    setSelectedId(id);
    setBrowsing(false);
    setQuery("");
  }, []);

  const step = useCallback(
    (dir: -1 | 1) => {
      if (!filtered.length) return;
      const base = selIndex < 0 ? 0 : selIndex;
      const next = (base + dir + filtered.length) % filtered.length;
      open(filtered[next].sfdc_account_id);
    },
    [filtered, selIndex, open],
  );

  // Show the book list when browsing, when searching, or before anything's open.
  const showBook = browsing || query.trim().length > 0 || !selected;

  return (
    <div>
      <Hero />

      {/* Accounts section bar — the full book lives here (searchable). */}
      <div className="mx-auto mt-3 flex max-w-[1280px] flex-wrap items-center gap-3 px-[22px]">
        <div className="text-[13.5px] text-revos-ink2">
          <button className="font-semibold text-revos-brand" onClick={() => setBrowsing(true)}>
            Accounts
          </button>
          {selected && (
            <>
              <span className="mx-[7px] text-revos-ink3">›</span>
              <b className="font-semibold text-revos-ink">{selected.account_name || "—"}</b>
            </>
          )}
        </div>
        <input
          className="min-w-[200px] flex-1 rounded-[9px] border border-revos-line2 bg-revos-panel px-3 py-2 text-[13px] text-revos-ink2 outline-none focus:border-revos-brand"
          placeholder={`Search ${rows.length || ""} accounts by name, owner, or segment…`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setBrowsing(true);
          }}
        />
        <div className="flex flex-wrap gap-[7px]">
          <FilterChip on={chip === "atrisk"} tone="crit" onClick={() => setChip(chip === "atrisk" ? null : "atrisk")}>
            At risk · {counts.atrisk}
          </FilterChip>
          <FilterChip on={chip === "watch"} tone="warn" onClick={() => setChip(chip === "watch" ? null : "watch")}>
            Watch · {counts.watch}
          </FilterChip>
          {counts.topInds.map((ind) => (
            <FilterChip
              key={ind}
              on={chip === `ind:${ind}`}
              onClick={() => setChip(chip === `ind:${ind}` ? null : `ind:${ind}`)}
            >
              {ind}
            </FilterChip>
          ))}
        </div>
        <div className="text-[12px] text-revos-ink3">
          {filtered.length ? (
            <>
              <b className="text-revos-ink">{selIndex >= 0 ? selIndex + 1 : "—"}</b> of {filtered.length}
              <button className="ml-2 hover:text-revos-brand" onClick={() => step(-1)} aria-label="Previous">◂</button>
              <button className="ml-1.5 hover:text-revos-brand" onClick={() => step(1)} aria-label="Next">▸</button>
            </>
          ) : (
            "0 of 0"
          )}
        </div>
      </div>

      {/* Workspace */}
      <div className="mx-auto mb-16 mt-3 max-w-[1280px] px-[22px]">
        {accounts.state === "loading" && <Note>Loading your book…</Note>}
        {accounts.state === "error" && (
          <ErrorCard title="Couldn't load your book">
            {accounts.error}
            <div className="mt-2 text-revos-ink3">
              If this says 401/403, append <code>?email=you@adlibsoftware.com</code> to the URL to identify yourself.
            </div>
          </ErrorCard>
        )}

        {accounts.state === "ready" && (
          <div className="flex flex-col gap-4">
            {showBook && (
              <BookList
                rows={filtered}
                total={rows.length}
                selectedId={selectedId}
                onOpen={open}
              />
            )}

            {selected && (
              <DeepDive
                account={selected}
                ctx={ctx}
                events={events}
              />
            )}

            {/* Clay request — request contacts for your book (leads you own). */}
            <ProspectingBox />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-[1280px] px-[22px] pb-10 text-[12px] text-revos-ink3">
        This is the <b className="text-revos-ink2">Accounts</b> workspace — your book, every tool, one view.
        Signals come from Salesforce daily-state change detection and warm context; the recommended action is
        drafted by the RevOS agent and <b className="text-revos-ink2">stages at the human-approval gate</b> — nothing
        writes to Salesforce until you approve.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero — Ask across the book (posts to /agent).
// ---------------------------------------------------------------------------
function Hero() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ state: "idle" | "loading" | "ready" | "error"; data?: AgentResult; error?: string }>({ state: "idle" });

  const ask = useCallback(() => {
    const instruction = q.trim();
    if (!instruction) return;
    setRes({ state: "loading" });
    api
      .agent(instruction)
      .then((data) => setRes({ state: "ready", data }))
      .catch((e) => setRes({ state: "error", error: String(e?.message || e) }));
  }, [q]);

  return (
    <div className="mx-auto max-w-[1280px] px-[22px] pb-1.5 pt-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-revos-brand">
        Your whole book, every tool, one workspace
      </div>
      <h1 className="mb-3.5 mt-1.5 text-[22px] font-semibold tracking-tight text-revos-ink">
        Ask across your book, or open an account.
      </h1>
      <div className="flex items-center gap-3 rounded-[11px] border-[1.5px] border-revos-brand bg-revos-panel px-[15px] py-3 shadow-ask focus-within:ring-2 focus-within:ring-revos-brand/40">
        <span className="text-base text-revos-brand" aria-hidden>✦</span>
        <input
          aria-label="Ask across your book"
          className="flex-1 bg-transparent text-[14px] text-revos-ink outline-none placeholder:text-revos-ink3"
          placeholder="Ask RevOS… which deals are slipping? · win rate by rev type · who went quiet this week?"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
        />
        <button
          className="rounded-lg bg-revos-brand px-4 py-[7px] text-[13px] font-semibold text-white disabled:opacity-60"
          onClick={ask}
          disabled={res.state === "loading"}
        >
          {res.state === "loading" ? "Asking…" : "Ask"}
        </button>
      </div>
      {res.state === "error" && (
        <div className="mt-2 rounded-lg border border-revos-critwash bg-revos-critwash px-3 py-2 text-[12px] text-revos-crit">
          {res.error}
        </div>
      )}
      {res.state === "ready" && res.data && (
        <div className="mt-2 rounded-lg border border-revos-line bg-revos-card px-4 py-3 text-[13px] text-revos-ink2">
          <div className="whitespace-pre-wrap">{res.data.answer_text}</div>
          <AgentFooter r={res.data} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Book list — the searchable/filterable full book, with a health/risk pill.
// ---------------------------------------------------------------------------
function BookList({
  rows,
  total,
  selectedId,
  onOpen,
}: {
  rows: Account[];
  total: number;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <Card>
      <CardHead kick="Book" title="Your accounts" meta={`${rows.length} of ${total} shown`} />
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-[12.5px] text-revos-ink3">No accounts match your search.</div>
      ) : (
        <div className="max-h-[340px] overflow-y-auto">
          {rows.slice(0, 200).map((a) => {
            const tier = ragToTier(a.rag_status);
            return (
              <button
                key={a.sfdc_account_id}
                onClick={() => onOpen(a.sfdc_account_id)}
                className={clsx(
                  "flex w-full items-center gap-3 border-t border-revos-line px-4 py-2.5 text-left first:border-t-0 hover:bg-revos-card",
                  a.sfdc_account_id === selectedId && "bg-revos-wash",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-revos-ink">{a.account_name || "—"}</span>
                  <span className="ml-2 text-[11.5px] text-revos-ink3">
                    {[a.adlib_industry || a.industry, a.account_owner].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                <Pill tier={tier}>{tierLabel(tier)}</Pill>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// The opened account's deep-dive.
// ---------------------------------------------------------------------------
function DeepDive({
  account,
  ctx,
  events,
}: {
  account: Account;
  ctx: { state: "idle" | "loading" | "ready" | "warming" | "error"; data: AccountContext | null; error?: string };
  events: Loadable<ChangeEvent[]>;
}) {
  const tier = ragToTier(account.rag_status);
  const c = ctx.data;

  // change-events are already scoped to this account server-side (by account_id),
  // so the feed is exactly this account's signals — including left_pipeline, which
  // the old open-opp-id match dropped.
  const accountEvents = events.data || [];

  const seg = account.segment || account.adlib_industry || account.industry;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Account header + health */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-semibold text-revos-ink">
              {account.account_name || "—"}
              {seg && (
                <span className="ml-2 rounded-md bg-revos-wash px-2 py-[2px] align-middle text-[11px] font-semibold text-revos-brand">
                  {seg}
                </span>
              )}
            </h2>
            <div className="mt-1.5 text-[12.5px] text-revos-ink2">
              {ctx.state === "ready" && c ? (
                <>
                  <b className="text-revos-ink">{c.open_opp_count ?? 0}</b> open{" "}
                  {c.open_opp_count === 1 ? "opp" : "opps"} ·{" "}
                  <b className="text-revos-ink">{currencyFmt(c.open_pipeline_nnacv)}</b> open pipeline · owner{" "}
                  <b className="text-revos-ink">{c.owner || account.account_owner || "—"}</b>
                  {c.last_activity_date && <> · last activity {dateShort(c.last_activity_date)}</>}
                  {c.next_touch?.activity_date && <> · next touch {dateShort(c.next_touch.activity_date)}</>}
                </>
              ) : (
                <>
                  owner <b className="text-revos-ink">{account.account_owner || "—"}</b>
                  {account.adlib_industry && <> · {account.adlib_industry}</>}
                  {ctx.state === "loading" && <> · <span className="text-revos-ink3">loading context…</span></>}
                  {ctx.state === "warming" && <> · <span className="text-revos-warn">warm context refreshing</span></>}
                </>
              )}
            </div>
          </div>
          <div className="flex-none text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-revos-ink3">Health</div>
            <div
              className={clsx(
                "text-[20px] font-bold",
                tier === "hi" && "text-revos-crit",
                tier === "md" && "text-revos-warn",
                tier === "lo" && "text-revos-good",
                tier === "na" && "text-revos-ink3",
              )}
            >
              {tierLabel(tier)}
            </div>
            {account.churn_risk && (
              <div className="text-[11.5px] text-revos-ink3">churn: {account.churn_risk}</div>
            )}
          </div>
        </div>
      </Card>

      {/* What matters now — the signal feed */}
      <Card>
        <CardHead
          kick="Intelligence"
          title="What matters now"
          meta={
            events.state === "ready"
              ? `${accountEvents.length} ${accountEvents.length === 1 ? "signal" : "signals"} · ranked`
              : "across your tools"
          }
        />
        {events.state === "loading" ? (
          <Empty>Loading signals…</Empty>
        ) : events.state === "error" ? (
          <Empty tone="error">{events.error}</Empty>
        ) : accountEvents.length === 0 ? (
          <Empty>
            No change signals for this account yet. The feed fills once two days of daily state captures have
            accrued and something moves — a stage slip, a pushed close date, a cleared next step.
          </Empty>
        ) : (
          accountEvents.map((e, i) => <SignalRow key={`${e.event_type}-${e.sfdc_opportunity_id}-${i}`} e={e} />)
        )}
      </Card>

      {/* What they're saying — Fathom (placeholder, not fabricated) */}
      <Card>
        <CardHead kick="What they're saying" meta="Fathom · call themes" />
        <div className="px-4 py-4 text-[12.5px] text-revos-ink2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-revos-line bg-revos-card px-3 py-2">
            <span className="text-revos-warn">◔</span>
            <b className="text-revos-ink">Fathom call themes — wiring in progress</b>
          </div>
          <p className="mt-2.5 text-revos-ink3">
            Account-scoped call themes aren&apos;t wired to a live endpoint yet. The same Fathom engine behind the
            weekly Life Sciences call-trends report will land here, scoped to this account — no call content is
            shown until it&apos;s real.
          </p>
        </div>
      </Card>

      {/* Recommended action — human gate, drafted by the agent */}
      <RecommendedAction account={account} />

      {/* Live signals — the same change-events, chip form */}
      <Card>
        <CardHead kick="Live signals" meta={`on ${account.account_name || "this account"}`} />
        <div className="flex flex-wrap gap-2 px-4 py-3.5">
          {events.state === "loading" ? (
            <span className="text-[12px] text-revos-ink3">Loading signals…</span>
          ) : events.state !== "ready" ? (
            <span className="text-[12px] text-revos-ink3">Signals unavailable right now.</span>
          ) : accountEvents.length === 0 ? (
            <span className="text-[12px] text-revos-ink3">No live signals yet.</span>
          ) : (
            accountEvents.slice(0, 8).map((e, i) => (
              <span
                key={`chip-${i}`}
                className="flex items-center gap-2 rounded-[20px] border border-revos-line bg-revos-card px-[11px] py-[5px] text-[12px] text-revos-ink2"
              >
                <Dot tier={severityToTier(e.severity)} className="h-1.5 w-1.5" />
                {eventLabel(e.event_type)}
              </span>
            ))
          )}
        </div>
      </Card>

      {/* Your stack, unified */}
      <StackGrid account={account} ctx={ctx} accountEvents={accountEvents} />
    </div>
  );
}

// ---------------------------------------------------------------------------
function SignalRow({ e }: { e: ChangeEvent }) {
  return (
    <div className="grid grid-cols-[auto_auto_1fr_auto] items-start gap-[11px] border-t border-revos-line px-4 py-[11px]">
      <Dot tier={severityToTier(e.severity)} className="mt-[5px] h-[7px] w-[7px]" />
      <span className="mt-[1px] self-start whitespace-nowrap rounded-[5px] border border-revos-line bg-revos-card px-[7px] py-[2px] text-[10.5px] font-bold lowercase tracking-[0.02em] text-revos-ink2">
        {eventSource(e.event_type)}
      </span>
      <div className="text-[12.5px] text-revos-ink">
        <b className="font-semibold">{eventLabel(e.event_type)}</b>
        {e.summary ? <> — {e.summary}</> : null}
      </div>
      <div className="mt-[1px] whitespace-nowrap text-[11px] text-revos-ink3">{dateShort(e.detected_date)}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommended action — calls /agent to draft the single next best action.
// The draft is REAL (from the agent); Approve is a mock action for now.
// ---------------------------------------------------------------------------
function RecommendedAction({ account }: { account: Account }) {
  const [res, setRes] = useState<{ state: "idle" | "loading" | "ready" | "error"; data?: AgentResult; error?: string }>({ state: "idle" });
  const [approved, setApproved] = useState(false);
  const [cmd, setCmd] = useState("");
  const [cmdRes, setCmdRes] = useState<{ state: "idle" | "loading" | "ready" | "error"; data?: AgentResult; error?: string }>({ state: "idle" });

  // Reset when the account changes.
  useEffect(() => {
    setRes({ state: "idle" });
    setApproved(false);
    setCmd("");
    setCmdRes({ state: "idle" });
  }, [account.sfdc_account_id]);

  const draft = useCallback(() => {
    setApproved(false);
    setRes({ state: "loading" });
    api
      .agent(
        `Recommend the single next best action for account "${account.account_name}" and draft the outreach. ` +
          `Explain briefly why, then give a short ready-to-send draft.`,
      )
      .then((data) => setRes({ state: "ready", data }))
      .catch((e) => setRes({ state: "error", error: String(e?.message || e) }));
  }, [account.account_name]);

  const runCmd = useCallback(() => {
    const instruction = cmd.trim();
    if (!instruction) return;
    setCmdRes({ state: "loading" });
    api
      .agent(instruction)
      .then((data) => setCmdRes({ state: "ready", data }))
      .catch((e) => setCmdRes({ state: "error", error: String(e?.message || e) }));
  }, [cmd]);

  const stagedCount = res.data?.staged_writes?.length ?? 0;

  return (
    <Card>
      <div className="p-4">
        <div className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-revos-brand">
          <span>Recommended action</span>
          <span className="rounded-[20px] bg-revos-wash px-2 py-[2px]">human gate</span>
        </div>

        {res.state === "idle" && (
          <div className="mt-3">
            <p className="text-[13px] text-revos-ink2">
              Have the RevOS agent read this account&apos;s live context and signals, then recommend the single next
              best action and draft the outreach.
            </p>
            <button
              className="mt-3 rounded-lg bg-revos-brand px-4 py-[7px] text-[12.5px] font-semibold text-white"
              onClick={draft}
            >
              Draft recommended action
            </button>
          </div>
        )}

        {res.state === "loading" && <p className="mt-3 text-[13px] text-revos-ink3">Reading the account and drafting…</p>}

        {res.state === "error" && (
          <div className="mt-3">
            <div className="rounded-lg border border-revos-critwash bg-revos-critwash px-3 py-2 text-[12px] text-revos-crit">
              {res.error}
            </div>
            <button className="mt-2 text-[12px] font-semibold text-revos-brand" onClick={draft}>
              Try again
            </button>
          </div>
        )}

        {res.state === "ready" && res.data && (
          <>
            <p className="mt-3 text-[14px] font-medium text-revos-ink">{res.data.answer_text}</p>
            <div className="mt-3 rounded-[9px] border border-revos-line border-l-[3px] border-l-revos-brand bg-revos-card px-3.5 py-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-revos-ink3">
                {stagedCount > 0 ? `Staged write · ${stagedCount} proposal${stagedCount === 1 ? "" : "s"} · not applied` : "Draft · staged, not sent"}
              </div>
              <div className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-[1.55] text-revos-ink2">
                {stagedCount > 0 ? (
                  <pre className="overflow-x-auto font-sans">{JSON.stringify(res.data.staged_writes, null, 2)}</pre>
                ) : (
                  res.data.answer_text
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <button
                className="rounded-lg bg-revos-brand px-4 py-[7px] text-[12.5px] font-semibold text-white disabled:opacity-60"
                onClick={() => setApproved(true)}
                disabled={approved}
              >
                {approved ? "Approved (mock)" : "Approve → stage in Salesforce"}
              </button>
              <button className="rounded-lg border border-revos-line2 bg-revos-panel px-4 py-[7px] text-[12.5px] font-semibold text-revos-ink" onClick={draft}>
                Re-draft
              </button>
              <button
                className="rounded-lg border border-revos-critwash px-4 py-[7px] text-[12.5px] font-semibold text-revos-crit"
                onClick={() => setRes({ state: "idle" })}
              >
                Reject
              </button>
              <span className="ml-auto text-[11.5px] text-revos-ink3">
                {approved ? "Mock approval — nothing was written." : "Nothing writes to Salesforce until you approve."}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Agent command bar */}
      <div className="mx-4 mb-4 mt-3.5">
        <div className="flex items-center gap-2.5 rounded-[10px] border border-revos-line bg-revos-card px-3 py-2.5 focus-within:ring-2 focus-within:ring-revos-brand/40">
          <span className="text-revos-brand" aria-hidden>✦</span>
          <input
            aria-label="Ask or tell the RevOS agent about this account"
            className="flex-1 bg-transparent text-[12.5px] text-revos-ink outline-none placeholder:text-revos-ink3"
            placeholder="Ask or tell RevOS… draft the follow-up · set the next step · find the new champion's email"
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runCmd()}
          />
          <button
            className="rounded-[7px] border border-revos-line2 bg-revos-panel px-3 py-1.5 text-[12px] font-semibold text-revos-brand disabled:opacity-60"
            onClick={runCmd}
            disabled={cmdRes.state === "loading"}
          >
            {cmdRes.state === "loading" ? "…" : "Ask"}
          </button>
        </div>
        <div className="mt-1.5 px-1 text-[11px] text-revos-ink3">
          Reads run live; any write stages at the approval gate — nothing writes to Salesforce until you approve.
        </div>
        {cmdRes.state === "error" && (
          <div className="mt-2 rounded-lg border border-revos-critwash bg-revos-critwash px-3 py-2 text-[12px] text-revos-crit">
            {cmdRes.error}
          </div>
        )}
        {cmdRes.state === "ready" && cmdRes.data && (
          <div className="mt-2 rounded-lg border border-revos-line bg-revos-card px-3.5 py-3 text-[12.5px] text-revos-ink2">
            <div className="whitespace-pre-wrap">{cmdRes.data.answer_text}</div>
            <AgentFooter r={cmdRes.data} />
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Your stack, unified — every tool's view of this account, from what's wired.
// ---------------------------------------------------------------------------
function StackGrid({
  account,
  ctx,
  accountEvents,
}: {
  account: Account;
  ctx: { state: string; data: AccountContext | null };
  accountEvents: ChangeEvent[];
}) {
  const c = ctx.data;
  const warming = ctx.state === "warming" || ctx.state === "loading";
  // When context hasn't loaded (c is null) the tiles must NOT assert absence —
  // c is null only while warming/loading or on an error, never a genuine "no
  // pipeline" (a ready context always carries a record). Say why it's blank
  // instead of fabricating "No open pipeline."
  const fallback = ctx.state === "error" ? "Couldn't load context." : warming ? "Warming up…" : "—";
  const nt = c?.next_touch;
  const lastAct = c?.last_activity_date;
  const days = daysAgo(lastAct);
  const contacts = c?.key_contacts?.length ?? 0;
  const sfdcEvents = accountEvents.length;

  return (
    <Card>
      <CardHead kick="Your stack, unified" meta="every tool's view of this account" />
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tool name="Salesforce" tag="pipeline">
          {c ? (
            <>
              <div className="mt-1.5 text-[17px] font-bold text-revos-ink">{currencyFmt(c.open_pipeline_nnacv)}</div>
              <div className="tv">
                {c.open_opp_count ?? 0} open {c.open_opp_count === 1 ? "opp" : "opps"}
                {c.open_opps?.[0]?.stage ? <> · lead stage <b className="text-revos-ink">{c.open_opps[0].stage}</b></> : null}
              </div>
            </>
          ) : (
            <div className="tv">{fallback}</div>
          )}
        </Tool>

        <Tool name="Regie" tag="sequences">
          {nt?.subject ? (
            <div className="tv">
              Next touch <b className="text-revos-ink">{nt.subject}</b>
              {nt.activity_date ? <> · {dateShort(nt.activity_date)}</> : null}
            </div>
          ) : (
            <div className="tv">{fallback}</div>
          )}
        </Tool>

        <Tool name="Fathom" tag="calls">
          <div className="tv text-revos-ink3">Call themes — wiring in progress.</div>
        </Tool>

        <Tool name="Calendar" tag="meetings">
          {lastAct ? (
            <div className="tv">
              Last activity <b className="text-revos-ink">{days != null ? `${days}d ago` : dateShort(lastAct)}</b>.
              {nt?.activity_date ? <> Next touch {dateShort(nt.activity_date)}.</> : <> None upcoming logged.</>}
            </div>
          ) : (
            <div className="tv">{fallback}</div>
          )}
        </Tool>

        <Tool name="Clay" tag="enrichment">
          {c ? (
            <div className="tv">
              <b className="text-revos-ink">{contacts}</b> key {contacts === 1 ? "contact" : "contacts"} on file
              {c.key_contacts?.[0]?.title ? <> · {c.key_contacts[0].title}</> : null}.
            </div>
          ) : (
            <div className="tv">{fallback}</div>
          )}
        </Tool>

        <Tool name="Change signals" tag="daily diff">
          <div className="mt-1.5 text-[17px] font-bold text-revos-ink">{sfdcEvents}</div>
          <div className="tv">ranked {sfdcEvents === 1 ? "signal" : "signals"} on this account today.</div>
        </Tool>
      </div>
    </Card>
  );
}

function Tool({ name, tag, children }: { name: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-revos-line bg-revos-card p-3 [&_.tv]:mt-2 [&_.tv]:text-[12.5px] [&_.tv]:leading-[1.5] [&_.tv]:text-revos-ink2">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[12px] font-bold text-revos-ink">{name}</span>
        <span className="text-[10px] text-revos-ink3">{tag}</span>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared bits.
// ---------------------------------------------------------------------------
function FilterChip({
  on,
  tone,
  onClick,
  children,
}: {
  on: boolean;
  tone?: "crit" | "warn";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-[20px] border px-[11px] py-[5px] text-[11.5px] font-semibold",
        on && tone === "crit" && "border-transparent bg-revos-critwash text-revos-crit",
        on && tone === "warn" && "border-transparent bg-revos-warnwash text-revos-warn",
        on && !tone && "border-transparent bg-revos-wash text-revos-brand",
        !on && "border-revos-line bg-revos-panel text-revos-ink2 hover:bg-revos-card",
      )}
    >
      {children}
    </button>
  );
}

function AgentFooter({ r }: { r: AgentResult }) {
  const staged = r.staged_writes?.length ?? 0;
  const tools = r.tool_calls?.length ?? 0;
  if (!staged && !tools) return null;
  return (
    <div className="mt-2 text-[11px] text-revos-ink3">
      {tools} tool {tools === 1 ? "call" : "calls"}
      {staged > 0 && <> · {staged} staged write{staged === 1 ? "" : "s"} at the approval gate</>}
    </div>
  );
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

function ErrorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-[13px] font-semibold text-revos-crit">{title}</div>
      <div className="mt-1 text-[12.5px] text-revos-ink2">{children}</div>
    </Card>
  );
}
