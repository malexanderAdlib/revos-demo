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
// NOTE: only add SPECIFIC money/count field names here. Never add generic keys
// like "value" / "delta" / "running" — coerce() would then Number()-clobber
// AgentResult.staged_writes[].value (a string) and Wow mover-delta strings across
// every endpoint. (Caught in the Cube-port review.)
const NUM_FIELDS = new Set([
  "open_pipeline_nnacv", "open_opp_count", "nnacv", "amount", "net_new_acv_y1",
  "severity", "open_amount", "pipe_usd", "connect_rate",
  "amount_usd", "total_amount_usd", "net_new_acv_y1_native", "amount_native",
  "open_nnacv", "cw_nnacv",
  // Forecast money — SPECIFIC keys only. Deliberately NOT delta/running/value:
  // the forecast waterfall steps carry delta/running, but those are coerced
  // locally in ForecastView so the generic names stay out of NUM_FIELDS.
  "inside_call", "outside_call", "inside_plus_won", "won_to_date",
  "churn", "downsell", "incr_arr", "plan", "gap", "commit", "upside", "uncategorized",
  "new_logo_nnacv", "cross_sell_nnacv", "win_rate_pct", "insurance_wr",
  "this_week_total", "last_week_total",   // WoW totals — mover value/delta coerced in-component
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

// Partner pipeline (Cube tab). Two views keyed by the PARTNER NAME: SOURCED = who
// brought the deal (Sourcing_Partner__c) + their motion; CONTRACTING = whose paper
// it's on (Partner__c) + the contracting motion. Channel Type (Sales_Type__c) is a
// cross-check only — the free field Sharon distrusts.
export type PartnerDeal = {
  id: string; name: string | null; account: string | null; stage: string | null;
  nnacv: number; motion: string | null; lead_source: string | null;
};
export type PartnerMotion = { motion: string; count: number; nnacv: number };
export type PartnerRollup = {
  partner: string; nnacv: number; count: number;
  motions: PartnerMotion[]; deals: PartnerDeal[];
};
export type PartnerChannel = { channel: string; count: number; nnacv: number };
export type Partner = {
  as_of: string;
  basis: string;
  note?: string;
  totals: {
    partner_channel_nnacv: number;
    sourced_nnacv: number;
    contracting_nnacv: number;
    influenced_nnacv: number;
  };
  sourced_by_partner: PartnerRollup[];
  contracting_by_partner: PartnerRollup[];
  by_channel: PartnerChannel[];
  inbound_leads?: { total: number; fy_cohort: number; mql: number; sql: number; oppty: number; active: number };
};

// Account 360 (Sharon/Chris 8/6) — activity evidence per seller-owned account,
// ported from the scorecard app into the Scorecard tab. Touches are Salesforce
// Tasks + Events (email / call / LinkedIn / meeting) over a trailing window;
// touches/week is derived client-side from touches and window_days.
export type Account360Row = {
  account_id: string; name: string | null; owner: string | null;
  industry: string | null; account_status: string | null; rag: string | null;
  open_opp_count: number; open_amount: number;
  contacts: number; emails: number; calls: number; linkedin: number; meetings: number;
  touches: number; last_touch: string | null; days_since: number | null;
  bucket: "in_quarter" | "next_quarter" | null;
  stalled: boolean; single_thread: boolean; sfdc_url: string;
};
export type Account360 = {
  as_of: string; scope: string; window_days: number;
  counts: {
    accounts: number; with_open_pipe: number; stalled: number; stalled_with_pipe: number;
    single_thread: number; single_thread_with_pipe: number; no_touch_window: number; in_quarter: number;
  };
  rows: Account360Row[];
  viewer?: Viewer;
};

// Deal Activity (Sharon 8/7) — rep productivity on the Q3/Q4 forecast opps:
// per-opp activity over a trailing window (email/call/meeting logged ON the
// opportunity), contact-role count, next-step, last-touch. The deal-grain
// complement to Account 360. No LinkedIn column — Regie logs LinkedIn to
// leads/contacts, not opps.
export type DealActivityRow = {
  opp_id: string; name: string | null; account: string | null; account_id: string | null;
  owner: string | null; stage: string | null; amount: number; close_date: string | null;
  quarter: "Q3" | "Q4"; next_step: string | null;
  emails: number; calls: number; meetings: number; touches: number;
  contacts: number; last_activity: string | null; days_since: number | null;
  stalled: boolean; single_thread: boolean; no_next_step: boolean; sfdc_url: string;
};
export type DealActivity = {
  as_of: string; scope: string; window_days: number;
  counts: {
    opps: number; q3: number; q4: number; pipe_usd: number; stalled: number;
    single_thread: number; no_next_step: number; no_touch_window: number;
  };
  rows: DealActivityRow[];
  viewer?: Viewer;
};

// Call Blitz (Alex 8/17) — one day of concentrated dialling, per AE, plus a
// history strip so multiple blitzes compare. Meetings come from two independent
// sources kept separable on purpose: a call dispositioned "Meeting Scheduled",
// and the rep's own Outlook calendar (the real source; null = mailbox not
// readable, shown "—" not 0). Event logging is patchy, so meetings are a floor.
export type BlitzRep = {
  name: string; dials: number; connects: number; connect_rate: number | null;
  meetings: number; meetings_from_calls: number; meetings_from_events: number;
  meetings_from_calendar: number | null;
  in_sequence: number | null;
  bad_data: number; no_answer: number; untagged: number;
};
export type BlitzDay = { day: string; dials: number; connects: number; meetings: number; reps_dialling: number };
export type CallBlitz = {
  day: string; as_of: string; active_reps: number;
  reps: BlitzRep[];
  totals: {
    dials: number; connects: number; connect_rate: number | null; meetings: number;
    meetings_from_calls: number; meetings_from_events: number;
    meetings_from_calendar: number; meetings_calendar_blind: number;
    in_sequence: number; bad_data: number;
  };
  history: BlitzDay[];
  note?: string;
  viewer?: Viewer;
};

// Meetings Booked (Sharon 8/19) — forward-looking: the customer meetings each AE
// has SET on their Outlook calendar over the next few weeks (organiser-filtered,
// recurring series deduped, attendees narrowed to real Salesforce customers).
// A booked meeting lives in the calendar, not Regie or a Salesforce Event, which
// is why the blitz/Regie counts read low. count === null = mailbox not in the
// calendar-read group (shown "—", not a false zero).
export type MtgRow = { start: string; subject: string; customer: string };
export type MtgRep = { name: string; count: number | null; meetings: MtgRow[] };
export type MeetingsBooked = {
  as_of: string; days_ahead: number;
  reps: MtgRep[];
  totals: { booked: number; reps_with_meetings: number; reps_blind: number };
  note?: string;
  viewer?: Viewer;
};

// Raw opportunity row (GET /pipeline/opps → the weekly pipeline snapshot). The
// Cube's client-aggregated views (Open, Created, Industry, New Logo, Summary)
// fetch this once and roll it up with sumBy(). MONEY METRIC is net_new_acv_y1
// (Net New ACV Yr1), NEVER amount (that's TCV — Sharon's rule). Mirrors the
// pipeline-dashboard Opp shape so the Cube stays drift-checked against the API.
export type Opp = {
  sfdc_opportunity_id: string;
  opportunity_name: string | null;
  account_name: string | null;
  opportunity_owner: string | null;
  stage: string | null;
  forecast_category: string | null;            // SFDC stock: Pipeline / Best Case / Commit / Omitted / Closed
  manager_forecast_category: string | null;    // Sharon's overlay; "Omitted" = not pipeline (excluded from the total)
  churn_risk: string | null;
  opportunity_record_type: string | null;      // New Business / Expansion / Renewal
  fiscal_period: string | null;                // "Q3-2026"
  adlib_industry: string | null;
  net_new_acv_y1: number | null;               // USD-converted — the money metric
  net_new_acv_y1_native: number | null;        // native currency
  amount: number | null;                       // USD-converted TCV (not the money metric)
  amount_native: number | null;
  amount_currency: string | null;              // ISO code (USD, EUR, GBP, CAD, AUD)
  close_date: string | null;
  created_date: string | null;
  type: string | null;                         // Software / Services
  new_business_type: string | null;
  sales_motion: string | null;
  channel_type: string | null;                 // Sales_Type__c — the free field (cross-check)
  lead_source: string | null;
  revenue_range_usd: string | null;
  excluded: boolean;
  excluded_reason: string | null;
};

// The shared shape every CSS bar chart consumes: one labelled bar.
export type Bucket = { key: string; value: number };

// Pipeline by industry (Cube). One row per Adlib_Industry: OPEN pipeline (count +
// NN ACV Yr1, Omitted excluded) and CLOSED-WON FYTD. Money is Net New ACV Yr1.
// NOTE: /industry is a net-new backend aggregation for live — demo-only today.
export type IndustryRow = {
  industry: string;
  open_opps: number;
  open_nnacv: number;
  cw_opps: number;
  cw_nnacv: number;
};
export type Industry = {
  as_of: string; scope: string; basis: string; note?: string;
  totals: { open_opps: number; open_nnacv: number; cw_opps: number; cw_nnacv: number };
  rows: IndustryRow[];
  viewer?: Viewer;
};

// Summary (Cube landing) — one pre-aggregated payload: headline open-pipeline
// KPIs, the report-aligned scorecard tie-out, the week-over-week top-line, the
// marketing lead funnel, renewals-by-churn-risk RAG bands, top accounts, and
// every open-pipeline breakdown as a Bucket. MONEY = Net New ACV Yr1; open
// excludes Manager_Forecast_Category "Omitted". /summary is a net-new backend
// aggregation for live — demo fixture today.
export type SummaryOpen = {
  nnacv: number; count: number; omitted_value: number;
  in_quarter_nnacv: number; in_quarter_count: number; period: string;
};
export type SummaryScorecard = {
  basis: string; source?: string | null; data_as_of?: string | null; period?: string;
  active_accounts: number; active_prior_year_acv: number;
  closed_won_cy: { count: number; value_final_year: number; value_year1: number };
  downsell_cy: { count: number; value_year1: number };
  churn_forecast: { value: number };
  created_fytd: { count: number; value: number };
  new_logo_open: { count: number; value: number };
};
export type WowMover = { name: string; account: string; owner: string; stage?: string; value: number; delta?: number };
export type SummaryWow = {
  available: boolean; reason?: string;
  this_week?: string; last_week?: string;
  this_week_total?: number; last_week_total?: number; delta?: number;
  counts?: { new: number; gone: number; increased: number; decreased: number };
  new?: WowMover[]; gone?: WowMover[]; increased?: WowMover[]; decreased?: WowMover[];
};
export type SummaryFunnelStage = { stage: string; count: number; conv_from_prev: number | null };
export type SummaryLead = {
  active_leads?: number; overall_lead_to_oppty_pct: number;
  stages: SummaryFunnelStage[];
  by_source?: { source: string; leads: number }[];
  by_industry?: { industry: string; leads: number }[];
};
export type RenewalBand = { band: "Red" | "Amber" | "Green" | "Unrated"; value: number; count: number };
export type TopAccount = { acct: string; industry: string; owner: string; value: number };
export type Summary = {
  as_of: string; scope: string; basis: string; note?: string;
  open: SummaryOpen;
  scorecard: SummaryScorecard;
  wow: SummaryWow;
  lead?: SummaryLead | null;
  renewals_rag: RenewalBand[];
  top_accounts: TopAccount[];
  by_industry_group: Bucket[];
  by_type: Bucket[];
  by_industry: Bucket[];
  exp_by_sales_motion: Bucket[];
  by_manager_forecast: Bucket[];
  by_stage: Bucket[];
  by_period: Bucket[];
  by_owner: Bucket[];
  by_source: Bucket[];
  by_rev_range: Bucket[];
  viewer?: Viewer;
};

// Forecast (Cube) — build-to-plan for the quarter, computed server-side from the
// Manager Forecast field (Sharon 8/6: no weekly spreadsheet). The Manager-Forecast
// rollup (Commit/Upside/Uncategorized), the Inside/Outside-the-Call roll-up, and a
// New Logo → Cross-sell → Migrations → Capacity → Renewal Uplift → Churn → Gap →
// Plan waterfall. churn/downsell are POSITIVE magnitudes (rendered with a leading
// −); gap is signed. /forecast exists in the backend. Waterfall step delta/running
// are coerced in the component (kept out of NUM_FIELDS on purpose).
export type ForecastStepKind = "build" | "risk" | "subtotal" | "gap" | "total";
export type ForecastStep = { label: string; delta: number; running: number; kind: ForecastStepKind };
export type Forecast = {
  as_of: string; period: string; basis: string; note?: string;
  commit: number; commit_opps: number;
  upside: number; upside_opps: number;
  uncategorized: number;
  inside_call: number; outside_call: number;
  inside_plus_won: number; won_to_date: number;
  opps_in_call: number; opps_total: number;
  churn: number; downsell: number; incr_arr: number;
  plan: number; gap: number;
  waterfall: ForecastStep[];
};

// New Logo (Cube) — new-logo pipeline vs cross-sell/renewal by period, new-logo
// closed-won FYTD, and the new-logo win-rate trend. Split is new_business_type ===
// "New Logo"; money is Net New ACV Yr1; open excludes Omitted. Pre-aggregated
// server-side (net-new backend route for live — demo fixture today).
export type NewLogoOpp = {
  id: string; name: string | null; account: string | null;
  record_type: string | null; stage: string | null; owner: string | null;
  industry: string | null; fiscal_period: string | null; net_new_acv_y1: number;
};
export type NewLogoPeriod = { period: string; new_logo_nnacv: number; cross_sell_nnacv: number };
export type NewLogoCwPeriod = { period: string; nnacv: number };
export type NewLogoWinRate = { period: string; won: number; lost: number; win_rate_pct: number | null };
export type NewLogo = {
  as_of: string; basis: string; note?: string;
  totals: {
    open_new_logo_nnacv: number; open_new_logo_count: number;
    open_cross_sell_nnacv: number; open_cross_sell_count: number;
    new_logo_cw_nnacv: number; new_logo_cw_wins: number;
    cross_sell_cw_nnacv: number; cross_sell_cw_wins: number;
  };
  by_period: NewLogoPeriod[];
  cw_by_period: NewLogoCwPeriod[];
  win_rate_by_period: NewLogoWinRate[];
  open_detail: NewLogoOpp[];
};

// Win rate by revenue type (Cube · Sharon 8/21) — won/(won+lost) by COUNT
// (royalty/RMS/Dassault excluded), split Insurance / Life Sciences / Other,
// across Current FY / Trailing 12mo / Multi-year (one payload; window is a client
// toggle). Counts + percentages only, no money. /win-rate-by-rev-type is live.
export type WinRateBucket = { bucket: string; won: number; lost: number; n: number; win_rate_pct: number | null };
export type WinRateByYear = { fy: number; won: number; lost: number; n: number; win_rate_pct: number | null; insurance_wr: number | null };
export type WinRateWindow = { label: string; buckets: WinRateBucket[]; by_year?: WinRateByYear[] };
export type WinRateByRevType = {
  as_of: string; source: string; note: string;
  windows: { current_fy: WinRateWindow; ttm: WinRateWindow; multi_year: WinRateWindow };
};

// Exclusions (Cube) — accounts deliberately held OUT of the pipeline rollups,
// and why (royalty/OEM revenue, Dassault/RMS resale, dormant book). Read-only;
// /exclusions/opportunities stays live server-side (still filters the cube) but
// is intentionally not surfaced. All fields are string/boolean — no NUM_FIELDS.
export type Exclusion = {
  account_name?: string;
  opportunity_name?: string;
  sfdc_account_id?: string;
  sfdc_opportunity_id?: string;
  reason: string;
  reason_detail: string | null;
  added_by: string;
  added_at: string;
  active: boolean;
};

// Week-over-Week (Cube) — deal-level diff of the two most recent OPEN snapshots
// on NN ACV Yr1. Same shape as SummaryWow (reused, not re-declared); WowMover is
// the shared mover type. available=false until two snapshots exist to diff (the
// live default today — daily capture is off). /wow is live.
export type Wow = SummaryWow;

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

  // Scorecard deep-dive — Account 360 (activity evidence per seller-owned
  // account). Viewer-scoped server-side; the header email pins an AE to their book.
  account360: () => get<Account360>("/account-360"),
  // Scorecard deep-dive — Deal Activity (per-opp activity on the Q3/Q4 forecast).
  dealActivity: () => get<DealActivity>("/deal-activity"),
  // Scorecard deep-dive — Call Blitz (one day of dialling per AE + history strip).
  callBlitz: (params: { day?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.day) q.set("day", params.day);
    const qs = q.toString();
    return get<CallBlitz>(`/call-blitz${qs ? `?${qs}` : ""}`);
  },
  // Scorecard deep-dive — Meetings Booked (forward-looking calendar meetings).
  meetingsBooked: () => get<MeetingsBooked>("/meetings-booked"),

  // Cube — partner pipeline (sourced + contracting, keyed on partner name).
  partner: () => get<Partner>("/partner"),
  // Cube — pipeline by industry (open NN ACV + closed-won FYTD per vertical).
  industry: () => get<Industry>("/industry"),
  // Cube — summary (headline pipeline KPIs, tie-out tiles, breakdowns).
  summary: () => get<Summary>("/summary"),
  // Cube — forecast (build-to-plan waterfall + manager-forecast rollup).
  forecast: () => get<Forecast>("/forecast"),
  // Cube — new-logo pipeline vs cross-sell/renewal, CW FYTD, win-rate trend.
  newLogo: () => get<NewLogo>("/new-logo"),
  // Cube — win rate by rev type across Current FY / Trailing 12mo / Multi-year.
  winRateByRevType: () => get<WinRateByRevType>("/win-rate-by-rev-type"),
  // Cube — account exclusions (read-only): accounts held out of the cube + why.
  accountExclusions: () => get<Exclusion[]>("/exclusions/accounts"),
  // Cube — week-over-week deal movers (diff of the latest two open snapshots).
  wow: () => get<Wow>("/wow"),
  // Cube — raw opps for the client-aggregated views (Open, Created, Industry,
  // New Logo, Summary). Viewer-scoped server-side; rolled up client-side.
  opps: (params: {
    snapshot_type?: "open" | "total" | "created" | "cw";
    industry?: string; owner?: string; stage?: string; fiscal_period?: string; limit?: number;
  } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") q.set(k, String(v)); });
    const qs = q.toString();
    return get<Opp[]>(`/opps${qs ? `?${qs}` : ""}`);
  },
};

// Group rows, sum a value per key; null keys → "Unknown"; sorted descending.
// The Cube views feed the result straight into the CSS bar charts.
export function sumBy<T>(
  rows: T[],
  keyFn: (r: T) => string | null | undefined,
  valueFn: (r: T) => number | null | undefined,
): Bucket[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r) || "Unknown";
    map.set(k, (map.get(k) || 0) + Number(valueFn(r) || 0));
  }
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

// Chronological sort for "Qn-YYYY" fiscal-period buckets (for by-period bar
// charts); drops zero-value periods so empty quarters don't render flat bars.
export function sortByPeriod(rows: Bucket[]): Bucket[] {
  const key = (s: string): number => {
    const m = /^Q(\d)-(\d{4})$/.exec(s);
    return m ? Number(m[2]) * 10 + Number(m[1]) : Number.MAX_SAFE_INTEGER;
  };
  return rows.filter((r) => r.value > 0).sort((a, b) => key(a.key) - key(b.key));
}

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
