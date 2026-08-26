"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  api,
  type RequestKind,
  type Roadmap,
  type RoadmapItem,
  type RoadmapStatus,
  type RevosRequestRow,
} from "@/lib/api";
import { Card, CardHead } from "./ui";

// ---------------------------------------------------------------------------
// Roadmap — the single ranked list everyone sees: what's shipped, what's in
// flight, what's next, and the decisions still open. Plus the in-app intake, so
// "a number looks wrong" is filed from the surface you're on, stamped with who
// asked. Reads GET /roadmap; the intake posts /revos-request.
// ---------------------------------------------------------------------------

type Loadable<T> = { state: "loading" | "ready" | "error"; data: T | null; error?: string };

const GROUPS: { key: RoadmapStatus; label: string; hint: string }[] = [
  { key: "in_progress", label: "In flight", hint: "being built now" },
  { key: "next", label: "Next up", hint: "queued, in priority order" },
  { key: "shipped", label: "Delivered", hint: "live in RevOS" },
  { key: "backlog", label: "Backlog", hint: "captured, not scheduled" },
];

const STATUS_LABEL: Record<RoadmapStatus, string> = {
  shipped: "Delivered", in_progress: "In flight", next: "Next", backlog: "Backlog",
};

function statusPill(status: RoadmapStatus): string {
  return clsx(
    "rounded-[20px] border px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.03em]",
    status === "shipped" && "border-transparent bg-revos-goodwash text-revos-good",
    status === "in_progress" && "border-transparent bg-revos-wash text-revos-brand",
    status === "next" && "border-transparent bg-revos-warnwash text-revos-warn",
    status === "backlog" && "border-revos-line bg-revos-card text-revos-ink2",
  );
}

export function RoadmapArea() {
  const [rm, setRm] = useState<Loadable<Roadmap>>({ state: "loading", data: null });

  useEffect(() => {
    let alive = true;
    api
      .roadmap()
      .then((d) => alive && setRm({ state: "ready", data: d }))
      .catch((e) => alive && setRm({ state: "error", data: null, error: String(e?.message || e) }));
    return () => {
      alive = false;
    };
  }, []);

  const d = rm.data;

  return (
    <div>
      {/* Hero */}
      <div className="mx-auto max-w-[1280px] px-[22px] pb-1.5 pt-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-revos-brand">
          One public priority order
        </div>
        <h1 className="mb-1 mt-1.5 text-[22px] font-semibold tracking-tight text-revos-ink">Roadmap</h1>
        <p className="mb-3.5 text-[13.5px] text-revos-ink2">
          {d ? (
            <>
              {d.owner} · updated {d.updated} · what shipped, what&apos;s in flight, what&apos;s next.
            </>
          ) : (
            "What shipped, what's in flight, what's next."
          )}
        </p>
      </div>

      <div className="mx-auto mb-16 flex max-w-[1280px] flex-col gap-4 px-[22px]">
        {rm.state === "loading" && <Card className="p-5"><span className="text-[12.5px] text-revos-ink3">Loading the roadmap…</span></Card>}
        {rm.state === "error" && (
          <Card className="p-5">
            <div className="text-[13px] font-semibold text-revos-crit">Couldn&apos;t load the roadmap</div>
            <div className="mt-1 text-[12.5px] text-revos-ink2">{rm.error}</div>
          </Card>
        )}

        {d && (
          <>
            {/* Vision */}
            {d.vision && (
              <Card className="p-5">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-revos-ink3">Where this is going</div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-revos-ink">{d.vision}</p>
              </Card>
            )}

            {/* Milestones */}
            {d.milestones?.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {d.milestones.map((m) => (
                  <div key={m.id} className="rounded-xl border border-revos-line bg-revos-panel p-3.5 shadow-card">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-revos-ink3">{m.when}</span>
                      <span className={statusPill(m.status)}>{STATUS_LABEL[m.status]}</span>
                    </div>
                    <div className="text-[13px] font-semibold text-revos-ink">{m.title}</div>
                    {m.detail && <div className="mt-1 text-[11.5px] text-revos-ink3">{m.detail}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Decisions needed */}
            {d.decisions_needed?.length > 0 && (
              <Card className="border-revos-warn/40 bg-revos-warnwash p-4">
                <div className="text-[12.5px] font-semibold text-revos-warn">Decisions needed</div>
                <ul className="mt-2 flex flex-col gap-2">
                  {d.decisions_needed.map((x, i) => (
                    <li key={i} className="text-[12.5px]">
                      <span className="font-medium text-revos-ink">{x.question}</span>
                      <div className="mt-0.5 text-[11.5px] text-revos-ink3">
                        {x.why} · <span className="font-medium text-revos-ink2">{x.owner}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Ranked items by status */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {GROUPS.map((g) => {
                const items = d.items.filter((i) => i.status === g.key);
                if (!items.length) return null;
                return (
                  <Card key={g.key}>
                    <CardHead kick={g.label} meta={`${items.length} · ${g.hint}`} />
                    <ul>
                      {items.map((it, idx) => (
                        <ItemRow key={`${it.title}-${idx}`} it={it} n={g.key === "next" ? idx + 1 : undefined} />
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>

            {/* Principles */}
            {d.principles?.length > 0 && (
              <Card className="p-4">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-revos-ink3">How RevOS is built</div>
                <ul className="mt-2 flex flex-col gap-1 text-[12.5px] text-revos-ink">
                  {d.principles.map((p, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="text-revos-ink3">·</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-revos-ink3">
                  Anything added bumps something else down — the order here is the answer to &ldquo;what are you working on?&rdquo;
                </p>
              </Card>
            )}
          </>
        )}

        {/* Intake — always available, even if the roadmap read failed */}
        <RequestBox surface="roadmap" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ItemRow({ it, n }: { it: RoadmapItem; n?: number }) {
  return (
    <li className="flex gap-3 border-t border-revos-line px-4 py-2.5 first:border-t-0">
      {n !== undefined && <span className="w-5 shrink-0 pt-0.5 text-[11px] tabular-nums text-revos-ink3">{n}.</span>}
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-revos-ink">
          {it.title}
          {it.ref && <span className="ml-2 text-[11px] font-normal text-revos-ink3">{it.ref}</span>}
        </div>
        {it.detail && <div className="mt-0.5 text-[11.5px] text-revos-ink3">{it.detail}</div>}
        {it.requester && (
          <div className="mt-1 text-[11px] text-revos-ink3">
            asked for by <span className="font-medium text-revos-ink2">{it.requester}</span>
          </div>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// The in-app intake — file a bug / idea / question / data issue. Requester is
// stamped server-side from the session; we only send kind/title/detail/surface.
// ---------------------------------------------------------------------------
const KINDS: { id: RequestKind; label: string }[] = [
  { id: "bug", label: "Something's wrong" },
  { id: "idea", label: "Feature idea" },
  { id: "question", label: "Question" },
  { id: "data", label: "Number looks off" },
];
const INBOX = "RevOS@adlibsoftware.com";

function requestStatusPill(status: string): string {
  return clsx(
    "self-center rounded-[10px] px-1.5 py-[1px] text-[10px] font-semibold",
    status === "new" && "bg-revos-warnwash text-revos-warn",
    status === "shipped" && "bg-revos-goodwash text-revos-good",
    status !== "new" && status !== "shipped" && "bg-revos-card text-revos-ink2",
  );
}

function RequestBox({ surface }: { surface?: string }) {
  const [kind, setKind] = useState<RequestKind>("bug");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [recent, setRecent] = useState<RevosRequestRow[]>([]);

  const load = useCallback(() => {
    api.revosRequests().then((r) => setRecent(r.requests.slice(0, 6))).catch(() => { /* list is best-effort */ });
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async () => {
    if (title.trim().length < 3) { setErr("Give it a short title first."); return; }
    setBusy(true); setErr(null);
    try {
      const r = await api.submitRevosRequest({ kind, title: title.trim(), detail: detail.trim() || undefined, surface });
      setDone(r.id); setTitle(""); setDetail("");
      load();
    } catch (e) {
      setErr(String((e as Error)?.message || e));
    } finally {
      setBusy(false);
    }
  }, [kind, title, detail, surface, load]);

  return (
    <Card className="p-4">
      <div className="text-[13px] font-semibold text-revos-ink">Something broken, missing, or confusing?</div>
      <p className="mt-1 text-[12px] text-revos-ink2">
        File it here and it lands on this roadmap — you&apos;ll see it in the list below. Prefer email? Write to{" "}
        <a className="font-medium text-revos-brand hover:underline" href={`mailto:${INBOX}`}>{INBOX}</a>.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setKind(k.id)}
            aria-pressed={kind === k.id}
            className={clsx(
              "rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
              kind === k.id
                ? "border-revos-brand bg-revos-brand text-white"
                : "border-revos-line2 text-revos-ink2 hover:bg-revos-card",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => { setTitle(e.target.value); setDone(null); }}
        aria-label="Request title"
        placeholder="One line — what happened, or what you want"
        className="mt-3 w-full rounded-lg border border-revos-line2 bg-revos-panel px-3 py-2 text-[13px] text-revos-ink outline-none placeholder:text-revos-ink3 focus:border-revos-brand"
      />
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={2}
        aria-label="Request detail (optional)"
        placeholder="Anything else that helps — which rep, which number, what you expected (optional)"
        className="mt-2 w-full rounded-lg border border-revos-line2 bg-revos-panel px-3 py-2 text-[13px] text-revos-ink outline-none placeholder:text-revos-ink3 focus:border-revos-brand"
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-revos-brand px-4 py-[7px] text-[12.5px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send it"}
        </button>
        {done && <span className="text-[12px] font-medium text-revos-good">Filed as #{done} — thank you.</span>}
        {err && <span className="text-[12px] text-revos-crit">{err}</span>}
      </div>

      {recent.length > 0 && (
        <div className="mt-4 border-t border-revos-line pt-3">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-revos-ink3">Recently filed</div>
          <ul className="mt-1.5 flex flex-col gap-1">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-[12px] text-revos-ink">
                <span className="tabular-nums text-revos-ink3">#{r.id}</span>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="whitespace-nowrap text-revos-ink3">{r.requester.split("@")[0]}</span>
                <span className={requestStatusPill(r.status)}>{r.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
