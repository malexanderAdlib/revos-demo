"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ProspectingRequestRow } from "@/lib/api";
import { Card, CardHead } from "./ui";

// Clay request (ported from the scorecard app, Les 7/27). Sellers don't get Clay
// seats — they request contacts here and an automated worker finds + enriches
// them into Salesforce as leads they own. Keeps Clay a single, governed,
// credit-metered pipe.
const HARD_CAP = 20;

function parseAccounts(raw: string): { domain: string }[] {
  const seen = new Set<string>();
  const out: { domain: string }[] = [];
  for (const tok of raw.split(/[\n,]+/)) {
    const d = tok.trim().toLowerCase()
      .replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    if (d && d.includes(".") && !seen.has(d)) { seen.add(d); out.push({ domain: d }); }
  }
  return out;
}

const statusPill = (status: string): string => {
  const base = "self-center rounded-[10px] px-1.5 py-[1px] text-[10px] font-semibold ";
  if (status === "new") return base + "bg-revos-warnwash text-revos-warn";
  if (status === "fulfilled") return base + "bg-revos-goodwash text-revos-good";
  if (status === "failed") return base + "bg-revos-critwash text-revos-crit";
  return base + "bg-revos-card text-revos-ink2";
};

export function ProspectingBox() {
  const [accountsRaw, setAccountsRaw] = useState("");
  const [personasRaw, setPersonasRaw] = useState("");
  const [maxPer, setMaxPer] = useState(5);
  const [wantPhone, setWantPhone] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: number; est: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [recent, setRecent] = useState<ProspectingRequestRow[]>([]);

  const accounts = parseAccounts(accountsRaw);
  const personas = personasRaw.split(",").map((p) => p.trim()).filter(Boolean);

  const load = useCallback(() => {
    api.prospectingRequests().then((r) => setRecent(r.requests.slice(0, 6))).catch(() => { /* best-effort */ });
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async () => {
    if (accounts.length === 0) { setErr("Add at least one account domain."); return; }
    if (personas.length === 0) { setErr("Add at least one persona / title (e.g. VP Regulatory Affairs)."); return; }
    setBusy(true); setErr(null);
    try {
      const r = await api.submitProspectingRequest({
        accounts, personas, needs: wantPhone ? ["email", "phone"] : ["email"],
        max_per_account: maxPer, notes: notes.trim() || undefined,
      });
      setDone({ id: r.id, est: r.estimated_contacts });
      setAccountsRaw(""); setPersonasRaw(""); setNotes("");
      load();
    } catch (e) {
      setErr(String((e as Error)?.message || e));
    } finally {
      setBusy(false);
    }
  }, [accounts, personas, wantPhone, maxPer, notes, load]);

  const inputCls =
    "w-full rounded-lg border border-revos-line2 bg-revos-panel px-3 py-2 text-[13px] text-revos-ink outline-none placeholder:text-revos-ink3 focus:border-revos-brand";

  return (
    <Card>
      <CardHead kick="Clay request" title="Need contacts at some accounts?" meta="leads you own" />
      <div className="p-4">
        <p className="text-[12.5px] text-revos-ink2">
          List the accounts and the personas you want. RevOS finds and verifies the contacts and drops them into
          Salesforce as <b className="text-revos-ink">leads you own</b> — no Clay seat needed. Clay stays one governed,
          credit-metered pipe.
        </p>

        <label className="mt-3 mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-revos-ink3">
          Accounts (domains, one per line or comma-separated)
        </label>
        <textarea
          value={accountsRaw} onChange={(e) => { setAccountsRaw(e.target.value); setDone(null); }} rows={3}
          placeholder={"meridianls.com\ncascademutual.com\norionmfg.com"}
          className={inputCls + " font-mono"}
        />

        <label className="mt-3 mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-revos-ink3">
          Personas / titles (comma-separated)
        </label>
        <input
          value={personasRaw} onChange={(e) => setPersonasRaw(e.target.value)}
          placeholder="VP Regulatory Affairs, Director RIM, Head of Quality"
          className={inputCls}
        />

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 text-[12px] text-revos-ink2">
            Max contacts / account
            <input type="number" min={1} max={HARD_CAP} value={maxPer}
              onChange={(e) => setMaxPer(Math.max(1, Math.min(HARD_CAP, Number(e.target.value) || 1)))}
              className="w-14 rounded-lg border border-revos-line2 bg-revos-panel px-2 py-1 text-[13px] text-revos-ink outline-none focus:border-revos-brand" />
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-revos-ink2">
            <input type="checkbox" checked={wantPhone} onChange={(e) => setWantPhone(e.target.checked)} />
            Also find phone numbers
          </label>
          {accounts.length > 0 && personas.length > 0 && (
            <span className="text-[11.5px] text-revos-ink3">
              ~{accounts.length * maxPer} contacts across {accounts.length} account{accounts.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Anything else that helps — e.g. only US sites, avoid contractors (optional)"
          className={inputCls + " mt-2"}
        />

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button onClick={submit} disabled={busy}
            className="rounded-lg bg-revos-brand px-4 py-[7px] text-[12.5px] font-semibold text-white disabled:opacity-60">
            {busy ? "Filing…" : "Request contacts"}
          </button>
          {done && (
            <span className="text-[12px] font-medium text-revos-good">
              Filed as #{done.id} — up to ~{done.est} contacts queued. You&rsquo;ll get them as leads.
            </span>
          )}
          {err && <span className="text-[12px] text-revos-crit">{err}</span>}
        </div>

        {recent.length > 0 && (
          <div className="mt-4 border-t border-revos-line pt-3">
            <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-revos-ink3">Your recent requests</div>
            <ul className="flex flex-col gap-1">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-[12px] text-revos-ink">
                  <span className="tabular-nums text-revos-ink3">#{r.id}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {r.accounts.length} account{r.accounts.length > 1 ? "s" : ""} · {r.personas.join(", ")}
                  </span>
                  {r.result?.created_leads != null && (
                    <span className="whitespace-nowrap text-revos-ink3">{r.result.created_leads} leads</span>
                  )}
                  <span className={statusPill(r.status)}>{r.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
