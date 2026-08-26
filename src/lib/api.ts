// RevOS API client — same-origin calls to the agent's /pipeline/* API.
// The static export is mounted at /revos by the agent (main.py), so fetches to
// /pipeline/* hit the FastAPI on the same host. X-User-Email identifies the
// viewer; server-side role resolution scopes every read.

import { demoResponse, DEMO } from "./demo";

const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;

// Small delay so loading skeletons flash naturally in the demo preview.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Identity resolution order (mirrors the scorecard app):
//   1) ?email=... query param (one-time pasteable link)
//   2) localStorage ('pipeline.userEmail')
//   3) NEXT_PUBLIC_DEV_USER_EMAIL (compile-time, local dev only)
// Once the agent sits behind SSO that injects X-User-Email, this can come out.
export function getUserEmail(): string | null {
  if (typeof window === "undefined") return DEV_EMAIL ?? null;
  const qs = new URLSearchParams(window.location.search).get("email");
  if (qs) {
    try { window.localStorage.setItem("pipeline.userEmail", qs); } catch { /* private mode */ }
    return qs;
  }
  try {
    const stored = window.localStorage.getItem("pipeline.userEmail");
    if (stored) return stored;
  } catch { /* private mode */ }
  return DEV_EMAIL ?? null;
}

export function setUserEmail(email: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem("pipeline.userEmail", email); } catch { /* private mode */ }
}

export function clearUserEmail() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem("pipeline.userEmail"); } catch { /* private mode */ }
}

function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const email = getUserEmail();
  if (email) h["X-User-Email"] = email;
  return h;
}

// Postgres NUMERIC fields arrive as strings ("123.45"). Coerce the money/count
// fields we render so arithmetic and formatting work.
const NUM_FIELDS = new Set([
  "open_pipeline_nnacv", "open_opp_count", "nnacv", "amount", "net_new_acv_y1",
  "severity",
]);
function coerce<T>(v: T): T {
  if (Array.isArray(v)) return v.map(coerce) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (NUM_FIELDS.has(k) && typeof val === "string" && val !== "") {
        const n = Number(val);
        out[k] = Number.isFinite(n) ? n : null;
      } else if (val && typeof val === "object") {
        out[k] = coerce(val);
      } else {
        out[k] = val;
      }
    }
    return out as T;
  }
  return v;
}

// A GET that treats HTTP 404 as a soft "not found yet" (null), used by the
// warm-context read: /context/account/{id} 404s until the account is refreshed.
class NotFoundError extends Error {}

// Error bodies can be large (a proxy 502 / dev-server 404 returns a full HTML
// page); cap what we surface so an error never dumps kilobytes of markup into a
// card. FastAPI's own errors are short JSON and survive this untouched.
async function errBody(r: Response): Promise<string> {
  const t = (await r.text().catch(() => "")).trim();
  return t.length > 280 ? `${t.slice(0, 280)}…` : t;
}

async function get<T>(path: string): Promise<T> {
  if (DEMO) { await sleep(180); return coerce<T>(demoResponse("GET", path) as T); }
  const r = await fetch(`/pipeline${path}`, { headers: headers(), cache: "no-store" });
  if (r.status === 404) throw new NotFoundError(`GET ${path} → 404`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}: ${await errBody(r)}`);
  return coerce<T>(await r.json());
}

async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    return await get<T>(path);
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    throw e;
  }
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  if (DEMO) { await sleep(220); return coerce<T>(demoResponse("POST", path, body) as T); }
  const r = await fetch(`/pipeline${path}`, {
    method: "POST", headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`POST ${path} → ${r.status}: ${await errBody(r)}`);
  return coerce<T>(await r.json());
}

// ---- Types ----------------------------------------------------------------

// Warehouse account row (GET /pipeline/accounts → pipeline.latest_accounts).
export type Account = {
  sfdc_account_id: string;
  account_name: string | null;
  account_number: string | null;
  account_owner: string | null;
  account_status: string | null;
  adlib_industry: string | null;
  industry: string | null;
  revenue_range_usd: string | null;
  segment: string | null;
  region: string | null;
  focus_account: boolean;
  top_50: boolean;
  rag_status: string | null;   // Green / Amber / Red
  churn_risk: string | null;
  current_software_version: string | null;
  adlib_ecosystem: string | null;
  other_technologies: string | null;
};

// Warm-context record (GET /pipeline/context/account/{id} →
// pipeline.account_context). Null when the account hasn't been refreshed yet.
export type NextTouch = {
  subject: string | null;
  activity_date: string | null;
  type: string | null;
  account_id?: string | null;
  account_name?: string | null;
} | null;
export type RecentActivity = {
  subject: string | null;
  date: string | null;
  status: string | null;
  type: string | null;
  kind: "task" | "event" | string;
};
export type KeyContact = { id: string | null; name: string | null; title: string | null };
export type OpenOpp = {
  id: string | null;
  name: string | null;
  stage: string | null;
  nnacv: number | null;
  close_date: string | null;
};
export type AccountContext = {
  sfdc_account_id: string;
  account_name: string | null;
  owner: string | null;
  adlib_industry: string | null;
  tier: string | null;
  open_opp_count: number | null;
  open_pipeline_nnacv: number | null;
  last_activity_date: string | null;
  next_touch: NextTouch;
  recent_activity: RecentActivity[];
  key_contacts: KeyContact[];
  open_opps: OpenOpp[];
  refreshed_at?: string | null;
};

// Change event (GET /pipeline/change-events → pipeline.change_events). The feed
// substrate for "what matters now"; owner-/segment-scoped server-side.
export type ChangeEvent = {
  detected_date: string | null;
  event_type: string;
  severity: number;          // SEVERITY: info 0 · low 1 · medium 2 · high 3 · critical 4
  sfdc_opportunity_id: string | null;
  sfdc_account_id: string | null;
  owner: string | null;
  adlib_industry: string | null;
  summary: string | null;
  from_value: string | null;
  to_value: string | null;
  detail: Record<string, unknown> | null;
  created_at: string | null;
};
export type ChangeEventsResult = {
  detected_date: string | null;
  count: number;
  events: ChangeEvent[];
};

// Agent loop result (POST /pipeline/agent). WRITE tools STAGE a proposal at the
// human-approval gate; nothing writes to Salesforce in-loop. `degraded` is true
// when the LiteLLM proxy was unreachable (off-cluster): no tools ran, nothing
// staged — a graceful state to render distinctly from a hard error.
export type AgentToolCall = { name: string; args: Record<string, unknown>; ok: boolean };
export type AgentResult = {
  answer_text: string;
  tool_calls: AgentToolCall[];
  staged_writes: Array<Record<string, unknown>>;
  iterations: number;
  degraded?: boolean;
};

// Grounded analytics result (POST /pipeline/ask). The question is mapped to ONE
// whitelisted metric (never raw SQL) run against live Salesforce; the answer is
// written from the returned numbers. metric=null means it couldn't map — then
// `suggestions` lists what it CAN answer. table.rows are dicts keyed by the
// column names in table.columns.
export type AskTable = { columns: string[]; rows: Array<Record<string, unknown>> } | null;
export type AskChart = { type: string; x: string; y: string; unit?: string | null } | null;
export type AskResult = {
  answer_text: string;
  metric: string | null;
  params: Record<string, unknown>;
  table: AskTable;
  chart_spec: AskChart;
  source: string | null;
  as_of: string | null;
  suggestions?: string[];
};

// Viewer identity + scope (GET /me). Resolved server-side; drives which
// scorecard Performance shows (an AE sees their own, an XDR/CSM their card, a
// manager the team). book==null means the count failed (not an empty book).
export type Viewer = {
  email: string;
  role: "manager" | "gm" | "ae";
  owner: string | null;          // AE's SFDC User.Name (== Opportunity Owner.Name)
  segment: string | null;        // GM's industry ("Life Sciences" | "Insurance")
  is_xdr?: boolean;              // BDR/SDR — scopes like an AE but owns no opps
  is_csm?: boolean;             // CSM — scopes like an AE but owns no opps
  book?: { open_opps: number; open_leads: number } | null;
};

// The three metric-grid scorecards share a cell shape: a value + a RAG + an
// optional WoW/MoM trend. Performance renders all three through one grid.
export type Rag = "green" | "amber" | "red" | "na";
export type ScoreUnit = "usd" | "count" | "pct" | "days";
export type ScoreTrend = { prev?: number; prev_week?: string; delta?: number };
export type ScoreCell = { value: number | null; rag: Rag } & ScoreTrend;

export type RepMetric = { key: string; label: string; target: number | null; unit: ScoreUnit; grade?: boolean };
export type RepScorecardRow = { seller: string; open_opps: number; cells: Record<string, ScoreCell> };
export type RepScorecard = {
  as_of: string; window: string; scope: string;
  source?: string | null; data_as_of?: string | null;
  metrics: RepMetric[]; reps: RepScorecardRow[]; viewer?: Viewer;
  note?: string; compare?: "wow" | "mom";
};

export type XdrMetric = { key: string; label: string; target: number | null; unit: "pct" | "count"; dir: "gte" | "info"; grade?: boolean };
export type XdrColumn = { name: string; cells: Record<string, ScoreCell> };
export type XdrScorecard = {
  as_of: string | null; window: string; note?: string;
  metrics: XdrMetric[]; xdrs: XdrColumn[];
};

export type CsmMetric = { key: string; label: string; target: number | null; unit: ScoreUnit; dir: "gte" | "lte" | "info" };
export type CsmColumn = { name: string; accounts: number; py_acv: number; cells: Record<string, ScoreCell> };
export type CsmScorecard = {
  as_of: string | null; source: string | null; basis: string | null; note?: string;
  data_as_of?: string | null;
  metrics: CsmMetric[]; csms: CsmColumn[];
};

// RevOS roadmap — the single ranked list everyone sees (GET /roadmap).
export type RoadmapStatus = "shipped" | "in_progress" | "next" | "backlog";
export type RoadmapItem = { title: string; status: RoadmapStatus; requester?: string; ref?: string; detail?: string };
export type RoadmapMilestone = { id: string; when: string; title: string; status: RoadmapStatus; detail?: string };
export type RoadmapDecision = { question: string; why: string; owner: string };
export type Roadmap = {
  updated: string; owner: string; vision: string; principles: string[];
  milestones: RoadmapMilestone[]; items: RoadmapItem[]; decisions_needed: RoadmapDecision[];
};

// RevOS intake — bugs / questions / ideas filed from inside the app. The
// requester is stamped server-side from the session, never sent by the client.
export type RequestKind = "bug" | "question" | "idea" | "data";
export type RevosRequestInput = { kind: RequestKind; title: string; detail?: string; surface?: string };
export type RevosRequestRow = {
  id: number; created_at: string; requester: string; kind: RequestKind;
  title: string; detail: string | null; surface: string | null;
  status: string; source: string; triage_note: string | null;
};

// Prospecting requests — sellers request contacts for target accounts; Clay stays
// central and an automated worker fulfills into Salesforce as leads they own. The
// requester is stamped server-side. accounts/result come back as jsonb.
export type ProspectingAccountInput = { name?: string; domain: string };
export type ProspectingRequestInput = {
  accounts: ProspectingAccountInput[];
  personas: string[];
  needs?: string[];
  max_per_account?: number;
  notes?: string;
};
export type ProspectingRequestRow = {
  id: number; created_at: string; requester: string;
  accounts: ProspectingAccountInput[]; personas: string[]; needs: string[];
  max_per_account: number; notes: string | null; status: string;
  result: { created_leads?: number; found?: number } | null;
  fulfilled_at: string | null; error: string | null;
};

// Open pipeline by stage — count, dollars, and how long deals have sat there.
export type VelocityStage = {
  stage: string; count: number; amount_usd: number;
  median_days_in_stage: number | null; p90_days_in_stage: number | null;
  median_age_days: number | null;
};
export type FunnelVelocity = {
  as_of: string; scope: string; total_count: number; total_amount_usd: number;
  stages: VelocityStage[]; note: string; viewer?: Viewer;
};

// ---- Endpoints ------------------------------------------------------------

export const api = {
  accounts: (params: { industry?: string; owner?: string; rag?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") q.set(k, String(v)); });
    const qs = q.toString();
    return get<Account[]>(`/accounts${qs ? `?${qs}` : ""}`);
  },
  // Null when the account_context row hasn't been materialized yet (404) — the
  // UI shows a "warming up" state instead of an error.
  accountContext: (id: string) => getOrNull<AccountContext>(`/context/account/${encodeURIComponent(id)}`),
  // account_id narrows to one account server-side (within the viewer's role
  // scope) — the Accounts deep-dive passes it so left_pipeline events, whose opp
  // is no longer open, still surface on their account instead of being dropped.
  changeEvents: (params: { owner?: string; event_type?: string; account_id?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") q.set(k, String(v)); });
    const qs = q.toString();
    return get<ChangeEventsResult>(`/change-events${qs ? `?${qs}` : ""}`);
  },
  agent: (instruction: string) => post<AgentResult>("/agent", { instruction }),
  // Grounded pipeline analytics — one whitelisted metric, live SFDC, no raw SQL.
  ask: (question: string) => post<AskResult>("/ask", { question }),

  // Performance — all viewer-scoped server-side (an AE sees their own book, a GM
  // their segment, a manager the team). We pass segment only for a GM, mirroring
  // the scorecard app; the server pins an AE to their own records regardless.
  me: () => get<Viewer>("/me"),
  repScorecard: (params: { segment?: string; compare?: "wow" | "mom" } = {}) => {
    const q = new URLSearchParams();
    if (params.segment) q.set("segment", params.segment);
    if (params.compare) q.set("compare", params.compare);
    const qs = q.toString();
    return get<RepScorecard>(`/rep-scorecard${qs ? `?${qs}` : ""}`);
  },
  xdrScorecard: () => get<XdrScorecard>("/xdr-scorecard"),
  csmScorecard: () => get<CsmScorecard>("/csm-scorecard"),
  funnelVelocity: (params: { segment?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.segment) q.set("segment", params.segment);
    const qs = q.toString();
    return get<FunnelVelocity>(`/funnel-velocity${qs ? `?${qs}` : ""}`);
  },

  // Roadmap — the single ranked list everyone sees, plus the in-app intake.
  roadmap: () => get<Roadmap>("/roadmap"),
  submitRevosRequest: (body: RevosRequestInput) =>
    post<{ id: number; created_at: string; kind: string; status: string }>("/revos-request", body),
  revosRequests: (status?: string) =>
    get<{ count: number; requests: RevosRequestRow[] }>(
      `/revos-requests${status ? `?status=${encodeURIComponent(status)}` : ""}`),

  // Clay request — request contacts for target accounts; a worker enriches them
  // into Salesforce as leads you own. No Clay seat needed.
  submitProspectingRequest: (body: ProspectingRequestInput) =>
    post<{ id: number; created_at: string; status: string; accounts: number; estimated_contacts: number }>(
      "/prospecting-request", body),
  prospectingRequests: (status?: string) =>
    get<{ count: number; requests: ProspectingRequestRow[] }>(
      `/prospecting-requests${status ? `?status=${encodeURIComponent(status)}` : ""}`),
};

// ---- Formatting helpers ---------------------------------------------------

export function currencyFmt(n: number | null | undefined): string {
  if (!n) return "$0";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

// A warehouse RAG status → a three-level risk tier for pills / dots.
export type RiskTier = "hi" | "md" | "lo" | "na";
export function ragToTier(rag: string | null | undefined): RiskTier {
  const r = (rag || "").trim().toLowerCase();
  if (r === "red") return "hi";
  if (r === "amber" || r === "yellow") return "md";
  if (r === "green") return "lo";
  return "na";
}
export function tierLabel(tier: RiskTier): string {
  return tier === "hi" ? "At risk" : tier === "md" ? "Watch" : tier === "lo" ? "Healthy" : "Unrated";
}

// change_events.severity → the same three-level dot scale as the mock.
export function severityToTier(sev: number | null | undefined): RiskTier {
  const s = Number(sev ?? -1);
  if (s >= 3) return "hi";   // high / critical
  if (s === 2) return "md";  // medium
  if (s >= 0) return "lo";   // low / info
  return "na";
}

// event_type → the true source system + a short chip label. Every change_events
// row today is derived from the daily Salesforce state diff, so the honest
// source label is "salesforce"; the event_type carries the specifics.
const EVENT_LABELS: Record<string, string> = {
  stage_slip: "Stage slipped",
  stage_advance: "Stage advanced",
  close_date_push: "Close date pushed",
  activity_quiet: "Gone quiet",
  pipeline_value_drop: "ACV dropped",
  pipeline_value_jump: "ACV rose",
  next_step_cleared: "Next step cleared",
  left_pipeline: "Left pipeline",
  new_deal: "New deal",
};
export function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] || eventType.replace(/_/g, " ");
}
export function eventSource(_eventType: string): string {
  // All current change_events originate from the daily Salesforce state capture.
  return "salesforce";
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function daysAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
