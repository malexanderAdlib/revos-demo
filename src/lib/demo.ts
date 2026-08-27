// Demo-mode fixtures for the Vercel preview.
//
// RevOS talks to an internal-only backend (gtm-agent.adlibsys.com, NXDOMAIN off
// the VPN), so a public preview has nothing to fetch. When NEXT_PUBLIC_DEMO=1
// the api client (lib/api.ts) short-circuits every call to `demoResponse` below
// and renders this coherent SAMPLE dataset instead — so the whole product shows
// and clicks through without a backend, budget, or SSO.
//
// The data is SYNTHETIC on purpose: no real Adlib customer names or numbers ever
// leave the VPN on this link. Types are imported (type-only, no runtime cycle) so
// the build fails loudly if a fixture drifts from the real API shape.

import type {
  Account, AccountContext, ChangeEvent, ChangeEventsResult, Viewer,
  RepScorecard, XdrScorecard, CsmScorecard, FunnelVelocity, Roadmap,
  RevosRequestRow, ProspectingRequestRow, Partner, AskResult, AgentResult, ScoreCell, Rag,
  Account360, Account360Row, DealActivity, DealActivityRow, CallBlitz, MeetingsBooked,
  Opp, Industry, Summary, Forecast, NewLogo, WinRateByRevType, Exclusion, Wow,
} from "./api";

// Dates relative to "now" so the preview always looks current.
const iso = (daysFromNow: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};
const ts = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

const OWNERS = ["Jordan Reyes", "Priya Nair", "Sam Whitfield", "Diego Alvarez", "Casey Lin"];

// ---- Accounts -------------------------------------------------------------
const ACCOUNTS: Account[] = [
  {
    sfdc_account_id: "acc_001", account_name: "Meridian Life Sciences", account_number: "AD-10241",
    account_owner: "Jordan Reyes", account_status: "Active", adlib_industry: "Life Sciences",
    industry: "Pharmaceuticals", revenue_range_usd: "$1B–$5B", segment: "Enterprise", region: "NA",
    focus_account: true, top_50: true, rag_status: "Red", churn_risk: "High",
    current_software_version: "6.5", adlib_ecosystem: "Veeva", other_technologies: "Documentum",
  },
  {
    sfdc_account_id: "acc_002", account_name: "Cascade Mutual Insurance", account_number: "AD-10188",
    account_owner: "Priya Nair", account_status: "Active", adlib_industry: "Insurance",
    industry: "P&C Insurance", revenue_range_usd: "$500M–$1B", segment: "Enterprise", region: "NA",
    focus_account: true, top_50: true, rag_status: "Amber", churn_risk: "Medium",
    current_software_version: "Transform", adlib_ecosystem: "Guidewire", other_technologies: "Duck Creek",
  },
  {
    sfdc_account_id: "acc_003", account_name: "Orion Manufacturing", account_number: "AD-10312",
    account_owner: "Sam Whitfield", account_status: "Active", adlib_industry: "Manufacturing",
    industry: "Industrial", revenue_range_usd: "$250M–$500M", segment: "Mid-Market", region: "EMEA",
    focus_account: false, top_50: false, rag_status: "Green", churn_risk: "Low",
    current_software_version: "Transform", adlib_ecosystem: "SAP", other_technologies: "OpenText",
  },
  {
    sfdc_account_id: "acc_004", account_name: "Brightpath Bio", account_number: "AD-10077",
    account_owner: "Jordan Reyes", account_status: "Active", adlib_industry: "Life Sciences",
    industry: "Biotech", revenue_range_usd: "$100M–$250M", segment: "Mid-Market", region: "NA",
    focus_account: true, top_50: false, rag_status: "Green", churn_risk: "Low",
    current_software_version: "Transform", adlib_ecosystem: "Veeva", other_technologies: "—",
  },
  {
    sfdc_account_id: "acc_005", account_name: "Summit Energy Partners", account_number: "AD-10405",
    account_owner: "Diego Alvarez", account_status: "Active", adlib_industry: "Energy",
    industry: "Utilities", revenue_range_usd: "$1B–$5B", segment: "Enterprise", region: "NA",
    focus_account: true, top_50: true, rag_status: "Amber", churn_risk: "Medium",
    current_software_version: "6.5", adlib_ecosystem: "OpenText", other_technologies: "SharePoint",
  },
  {
    sfdc_account_id: "acc_006", account_name: "Harbor Point Assurance", account_number: "AD-10219",
    account_owner: "Priya Nair", account_status: "Active", adlib_industry: "Insurance",
    industry: "Specialty Insurance", revenue_range_usd: "$250M–$500M", segment: "Mid-Market", region: "NA",
    focus_account: false, top_50: false, rag_status: "Red", churn_risk: "High",
    current_software_version: "6.5", adlib_ecosystem: "Sapiens", other_technologies: "AMS360",
  },
  {
    sfdc_account_id: "acc_007", account_name: "Vanta Pharmaceuticals", account_number: "AD-10163",
    account_owner: "Casey Lin", account_status: "Active", adlib_industry: "Life Sciences",
    industry: "Pharmaceuticals", revenue_range_usd: "$5B+", segment: "Enterprise", region: "EMEA",
    focus_account: true, top_50: true, rag_status: "Amber", churn_risk: "Medium",
    current_software_version: "Transform", adlib_ecosystem: "Veeva", other_technologies: "Box",
  },
  {
    sfdc_account_id: "acc_008", account_name: "Ironclad Industrial", account_number: "AD-10358",
    account_owner: "Sam Whitfield", account_status: "Active", adlib_industry: "Manufacturing",
    industry: "Heavy Equipment", revenue_range_usd: "$500M–$1B", segment: "Enterprise", region: "APAC",
    focus_account: false, top_50: false, rag_status: "Green", churn_risk: "Low",
    current_software_version: "Transform", adlib_ecosystem: "SAP", other_technologies: "—",
  },
];

// ---- Account deep-dive context -------------------------------------------
const CONTEXTS: Record<string, AccountContext> = {
  acc_001: {
    sfdc_account_id: "acc_001", account_name: "Meridian Life Sciences", owner: "Jordan Reyes",
    adlib_industry: "Life Sciences", tier: "A", open_opp_count: 2, open_pipeline_nnacv: 305000,
    last_activity_date: iso(-11),
    next_touch: { subject: "QBR + Transform migration scope", activity_date: iso(3), type: "Meeting" },
    recent_activity: [
      { subject: "Renewal risk review with economic buyer", date: iso(-11), status: "Completed", type: "Call", kind: "task" },
      { subject: "Sent Transform migration proposal v2", date: iso(-18), status: "Completed", type: "Email", kind: "task" },
      { subject: "On-site discovery — regulatory submissions", date: iso(-27), status: "Completed", type: "Meeting", kind: "event" },
    ],
    key_contacts: [
      { id: "con_1", name: "Dr. Elena Voss", title: "VP Regulatory Affairs" },
      { id: "con_2", name: "Marcus Hale", title: "Director, IT Platforms" },
    ],
    open_opps: [
      { id: "opp_101", name: "Meridian — FY26 Transform Migration", stage: "Negotiate", nnacv: 210000, close_date: iso(24) },
      { id: "opp_102", name: "Meridian — AI Link add-on", stage: "Propose", nnacv: 95000, close_date: iso(52) },
    ],
    refreshed_at: ts(0),
  },
  acc_002: {
    sfdc_account_id: "acc_002", account_name: "Cascade Mutual Insurance", owner: "Priya Nair",
    adlib_industry: "Insurance", tier: "A", open_opp_count: 1, open_pipeline_nnacv: 140000,
    last_activity_date: iso(-4),
    next_touch: { subject: "Claims-AI pilot readout", activity_date: iso(6), type: "Meeting" },
    recent_activity: [
      { subject: "Pilot success metrics agreed", date: iso(-4), status: "Completed", type: "Call", kind: "task" },
      { subject: "Security review questionnaire returned", date: iso(-9), status: "Completed", type: "Email", kind: "task" },
    ],
    key_contacts: [
      { id: "con_3", name: "Rebecca Tran", title: "SVP Claims" },
      { id: "con_4", name: "Omar Farouk", title: "Head of Automation" },
    ],
    open_opps: [
      { id: "opp_201", name: "Cascade — Claims Intake Automation", stage: "Validate", nnacv: 140000, close_date: iso(38) },
    ],
    refreshed_at: ts(0),
  },
  acc_006: {
    sfdc_account_id: "acc_006", account_name: "Harbor Point Assurance", owner: "Priya Nair",
    adlib_industry: "Insurance", tier: "B", open_opp_count: 1, open_pipeline_nnacv: 72000,
    last_activity_date: iso(-23),
    next_touch: null,
    recent_activity: [
      { subject: "Champion left — new stakeholder unknown", date: iso(-23), status: "Completed", type: "Note", kind: "task" },
      { subject: "Renewal quote sent", date: iso(-31), status: "Completed", type: "Email", kind: "task" },
    ],
    key_contacts: [
      { id: "con_5", name: "Lena Park", title: "COO" },
    ],
    open_opps: [
      { id: "opp_601", name: "Harbor Point — FY26 Renewal + AMS360 connector", stage: "Qualify", nnacv: 72000, close_date: iso(19) },
    ],
    refreshed_at: ts(0),
  },
};
// Fill a generic context for any account without a hand-authored one.
for (const a of ACCOUNTS) {
  if (!CONTEXTS[a.sfdc_account_id]) {
    CONTEXTS[a.sfdc_account_id] = {
      sfdc_account_id: a.sfdc_account_id, account_name: a.account_name, owner: a.account_owner,
      adlib_industry: a.adlib_industry, tier: a.top_50 ? "A" : "B",
      open_opp_count: 1, open_pipeline_nnacv: 85000, last_activity_date: iso(-7),
      next_touch: { subject: "Follow-up on expansion scope", activity_date: iso(5), type: "Call" },
      recent_activity: [
        { subject: "Discovery call completed", date: iso(-7), status: "Completed", type: "Call", kind: "task" },
        { subject: "Intro deck shared", date: iso(-14), status: "Completed", type: "Email", kind: "task" },
      ],
      key_contacts: [{ id: "con_g1", name: "Alex Morgan", title: "Director of Operations" }],
      open_opps: [
        { id: `opp_${a.sfdc_account_id}`, name: `${a.account_name} — Expansion`, stage: "Propose", nnacv: 85000, close_date: iso(41) },
      ],
      refreshed_at: ts(0),
    };
  }
}

// ---- Change events (the "what matters now" feed) --------------------------
const EVENTS: ChangeEvent[] = [
  {
    detected_date: iso(0), event_type: "activity_quiet", severity: 3,
    sfdc_opportunity_id: "opp_601", sfdc_account_id: "acc_006", owner: "Priya Nair",
    adlib_industry: "Insurance", summary: "Harbor Point — FY26 Renewal has gone quiet for 23 days with a renewal 19 days out.",
    from_value: "8 days", to_value: "23 days", detail: null, created_at: ts(0),
  },
  {
    detected_date: iso(0), event_type: "stage_advance", severity: 1,
    sfdc_opportunity_id: "opp_101", sfdc_account_id: "acc_001", owner: "Jordan Reyes",
    adlib_industry: "Life Sciences", summary: "Meridian — Transform Migration advanced to Negotiate.",
    from_value: "Propose", to_value: "Negotiate", detail: null, created_at: ts(0),
  },
  {
    detected_date: iso(0), event_type: "close_date_push", severity: 2,
    sfdc_opportunity_id: "opp_501", sfdc_account_id: "acc_005", owner: "Diego Alvarez",
    adlib_industry: "Energy", summary: "Summit Energy — AI Link pushed its close date out 30 days.",
    from_value: iso(12), to_value: iso(42), detail: null, created_at: ts(0),
  },
  {
    detected_date: iso(0), event_type: "next_step_cleared", severity: 2,
    sfdc_opportunity_id: "opp_701", sfdc_account_id: "acc_007", owner: "Casey Lin",
    adlib_industry: "Life Sciences", summary: "Vanta — Reg Submissions has no next step set.",
    from_value: "Schedule technical validation", to_value: "—", detail: null, created_at: ts(0),
  },
  {
    detected_date: iso(0), event_type: "new_deal", severity: 1,
    sfdc_opportunity_id: "opp_301", sfdc_account_id: "acc_003", owner: "Sam Whitfield",
    adlib_industry: "Manufacturing", summary: "Orion Manufacturing — new Capacity add-on created ($60K).",
    from_value: null, to_value: "$60K", detail: null, created_at: ts(0),
  },
  {
    detected_date: iso(-1), event_type: "stage_slip", severity: 3,
    sfdc_opportunity_id: "opp_201", sfdc_account_id: "acc_002", owner: "Priya Nair",
    adlib_industry: "Insurance", summary: "Cascade — Claims Intake slipped from Propose back to Validate.",
    from_value: "Propose", to_value: "Validate", detail: null, created_at: ts(1),
  },
  {
    detected_date: iso(-1), event_type: "pipeline_value_drop", severity: 2,
    sfdc_opportunity_id: "opp_102", sfdc_account_id: "acc_001", owner: "Jordan Reyes",
    adlib_industry: "Life Sciences", summary: "Meridian — AI Link add-on dropped $30K in scope.",
    from_value: "$125K", to_value: "$95K", detail: null, created_at: ts(1),
  },
  {
    detected_date: iso(-2), event_type: "stage_advance", severity: 1,
    sfdc_opportunity_id: "opp_401", sfdc_account_id: "acc_004", owner: "Jordan Reyes",
    adlib_industry: "Life Sciences", summary: "Brightpath Bio — Transform expansion advanced to Propose.",
    from_value: "Qualify", to_value: "Propose", detail: null, created_at: ts(2),
  },
];
const CHANGE_EVENTS_RESULT: ChangeEventsResult = {
  detected_date: iso(0), count: EVENTS.length, events: EVENTS,
};

// ---- Viewer (manager: sees the whole team) --------------------------------
const VIEWER: Viewer = {
  email: "demo@adlib.example", role: "manager", owner: null, segment: null,
  is_xdr: false, is_csm: false, book: null,
};

// ---- Scorecards -----------------------------------------------------------
const cell = (value: number | null, rag: Rag, delta?: number, prev?: number): ScoreCell =>
  ({ value, rag, ...(delta !== undefined ? { delta } : {}), ...(prev !== undefined ? { prev } : {}) });

const REP_SCORECARD: RepScorecard = {
  as_of: iso(0), window: "This quarter", scope: "team", source: "demo", data_as_of: iso(-1),
  compare: "wow",
  metrics: [
    { key: "open_pipeline", label: "Open Pipeline", target: null, unit: "usd" },
    { key: "win_rate", label: "Win Rate", target: 35, unit: "pct", grade: true },
    { key: "coverage", label: "Coverage vs Plan", target: 300, unit: "pct", grade: true },
    { key: "next_step_fill", label: "Next-Step Fill", target: 90, unit: "pct", grade: true },
    { key: "meetings", label: "Meetings / wk", target: 8, unit: "count", grade: true },
    { key: "touches", label: "Touches / wk", target: 25, unit: "count", grade: true },
  ],
  reps: [
    { seller: "Jordan Reyes", open_opps: 9, cells: {
      open_pipeline: cell(1240000, "green", 82000), win_rate: cell(41, "green", 3),
      coverage: cell(318, "green", 12), next_step_fill: cell(94, "green", 2), meetings: cell(9, "green", 1),
      touches: cell(31, "green", 3) } },
    { seller: "Priya Nair", open_opps: 7, cells: {
      open_pipeline: cell(880000, "amber", -40000), win_rate: cell(33, "amber", -2),
      coverage: cell(214, "red", -8), next_step_fill: cell(78, "amber", -6), meetings: cell(6, "amber", 0),
      touches: cell(22, "amber", -2) } },
    { seller: "Sam Whitfield", open_opps: 8, cells: {
      open_pipeline: cell(1010000, "green", 25000), win_rate: cell(38, "green", 1),
      coverage: cell(296, "amber", 4), next_step_fill: cell(91, "green", 3), meetings: cell(8, "green", 2),
      touches: cell(27, "green", 1) } },
    { seller: "Diego Alvarez", open_opps: 6, cells: {
      open_pipeline: cell(720000, "amber", -15000), win_rate: cell(29, "red", -4),
      coverage: cell(188, "red", -3), next_step_fill: cell(69, "red", -9), meetings: cell(5, "red", -1),
      touches: cell(16, "red", -3) } },
    { seller: "Casey Lin", open_opps: 7, cells: {
      open_pipeline: cell(940000, "green", 51000), win_rate: cell(36, "green", 2),
      coverage: cell(272, "amber", 9), next_step_fill: cell(88, "amber", 5), meetings: cell(7, "amber", 1),
      touches: cell(24, "amber", 2) } },
  ],
  viewer: VIEWER,
};

const XDR_SCORECARD: XdrScorecard = {
  as_of: iso(0), window: "Trailing 30 days",
  metrics: [
    { key: "meetings_booked", label: "Meetings Booked", target: 20, unit: "count", dir: "gte", grade: true },
    { key: "conversion", label: "Dial→Conversation", target: 8, unit: "pct", dir: "gte", grade: true },
    { key: "sqls", label: "SQLs Created", target: 12, unit: "count", dir: "gte", grade: true },
  ],
  xdrs: [
    { name: "Robin Shah", cells: { meetings_booked: cell(24, "green", 4), conversion: cell(9, "green", 1), sqls: cell(14, "green", 2) } },
    { name: "Tayo Bello", cells: { meetings_booked: cell(17, "amber", -2), conversion: cell(7, "amber", 0), sqls: cell(9, "red", -3) } },
  ],
};

const CSM_SCORECARD: CsmScorecard = {
  as_of: iso(0), source: "demo", basis: "Active book", data_as_of: iso(-1),
  metrics: [
    { key: "grr", label: "Gross Retention", target: 92, unit: "pct", dir: "gte" },
    { key: "health", label: "Green Accounts", target: 70, unit: "pct", dir: "gte" },
    { key: "at_risk", label: "At-Risk ACV", target: 0, unit: "usd", dir: "lte" },
  ],
  csms: [
    { name: "Morgan Ellis", accounts: 42, py_acv: 3800000, cells: { grr: cell(94, "green", 1), health: cell(74, "green", 3), at_risk: cell(210000, "amber", -40000) } },
    { name: "Nadia Cole", accounts: 38, py_acv: 3100000, cells: { grr: cell(89, "amber", -2), health: cell(61, "amber", -4), at_risk: cell(480000, "red", 90000) } },
  ],
};

const FUNNEL_VELOCITY: FunnelVelocity = {
  as_of: iso(0), scope: "team", total_count: 37, total_amount_usd: 4790000,
  note: "Open pipeline by stage, with how long deals have sat there. Demo data.",
  stages: [
    { stage: "Identify", count: 11, amount_usd: 980000, median_days_in_stage: 12, p90_days_in_stage: 31, median_age_days: 14 },
    { stage: "Qualify", count: 9, amount_usd: 1120000, median_days_in_stage: 18, p90_days_in_stage: 44, median_age_days: 33 },
    { stage: "Validate", count: 7, amount_usd: 1040000, median_days_in_stage: 21, p90_days_in_stage: 52, median_age_days: 49 },
    { stage: "Propose", count: 6, amount_usd: 900000, median_days_in_stage: 16, p90_days_in_stage: 38, median_age_days: 61 },
    { stage: "Negotiate", count: 4, amount_usd: 750000, median_days_in_stage: 11, p90_days_in_stage: 26, median_age_days: 72 },
  ],
  viewer: VIEWER,
};

// ---- Account 360 (Scorecard deep-dive) ------------------------------------
// Activity evidence per seller-owned account: contacts + email/call/LinkedIn/
// meeting touches over a trailing 90 days, last-touch recency, and STALL /
// SINGLE-THREAD flags. Counts are derived from the rows so they never drift.
const A360_WINDOW = 90;
const a360row = (
  account_id: string, name: string, owner: string, industry: string, rag: string,
  open_opp_count: number, open_amount: number, contacts: number,
  emails: number, calls: number, linkedin: number, meetings: number,
  days_since: number | null, bucket: "in_quarter" | "next_quarter" | null,
): Account360Row => ({
  account_id, name, owner, industry, account_status: "Active", rag,
  open_opp_count, open_amount, contacts, emails, calls, linkedin, meetings,
  touches: emails + calls + linkedin + meetings,
  last_touch: days_since === null ? null : iso(-days_since),
  days_since, bucket,
  stalled: days_since === null || days_since > 30,
  single_thread: contacts <= 2,
  sfdc_url: `https://adlib.lightning.force.com/lightning/r/Account/${account_id}/view`,
});
const A360_ROWS: Account360Row[] = [
  a360row("acc_001", "Meridian Life Sciences", "Jordan Reyes", "Life Sciences", "Red", 2, 305000, 5, 6, 4, 3, 2, 11, "in_quarter"),
  a360row("acc_002", "Cascade Mutual Insurance", "Priya Nair", "Insurance", "Amber", 1, 140000, 4, 5, 3, 2, 2, 4, "in_quarter"),
  a360row("acc_003", "Orion Manufacturing", "Sam Whitfield", "Manufacturing", "Green", 1, 60000, 3, 3, 2, 1, 1, 6, "next_quarter"),
  a360row("acc_004", "Brightpath Bio", "Jordan Reyes", "Life Sciences", "Green", 1, 85000, 4, 4, 1, 2, 1, 14, "next_quarter"),
  a360row("acc_005", "Summit Energy Partners", "Diego Alvarez", "Energy", "Amber", 1, 90000, 2, 2, 1, 0, 1, 33, "in_quarter"),
  a360row("acc_006", "Harbor Point Assurance", "Priya Nair", "Insurance", "Red", 1, 72000, 1, 3, 1, 0, 0, 23, "in_quarter"),
  a360row("acc_007", "Vanta Pharmaceuticals", "Casey Lin", "Life Sciences", "Amber", 1, 75000, 4, 5, 2, 3, 1, 9, "next_quarter"),
  a360row("acc_008", "Ironclad Industrial", "Sam Whitfield", "Manufacturing", "Green", 0, 0, 2, 0, 0, 0, 0, null, null),
];
const ACCOUNT_360: Account360 = {
  as_of: iso(0), scope: "team (demo)", window_days: A360_WINDOW,
  counts: {
    accounts: A360_ROWS.length,
    with_open_pipe: A360_ROWS.filter((r) => r.open_opp_count > 0).length,
    stalled: A360_ROWS.filter((r) => r.stalled).length,
    stalled_with_pipe: A360_ROWS.filter((r) => r.stalled && r.open_opp_count > 0).length,
    single_thread: A360_ROWS.filter((r) => r.single_thread).length,
    single_thread_with_pipe: A360_ROWS.filter((r) => r.single_thread && r.open_opp_count > 0).length,
    no_touch_window: A360_ROWS.filter((r) => r.days_since === null).length,
    in_quarter: A360_ROWS.filter((r) => r.bucket === "in_quarter").length,
  },
  rows: A360_ROWS,
  viewer: VIEWER,
};

// ---- Deal Activity (Scorecard deep-dive) ----------------------------------
// Per-opp activity on the Q3/Q4 forecast over a trailing 30 days — the
// deal-grain complement to Account 360. Counts derive from the rows.
const DA_WINDOW = 30;
const daRow = (
  opp_id: string, name: string, account: string, account_id: string, owner: string,
  stage: string, amount: number, close_in: number, quarter: "Q3" | "Q4", next_step: string | null,
  emails: number, calls: number, meetings: number, contacts: number, days_since: number,
): DealActivityRow => ({
  opp_id, name, account, account_id, owner, stage, amount, close_date: iso(close_in), quarter,
  next_step, emails, calls, meetings, touches: emails + calls + meetings, contacts,
  last_activity: iso(-days_since), days_since,
  stalled: days_since > 30, single_thread: contacts < 2, no_next_step: !next_step,
  sfdc_url: `https://adlib.lightning.force.com/lightning/r/Opportunity/${opp_id}/view`,
});
const DA_ROWS: DealActivityRow[] = [
  daRow("opp_101", "Meridian — FY26 Transform Migration", "Meridian Life Sciences", "acc_001", "Jordan Reyes", "Negotiate", 210000, 24, "Q3", "Confirm economic-buyer sign-off; target close in 3 weeks", 4, 3, 2, 5, 6),
  daRow("opp_102", "Meridian — AI Link add-on", "Meridian Life Sciences", "acc_001", "Jordan Reyes", "Propose", 95000, 52, "Q4", "Rescope after the $30K cut", 3, 1, 1, 3, 12),
  daRow("opp_201", "Cascade — Claims Intake Automation", "Cascade Mutual Insurance", "acc_002", "Priya Nair", "Validate", 140000, 38, "Q4", "Pilot readout with SVP Claims", 5, 2, 2, 4, 4),
  daRow("opp_501", "Summit Energy — AI Link", "Summit Energy Partners", "acc_005", "Diego Alvarez", "Validate", 90000, 42, "Q4", null, 1, 1, 0, 1, 33),
  daRow("opp_601", "Harbor Point — FY26 Renewal + AMS360 connector", "Harbor Point Assurance", "acc_006", "Priya Nair", "Qualify", 72000, 19, "Q3", "Identify the new champion", 2, 1, 0, 1, 23),
  daRow("opp_701", "Vanta — Reg Submissions", "Vanta Pharmaceuticals", "acc_007", "Casey Lin", "Qualify", 75000, 33, "Q4", null, 3, 2, 1, 3, 9),
  daRow("opp_401", "Brightpath Bio — Transform expansion", "Brightpath Bio", "acc_004", "Jordan Reyes", "Propose", 85000, 41, "Q4", "Schedule technical validation", 4, 1, 1, 4, 14),
  daRow("opp_301", "Orion — Capacity add-on", "Orion Manufacturing", "acc_003", "Sam Whitfield", "Propose", 60000, 45, "Q4", "Send the order form", 2, 1, 1, 3, 8),
];
const DEAL_ACTIVITY: DealActivity = {
  as_of: iso(0), scope: "team (demo)", window_days: DA_WINDOW,
  counts: {
    opps: DA_ROWS.length,
    q3: DA_ROWS.filter((r) => r.quarter === "Q3").length,
    q4: DA_ROWS.filter((r) => r.quarter === "Q4").length,
    pipe_usd: DA_ROWS.reduce((s, r) => s + r.amount, 0),
    stalled: DA_ROWS.filter((r) => r.stalled).length,
    single_thread: DA_ROWS.filter((r) => r.single_thread).length,
    no_next_step: DA_ROWS.filter((r) => r.no_next_step).length,
    no_touch_window: DA_ROWS.filter((r) => r.days_since === null).length,
  },
  rows: DA_ROWS,
  viewer: VIEWER,
};

// ---- Call Blitz (Scorecard deep-dive) -------------------------------------
// One day of concentrated dialling per AE, plus a history strip. Diego's
// calendar reads null (mailbox not in the read group) → shows "—", not 0 —
// the deliberate "we can't see it" state, distinct from a real zero.
const CALL_BLITZ: CallBlitz = {
  day: iso(0), as_of: iso(0), active_reps: 5,
  reps: [
    { name: "Sam Whitfield", dials: 62, connects: 15, connect_rate: 24, meetings: 3, meetings_from_calls: 2, meetings_from_events: 1, meetings_from_calendar: 4, in_sequence: 51, bad_data: 1, no_answer: 35, untagged: 11 },
    { name: "Jordan Reyes", dials: 55, connects: 12, connect_rate: 22, meetings: 2, meetings_from_calls: 1, meetings_from_events: 1, meetings_from_calendar: 3, in_sequence: 42, bad_data: 2, no_answer: 30, untagged: 11 },
    { name: "Priya Nair", dials: 48, connects: 9, connect_rate: 19, meetings: 1, meetings_from_calls: 1, meetings_from_events: 0, meetings_from_calendar: 2, in_sequence: 38, bad_data: 3, no_answer: 28, untagged: 8 },
    { name: "Casey Lin", dials: 40, connects: 8, connect_rate: 20, meetings: 1, meetings_from_calls: 0, meetings_from_events: 1, meetings_from_calendar: 1, in_sequence: 33, bad_data: 2, no_answer: 24, untagged: 8 },
    { name: "Diego Alvarez", dials: 18, connects: 2, connect_rate: null, meetings: 0, meetings_from_calls: 0, meetings_from_events: 0, meetings_from_calendar: null, in_sequence: 20, bad_data: 1, no_answer: 12, untagged: 5 },
  ],
  totals: {
    dials: 223, connects: 46, connect_rate: 26, meetings: 7,
    meetings_from_calls: 4, meetings_from_events: 3,
    meetings_from_calendar: 10, meetings_calendar_blind: 1,
    in_sequence: 184, bad_data: 9,
  },
  history: [
    { day: iso(-10), dials: 44, connects: 9, meetings: 1, reps_dialling: 3 },
    { day: iso(-9), dials: 37, connects: 6, meetings: 1, reps_dialling: 2 },
    { day: iso(-8), dials: 41, connects: 8, meetings: 0, reps_dialling: 3 },
    { day: iso(-7), dials: 178, connects: 39, meetings: 5, reps_dialling: 5 },
    { day: iso(-3), dials: 55, connects: 12, meetings: 1, reps_dialling: 3 },
    { day: iso(-2), dials: 48, connects: 10, meetings: 2, reps_dialling: 4 },
    { day: iso(-1), dials: 62, connects: 14, meetings: 1, reps_dialling: 4 },
    { day: iso(0), dials: 223, connects: 46, meetings: 7, reps_dialling: 5 },
  ],
  note: "Meetings booked read from each rep's Outlook calendar (the real source); the Salesforce call/event count is shown in parens and is usually lower. An untagged dial is one logged without a Regie outcome — why a connect rate can read blank. Demo data.",
  viewer: VIEWER,
};

// ---- Meetings Booked (Scorecard deep-dive) --------------------------------
// Forward-looking: customer meetings each AE has SET on their Outlook calendar
// over the next 28 days. Diego's mailbox isn't in the calendar-read group
// (count null → "—"). Totals derive from the reps.
const mtgWhen = (d: number, time: string): string => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return `${dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
};
const MB_REPS: MeetingsBooked["reps"] = [
  { name: "Sam Whitfield", count: 4, meetings: [
    { start: mtgWhen(2, "10:00 AM"), subject: "Orion — capacity review", customer: "Orion Manufacturing" },
    { start: mtgWhen(4, "1:30 PM"), subject: "Ironclad — Transform kickoff", customer: "Ironclad Industrial" },
    { start: mtgWhen(9, "9:00 AM"), subject: "Orion — order-form walkthrough", customer: "Orion Manufacturing" },
    { start: mtgWhen(15, "3:00 PM"), subject: "Ironclad — exec alignment", customer: "Ironclad Industrial" },
  ] },
  { name: "Jordan Reyes", count: 3, meetings: [
    { start: mtgWhen(3, "11:00 AM"), subject: "Meridian — QBR + Transform scope", customer: "Meridian Life Sciences" },
    { start: mtgWhen(8, "2:00 PM"), subject: "Brightpath — technical validation", customer: "Brightpath Bio" },
    { start: mtgWhen(18, "10:30 AM"), subject: "Meridian — AI Link rescope", customer: "Meridian Life Sciences" },
  ] },
  { name: "Priya Nair", count: 2, meetings: [
    { start: mtgWhen(6, "9:30 AM"), subject: "Cascade — pilot readout", customer: "Cascade Mutual Insurance" },
    { start: mtgWhen(12, "1:00 PM"), subject: "Harbor Point — champion intro", customer: "Harbor Point Assurance" },
  ] },
  { name: "Casey Lin", count: 1, meetings: [
    { start: mtgWhen(5, "4:00 PM"), subject: "Vanta — reg-submissions demo", customer: "Vanta Pharmaceuticals" },
  ] },
  { name: "Diego Alvarez", count: null, meetings: [] },
];
const MEETINGS_BOOKED: MeetingsBooked = {
  as_of: iso(0), days_ahead: 28,
  reps: MB_REPS,
  totals: {
    booked: MB_REPS.reduce((s, r) => s + (r.count ?? 0), 0),
    reps_with_meetings: MB_REPS.filter((r) => (r.count ?? 0) > 0).length,
    reps_blind: MB_REPS.filter((r) => r.count === null).length,
  },
  note: "Read from each rep's Outlook calendar and narrowed to attendees at a real Salesforce customer/prospect, so personal items don't leak in. This reads the source directly — a booked meeting lives in the calendar, not in Regie or a Salesforce Event. Demo data.",
  viewer: VIEWER,
};

// ---- Open opps (Cube) — raw rows the client-aggregated views roll up --------
// MONEY = net_new_acv_y1 (NN ACV Yr1). Reuses the shared account/owner/opp names
// so every Cube breakdown ties out with the Partner / Deal-Activity fixtures. All
// 8 are non-Omitted → the Open view totals $827K over 8 opps.
const openOpp = (
  id: string, name: string, account: string, owner: string, industry: string,
  stage: string, nnacv: number, recordType: string, motion: string, channel: string,
  type: string, fc: string, mfc: string, leadSource: string, revRange: string,
  closeIn: number, createdAgo: number, fiscalPeriod: string,
): Opp => ({
  sfdc_opportunity_id: id, opportunity_name: name, account_name: account,
  opportunity_owner: owner, stage, forecast_category: fc, manager_forecast_category: mfc,
  churn_risk: null, opportunity_record_type: recordType, fiscal_period: fiscalPeriod,
  adlib_industry: industry, net_new_acv_y1: nnacv, net_new_acv_y1_native: nnacv,
  amount: nnacv, amount_native: nnacv, amount_currency: "USD",
  close_date: iso(closeIn), created_date: ts(createdAgo), type,
  new_business_type: recordType === "New Business" ? "New Logo" : null,
  sales_motion: motion, channel_type: channel,
  lead_source: leadSource, revenue_range_usd: revRange, excluded: false, excluded_reason: null,
});
const OPEN_OPPS: Opp[] = [
  openOpp("opp_101", "Meridian — FY26 Transform Migration", "Meridian Life Sciences", "Jordan Reyes", "Life Sciences", "Negotiate", 210000, "Expansion", "Co-Sell", "Partner", "Software", "Commit", "Commit", "Partner", "$1B–$5B", 24, 61, "Q3-2026"),
  openOpp("opp_102", "Meridian — AI Link add-on", "Meridian Life Sciences", "Jordan Reyes", "Life Sciences", "Propose", 95000, "Expansion", "Direct", "Direct", "Software", "Best Case", "Best Case", "Outbound", "$1B–$5B", 52, 40, "Q4-2026"),
  openOpp("opp_201", "Cascade — Claims Intake Automation", "Cascade Mutual Insurance", "Priya Nair", "Insurance", "Validate", 140000, "New Business", "Co-Sell", "Partner", "Software", "Best Case", "Best Case", "Partner", "$500M–$1B", 38, 52, "Q4-2026"),
  openOpp("opp_301", "Orion — Capacity add-on", "Orion Manufacturing", "Sam Whitfield", "Manufacturing", "Propose", 60000, "Expansion", "Influence", "Partner", "Software", "Pipeline", "Pipeline", "Website", "$250M–$500M", 45, 33, "Q4-2026"),
  openOpp("opp_401", "Brightpath Bio — Transform expansion", "Brightpath Bio", "Jordan Reyes", "Life Sciences", "Propose", 85000, "Expansion", "Services Only", "Hybrid", "Services", "Pipeline", "Pipeline", "Partner", "$100M–$250M", 41, 28, "Q4-2026"),
  openOpp("opp_501", "Summit Energy — AI Link", "Summit Energy Partners", "Diego Alvarez", "Energy", "Validate", 90000, "New Business", "Partner Driven", "Partner", "Software", "Best Case", "Commit", "Partner", "$1B–$5B", 42, 47, "Q4-2026"),
  openOpp("opp_601", "Harbor Point — FY26 Renewal + AMS360 connector", "Harbor Point Assurance", "Priya Nair", "Insurance", "Qualify", 72000, "Renewal", "Direct", "Direct", "Software", "Pipeline", "Pipeline", "Website", "$250M–$500M", 19, 71, "Q3-2026"),
  openOpp("opp_701", "Vanta — Reg Submissions", "Vanta Pharmaceuticals", "Casey Lin", "Life Sciences", "Qualify", 75000, "New Business", "Partner Driven", "Hybrid", "Software", "Pipeline", "Best Case", "Partner", "$5B+", 33, 24, "Q4-2026"),
];

// Two historical closed opps (same accounts/owners) so the Created view's
// Won / Lost tiles light up. The "created" snapshot = the 8 open + these 2.
const CLOSED_OPPS: Opp[] = [
  openOpp("opp_050", "Orion — Pilot Expansion", "Orion Manufacturing", "Sam Whitfield", "Manufacturing", "Closed Won", 45000, "Expansion", "Direct", "Direct", "Software", "Closed", "Closed", "Partner", "$250M–$500M", -40, 150, "Q1-2026"),
  openOpp("opp_055", "Summit Energy — Discovery POC", "Summit Energy Partners", "Diego Alvarez", "Energy", "Closed Lost", 40000, "New Business", "Direct", "Direct", "Software", "Closed", "Closed", "Outbound", "$1B–$5B", -55, 160, "Q1-2026"),
];
const CREATED_OPPS: Opp[] = [...OPEN_OPPS, ...CLOSED_OPPS];

// ---- Pipeline by industry (Cube) ------------------------------------------
// Open rows aggregate the 8 named OPEN opps by their account's industry, so the
// numbers tie deal-for-deal to Deal Activity / Partner / Open Pipeline:
//   Life Sciences  opp_101 210 + opp_102 95 + opp_401 85 + opp_701 75 = $465K (4)
//   Insurance      opp_201 140 + opp_601 72                            = $212K (2)
//   Energy         opp_501 90                                          =  $90K (1)
//   Manufacturing  opp_301 60                                          =  $60K (1)
// Closed-Won FYTD is illustrative bookings for the same four verticals.
const INDUSTRY: Industry = {
  as_of: iso(0), scope: "team (demo)",
  basis: "Open pipeline · Net New ACV Yr1 · Omitted excluded; Closed-Won is FYTD on NN ACV Yr1. Demo data.",
  note: "Money is Net New ACV Year 1 everywhere (not Amount/TCV); a null industry would fall into an \"Unknown\" row.",
  totals: { open_opps: 8, open_nnacv: 827000, cw_opps: 8, cw_nnacv: 905000 },
  rows: [
    { industry: "Life Sciences", open_opps: 4, open_nnacv: 465000, cw_opps: 3, cw_nnacv: 520000 },
    { industry: "Insurance", open_opps: 2, open_nnacv: 212000, cw_opps: 2, cw_nnacv: 180000 },
    { industry: "Energy", open_opps: 1, open_nnacv: 90000, cw_opps: 1, cw_nnacv: 60000 },
    { industry: "Manufacturing", open_opps: 1, open_nnacv: 60000, cw_opps: 2, cw_nnacv: 145000 },
  ],
  viewer: VIEWER,
};

// ---- Partner pipeline (Cube) ----------------------------------------------
const PARTNER: Partner = {
  as_of: iso(0),
  basis: "Open pipeline · Net New ACV Yr1 · keyed on the partner name (Sourcing_Partner__c / Partner__c). Demo data.",
  note: "Channel Type (Sales_Type__c) is shown only as a cross-check — the two partner-name views above are the source of truth.",
  totals: {
    partner_channel_nnacv: 380000,
    sourced_nnacv: 500000,
    contracting_nnacv: 250000,
    influenced_nnacv: 240000,
  },
  sourced_by_partner: [
    {
      partner: "Capgemini", nnacv: 350000, count: 2,
      motions: [{ motion: "Co-Sell", count: 2, nnacv: 350000 }],
      deals: [
        { id: "opp_101", name: "Meridian — FY26 Transform Migration", account: "Meridian Life Sciences", stage: "Negotiate", nnacv: 210000, motion: "Co-Sell", lead_source: "Partner" },
        { id: "opp_201", name: "Cascade — Claims Intake Automation", account: "Cascade Mutual Insurance", stage: "Validate", nnacv: 140000, motion: "Co-Sell", lead_source: "Partner" },
      ],
    },
    {
      partner: "Carahsoft", nnacv: 90000, count: 1,
      motions: [{ motion: "Partner Driven", count: 1, nnacv: 90000 }],
      deals: [
        { id: "opp_501", name: "Summit Energy — AI Link", account: "Summit Energy Partners", stage: "Validate", nnacv: 90000, motion: "Partner Driven", lead_source: "Partner" },
      ],
    },
    {
      partner: "CBTS", nnacv: 60000, count: 1,
      motions: [{ motion: "Influence", count: 1, nnacv: 60000 }],
      deals: [
        { id: "opp_301", name: "Orion — Capacity add-on", account: "Orion Manufacturing", stage: "Propose", nnacv: 60000, motion: "Influence", lead_source: "Website" },
      ],
    },
  ],
  contracting_by_partner: [
    {
      partner: "Carahsoft", nnacv: 165000, count: 2,
      motions: [{ motion: "Partner Driven", count: 2, nnacv: 165000 }],
      deals: [
        { id: "opp_501", name: "Summit Energy — AI Link", account: "Summit Energy Partners", stage: "Validate", nnacv: 90000, motion: "Partner Driven", lead_source: "Partner" },
        { id: "opp_701", name: "Vanta — Reg Submissions", account: "Vanta Pharmaceuticals", stage: "Qualify", nnacv: 75000, motion: "Partner Driven", lead_source: "Partner" },
      ],
    },
    {
      partner: "Deloitte Digital", nnacv: 85000, count: 1,
      motions: [{ motion: "Services Only", count: 1, nnacv: 85000 }],
      deals: [
        { id: "opp_401", name: "Brightpath Bio — Transform expansion", account: "Brightpath Bio", stage: "Propose", nnacv: 85000, motion: "Services Only", lead_source: "Partner" },
      ],
    },
  ],
  by_channel: [
    { channel: "Partner", count: 4, nnacv: 380000 },
    { channel: "Hybrid", count: 2, nnacv: 160000 },
  ],
  inbound_leads: { total: 214, fy_cohort: 62, mql: 28, sql: 14, oppty: 6, active: 41 },
};

// ---- Summary (Cube — headline pipeline) -----------------------------------
// MONEY = Net New ACV Yr1; open pipeline excludes Manager Forecast "Omitted".
// This is the full-book aggregate view ($4.79M / 37, tying to FUNNEL_VELOCITY +
// the Ask answer); every by_* bucket partitions that same open total. The
// detailed Cube tabs (Open / Created / Industry) show a smaller named working
// sample ($827K / 8) — both reconcile against live SFDC in prod.
const sBucket = (key: string, value: number): { key: string; value: number } => ({ key, value });
const SUMMARY: Summary = {
  as_of: iso(0), scope: "team (demo)",
  basis: "Open pipeline · Net New ACV Yr1 · excl. Manager Forecast = Omitted. Full-book view. Demo data.",
  note: "Tie-out tiles (Closed-Won, Created FYTD, Active Accounts, Churn, Down-sell) are live-SFDC report-aligned numbers in prod; synthetic here. The detailed Cube tabs show a named working sample, so their totals differ from this full-book roll-up.",
  open: {
    nnacv: 4790000, count: 37, omitted_value: 320000,
    in_quarter_nnacv: 2180000, in_quarter_count: 16, period: "Q3-2026",
  },
  scorecard: {
    basis: "New-Rules reports", source: "salesforce (demo)", data_as_of: iso(-1), period: "CY",
    active_accounts: 128, active_prior_year_acv: 6400000,
    closed_won_cy: { count: 14, value_final_year: 2300000, value_year1: 1850000 },
    downsell_cy: { count: 3, value_year1: -180000 },
    churn_forecast: { value: 420000 },
    created_fytd: { count: 46, value: 3120000 },
    new_logo_open: { count: 9, value: 1900000 },
  },
  wow: {
    available: true, this_week: "2026W35", last_week: "2026W34",
    this_week_total: 4790000, last_week_total: 4520000, delta: 270000,
    counts: { new: 5, gone: 2, increased: 6, decreased: 3 },
    new: [{ name: "Orion — Capacity add-on", account: "Orion Manufacturing", owner: "Sam Whitfield", stage: "Propose", value: 60000 }],
    increased: [{ name: "Meridian — FY26 Transform Migration", account: "Meridian Life Sciences", owner: "Jordan Reyes", stage: "Negotiate", value: 210000, delta: 40000 }],
    decreased: [{ name: "Meridian — AI Link add-on", account: "Meridian Life Sciences", owner: "Jordan Reyes", stage: "Propose", value: 95000, delta: -30000 }],
    gone: [{ name: "Legacy — Documentum swap", account: "Meridian Life Sciences", owner: "Jordan Reyes", value: 55000 }],
  },
  lead: {
    active_leads: 1180, overall_lead_to_oppty_pct: 7,
    stages: [
      { stage: "Leads", count: 1320, conv_from_prev: null },
      { stage: "MQL", count: 430, conv_from_prev: 33 },
      { stage: "SQL", count: 180, conv_from_prev: 42 },
      { stage: "Oppty", count: 96, conv_from_prev: 53 },
    ],
    by_source: [
      { source: "Website", leads: 520 }, { source: "Partner", leads: 300 },
      { source: "Event", leads: 240 }, { source: "Outbound", leads: 160 }, { source: "Referral", leads: 100 },
    ],
    by_industry: [
      { industry: "Life Sciences", leads: 560 }, { industry: "Insurance", leads: 360 },
      { industry: "Manufacturing", leads: 210 }, { industry: "Energy", leads: 120 }, { industry: "Other", leads: 70 },
    ],
  },
  renewals_rag: [
    { band: "Red", value: 380000, count: 3 },
    { band: "Amber", value: 540000, count: 5 },
    { band: "Green", value: 1240000, count: 9 },
    { band: "Unrated", value: 210000, count: 4 },
  ],
  top_accounts: [
    { acct: "Vanta Pharmaceuticals", industry: "Life Sciences", owner: "Casey Lin", value: 940000 },
    { acct: "Meridian Life Sciences", industry: "Life Sciences", owner: "Jordan Reyes", value: 900000 },
    { acct: "Summit Energy Partners", industry: "Energy", owner: "Diego Alvarez", value: 720000 },
    { acct: "Cascade Mutual Insurance", industry: "Insurance", owner: "Priya Nair", value: 560000 },
    { acct: "Ironclad Industrial", industry: "Manufacturing", owner: "Sam Whitfield", value: 540000 },
    { acct: "Orion Manufacturing", industry: "Manufacturing", owner: "Sam Whitfield", value: 470000 },
    { acct: "Brightpath Bio", industry: "Life Sciences", owner: "Jordan Reyes", value: 340000 },
    { acct: "Harbor Point Assurance", industry: "Insurance", owner: "Priya Nair", value: 320000 },
  ],
  by_industry_group: [
    sBucket("Life Sciences", 2300000), sBucket("Other", 1140000),
    sBucket("Insurance", 1050000), sBucket("US Government", 300000),
  ],
  by_type: [sBucket("New Business", 2900000), sBucket("Expansion", 1290000), sBucket("Renewal", 600000)],
  by_industry: [
    sBucket("Life Sciences", 2300000), sBucket("Insurance", 1050000), sBucket("Manufacturing", 640000),
    sBucket("Energy", 500000), sBucket("Government", 300000),
  ],
  exp_by_sales_motion: [sBucket("Cross-Sell", 640000), sBucket("Upsell", 400000), sBucket("Capacity Add-on", 250000)],
  by_manager_forecast: [sBucket("Best Case", 1690000), sBucket("Pipeline", 1600000), sBucket("Commit", 1500000)],
  by_stage: [
    sBucket("Qualify", 1120000), sBucket("Validate", 1040000), sBucket("Identify", 980000),
    sBucket("Propose", 900000), sBucket("Negotiate", 750000),
  ],
  by_period: [sBucket("Q3-2026", 2180000), sBucket("Q4-2026", 1610000), sBucket("Q1-2027", 700000), sBucket("Q2-2027", 300000)],
  by_owner: [
    sBucket("Jordan Reyes", 1240000), sBucket("Sam Whitfield", 1010000), sBucket("Casey Lin", 940000),
    sBucket("Priya Nair", 880000), sBucket("Diego Alvarez", 720000),
  ],
  by_source: [
    sBucket("Partner", 1600000), sBucket("Website", 1200000), sBucket("Outbound", 1100000),
    sBucket("Referral", 500000), sBucket("Event", 390000),
  ],
  by_rev_range: [
    sBucket("$1B–$5B", 1700000), sBucket("$500M–$1B", 1000000), sBucket("$5B+", 900000),
    sBucket("$250M–$500M", 800000), sBucket("$100M–$250M", 390000),
  ],
  viewer: VIEWER,
};

// ---- Forecast (Cube) — build-to-plan --------------------------------------
// Computed server-side from the Manager Forecast field (no weekly upload —
// Sharon 8/6). Ties to the $827K/8 shared cohort: Commit 350 + Upside 330 +
// Uncategorized 147 = 827K open; the waterfall builds that by motion, nets
// churn/down-sell to a $650K Current Forecast, and shows the gap to a $900K plan.
const FORECAST: Forecast = {
  as_of: iso(0), period: "This quarter",
  basis: "In-quarter open pipeline · Net New ACV Yr1 · Manager_Forecast_Category__c. Demo data.",
  note: "Commit/Upside come straight from the Manager Forecast field (no weekly file). The waterfall builds open pipeline by motion, nets churn/down-sell to the Current Forecast, and shows the gap to the leadership plan. Current Forecast ($650K) = Inside the Call ($470K) + Won ($180K).",
  commit: 350000, commit_opps: 2,
  upside: 330000, upside_opps: 4,
  uncategorized: 147000,
  inside_call: 470000, outside_call: 357000,
  inside_plus_won: 650000, won_to_date: 180000,
  opps_in_call: 4, opps_total: 8,
  churn: 60000, downsell: 117000, incr_arr: 140000,
  plan: 900000, gap: -250000,
  waterfall: [
    { label: "New Logo", delta: 230000, running: 230000, kind: "build" },
    { label: "Cross-sell", delta: 170000, running: 400000, kind: "build" },
    { label: "Migrations", delta: 210000, running: 610000, kind: "build" },
    { label: "Capacity", delta: 60000, running: 670000, kind: "build" },
    { label: "Renewal Uplift", delta: 157000, running: 827000, kind: "build" },
    { label: "Churn", delta: -60000, running: 767000, kind: "risk" },
    { label: "Down-sell", delta: -117000, running: 650000, kind: "risk" },
    { label: "Current Forecast", delta: 0, running: 650000, kind: "subtotal" },
    { label: "Gap to Plan", delta: 250000, running: 900000, kind: "gap" },
    { label: "Plan", delta: 0, running: 900000, kind: "total" },
  ],
};

// ---- New Logo (Cube) ------------------------------------------------------
// New-logo pipeline vs cross-sell/renewal by period, plus new-logo CW FYTD and
// the win-rate trend. New-logo OPEN = the 3 New Business opps (Cascade opp_201,
// Summit opp_501, Vanta opp_701) = $305K/3; the other 5 open opps are cross-sell
// / renewal / expansion = $522K/5. Ties to the $827K/8 open cohort.
const NEW_LOGO: NewLogo = {
  as_of: iso(0),
  basis: "Open pipeline · Net New ACV Yr1 · new_business_type = 'New Logo' vs everything-else · excl. Omitted. Demo data.",
  note: "New-logo win rate is won / (won + lost) by count for closed new-logo deals in the period. 'Cross-sell' bundles renewal + expansion + winback; renewals don't populate NN ACV, so cross-sell dollars read low on purpose.",
  totals: {
    open_new_logo_nnacv: 305000, open_new_logo_count: 3,
    open_cross_sell_nnacv: 522000, open_cross_sell_count: 5,
    new_logo_cw_nnacv: 345000, new_logo_cw_wins: 4,
    cross_sell_cw_nnacv: 180000, cross_sell_cw_wins: 3,
  },
  by_period: [
    { period: "Q3-2026", new_logo_nnacv: 75000, cross_sell_nnacv: 282000 },
    { period: "Q4-2026", new_logo_nnacv: 230000, cross_sell_nnacv: 240000 },
  ],
  cw_by_period: [
    { period: "Q1-2026", nnacv: 95000 },
    { period: "Q2-2026", nnacv: 190000 },
    { period: "Q3-2026", nnacv: 60000 },
  ],
  win_rate_by_period: [
    { period: "Q1-2026", won: 1, lost: 1, win_rate_pct: 50.0 },
    { period: "Q2-2026", won: 2, lost: 1, win_rate_pct: 66.7 },
    { period: "Q3-2026", won: 1, lost: 2, win_rate_pct: 33.3 },
  ],
  open_detail: [
    { id: "opp_201", name: "Cascade — Claims Intake Automation", account: "Cascade Mutual Insurance", record_type: "New Business", stage: "Validate", owner: "Priya Nair", industry: "Insurance", fiscal_period: "Q4-2026", net_new_acv_y1: 140000 },
    { id: "opp_501", name: "Summit Energy — AI Link", account: "Summit Energy Partners", record_type: "New Business", stage: "Validate", owner: "Diego Alvarez", industry: "Energy", fiscal_period: "Q4-2026", net_new_acv_y1: 90000 },
    { id: "opp_701", name: "Vanta — Reg Submissions", account: "Vanta Pharmaceuticals", record_type: "New Business", stage: "Qualify", owner: "Casey Lin", industry: "Life Sciences", fiscal_period: "Q3-2026", net_new_acv_y1: 75000 },
  ],
};

// ---- Win rate by rev type (Cube) ------------------------------------------
// won / (won + lost) BY COUNT, split Insurance / Life Sciences / Other, across
// three CloseDate windows the viewer toggles. n=0 → win_rate_pct null ("—" +
// 0-width bar; Other/current-FY exercises it). Multi-year adds a best-effort
// by-year strip (FY2020 insurance_wr null exercises the "—" path there too).
const WIN_RATE: WinRateByRevType = {
  as_of: iso(0),
  source: "salesforce (demo) · Closed Won/Lost, royalty/RMS/Dassault excluded",
  note: "Win rate is won/(won+lost) by deal count. Buckets are Insurance, Life Sciences, and Other (all remaining rev types). Multi-year is capped to the last 10 fiscal years — Closed Lost is only reliably tracked from ~2016 — and the by-year strip is best-effort, so it won't reconcile exactly to the bucket totals. Demo data.",
  windows: {
    current_fy: {
      label: "Current FY (FYTD)",
      buckets: [
        { bucket: "Insurance", won: 3, lost: 5, n: 8, win_rate_pct: 38 },
        { bucket: "Life Sciences", won: 6, lost: 7, n: 13, win_rate_pct: 46 },
        { bucket: "Other", won: 0, lost: 0, n: 0, win_rate_pct: null },
      ],
    },
    ttm: {
      label: "Trailing 12 months",
      buckets: [
        { bucket: "Insurance", won: 9, lost: 14, n: 23, win_rate_pct: 39 },
        { bucket: "Life Sciences", won: 15, lost: 19, n: 34, win_rate_pct: 44 },
        { bucket: "Other", won: 4, lost: 9, n: 13, win_rate_pct: 31 },
      ],
    },
    multi_year: {
      label: "Multi-year (last 10 FY)",
      buckets: [
        { bucket: "Insurance", won: 41, lost: 78, n: 119, win_rate_pct: 34 },
        { bucket: "Life Sciences", won: 66, lost: 92, n: 158, win_rate_pct: 42 },
        { bucket: "Other", won: 22, lost: 47, n: 69, win_rate_pct: 32 },
      ],
      by_year: [
        { fy: 2026, won: 9, lost: 14, n: 23, win_rate_pct: 39, insurance_wr: 38 },
        { fy: 2025, won: 21, lost: 30, n: 51, win_rate_pct: 41, insurance_wr: 35 },
        { fy: 2024, won: 19, lost: 28, n: 47, win_rate_pct: 40, insurance_wr: 33 },
        { fy: 2023, won: 17, lost: 26, n: 43, win_rate_pct: 40, insurance_wr: 31 },
        { fy: 2022, won: 15, lost: 24, n: 39, win_rate_pct: 38, insurance_wr: 30 },
        { fy: 2021, won: 13, lost: 22, n: 35, win_rate_pct: 37, insurance_wr: 29 },
        { fy: 2020, won: 11, lost: 20, n: 31, win_rate_pct: 35, insurance_wr: null },
      ],
    },
  },
};

// ---- Exclusions (Cube) ----------------------------------------------------
// Accounts deliberately held OUT of the pipeline cube — a different revenue type
// (royalty / OEM / resale) or outside the commercial motion. NET-NEW names on
// purpose (acc_x0*): an excluded account must NOT be one of the in-pipeline demo
// accounts, or it would contradict the pipeline / partner / 360 views.
const ACCOUNT_EXCLUSIONS: Exclusion[] = [
  { account_name: "Legacy OEM Royalties", sfdc_account_id: "acc_x01", reason: "Royalty revenue", reason_detail: "OEM royalty stream, not new-license ACV — held out of the pipeline cube.", added_by: "Sam Whitfield", added_at: ts(58), active: true },
  { account_name: "Dassault Systèmes — RMS resale", sfdc_account_id: "acc_x02", reason: "Dassault / RMS", reason_detail: "Embedded and resold through RMS; the ACV lands on the partner's paper, not ours.", added_by: "Priya Nair", added_at: ts(46), active: true },
  { account_name: "Northwind Archival Services", sfdc_account_id: "acc_x03", reason: "Out of commercial motion", reason_detail: "Managed-archival pass-through — services only, no license motion.", added_by: "Jordan Reyes", added_at: ts(31), active: true },
  { account_name: "Adlib Internal Sandbox", sfdc_account_id: "acc_x04", reason: "Internal / test", reason_detail: null, added_by: "Diego Alvarez", added_at: ts(120), active: true },
  { account_name: "Global Reinsurance Holdings", sfdc_account_id: "acc_x05", reason: "Dormant — no active motion", reason_detail: "Dormant since the FY24 wind-down; kept out until a real opportunity reopens.", added_by: "Casey Lin", added_at: ts(12), active: true },
];

// ---- Week-over-Week (Cube) ------------------------------------------------
// Deal-level diff of the two most recent OPEN snapshots on NN ACV Yr1. Totals
// reconcile with the movers (net −$76K). In LIVE prod this returns
// {available:false} until the daily snapshot runs twice — the demo shows the
// happy path; the component renders the unavailable reason calmly.
const WOW: Wow = {
  available: true,
  this_week: iso(0),
  last_week: iso(-7),
  this_week_total: 4720000,
  last_week_total: 4796000,
  delta: -76000,
  counts: { new: 2, gone: 2, increased: 2, decreased: 2 },
  new: [
    { name: "Orion — Capacity add-on", account: "Orion Manufacturing", owner: "Sam Whitfield", stage: "Propose", value: 60000 },
    { name: "Ironclad — Transform pilot", account: "Ironclad Industrial", owner: "Sam Whitfield", stage: "Identify", value: 48000 },
  ],
  gone: [
    { name: "Summit Energy — Legacy 6.5 Renewal", account: "Summit Energy Partners", owner: "Diego Alvarez", stage: "Negotiate", value: 120000 },
    { name: "Harbor Point — Sapiens Migration", account: "Harbor Point Assurance", owner: "Priya Nair", stage: "Qualify", value: 54000 },
  ],
  increased: [
    { name: "Meridian — FY26 Transform Migration", account: "Meridian Life Sciences", owner: "Jordan Reyes", stage: "Negotiate", value: 210000, delta: 25000 },
    { name: "Cascade — Claims Intake Automation", account: "Cascade Mutual Insurance", owner: "Priya Nair", stage: "Validate", value: 140000, delta: 15000 },
  ],
  decreased: [
    { name: "Meridian — AI Link add-on", account: "Meridian Life Sciences", owner: "Jordan Reyes", stage: "Propose", value: 95000, delta: -30000 },
    { name: "Summit Energy — AI Link", account: "Summit Energy Partners", owner: "Diego Alvarez", stage: "Validate", value: 90000, delta: -20000 },
  ],
};

// ---- Roadmap --------------------------------------------------------------
const ROADMAP: Roadmap = {
  updated: iso(-1), owner: "RevOS Team",
  vision: "One place a seller opens each morning that tells them what changed, what matters, and what to do next — grounded in live Salesforce, never a static dashboard.",
  principles: [
    "Grounded in real data or it doesn't ship.",
    "Scope is enforced server-side; a seller sees only their book.",
    "Every AI answer is checkable back to a source.",
    "Speed of a glance, depth on a click.",
  ],
  milestones: [
    { id: "m1", when: "Q2", title: "Five-area workspace", status: "shipped", detail: "Home, Ask, Accounts, Performance, Roadmap." },
    { id: "m2", when: "Q3", title: "Daily state + change feed", status: "shipped", detail: "Nightly Salesforce diff into a typed change-event feed." },
    { id: "m3", when: "Q3", title: "Grounded Ask", status: "in_progress", detail: "Natural-language questions mapped to whitelisted metrics." },
    { id: "m4", when: "Q4", title: "Usage → outcomes instrumentation", status: "next", detail: "Tie RevOS adoption to pipe / velocity / bookings." },
    { id: "m5", when: "Q4", title: "Write-back at the approval gate", status: "backlog", detail: "Edit next steps and close dates from inside RevOS." },
  ],
  items: [
    { title: "Forecast waterfall on the weekly deck", status: "shipped", requester: "Sharon", detail: "New Logo → Cross-sell → Migrations → Capacity → Renewal Uplift → Churn." },
    { title: "Partner pipeline view (sourcing + contracting)", status: "shipped", requester: "Sharon" },
    { title: "Grounded Ask — chart + table answers", status: "in_progress" },
    { title: "Adoption + outcome scorecard for leadership", status: "next", requester: "Chris" },
    { title: "In-app next-step editing (write gate)", status: "backlog" },
    { title: "Mobile morning-brief view", status: "backlog" },
  ],
  decisions_needed: [
    { question: "Which cap raise unblocks the AI areas before Sept 1?", why: "Ask + brief route through the LLM proxy, currently budget-capped.", owner: "IT / Chris" },
    { question: "Roll out to all AEs at once, or Life Sciences first?", why: "Staggered rollout gives a cleaner control group for the outcome story.", owner: "Sharon" },
  ],
};

// ---- In-app intake --------------------------------------------------------
const REVOS_REQUESTS: { count: number; requests: RevosRequestRow[] } = {
  count: 3,
  requests: [
    { id: 41, created_at: ts(1), requester: "Sam Whitfield", kind: "idea", title: "Add a 'gone quiet' filter to Home", detail: "Let me see only my quiet deals in one click.", surface: "home", status: "triaged", source: "revos", triage_note: "Planned — Home filter chips." },
    { id: 40, created_at: ts(3), requester: "Priya Nair", kind: "bug", title: "Account deep-dive slow on first open", detail: "The warm-context read takes a few seconds the first time.", surface: "accounts", status: "open", source: "revos", triage_note: null },
    { id: 39, created_at: ts(6), requester: "Casey Lin", kind: "question", title: "How is coverage-vs-plan calculated?", detail: null, surface: "performance", status: "answered", source: "revos", triage_note: "Open NNACV closing this quarter ÷ quota." },
  ],
};

// ---- Prospecting (Clay) requests ------------------------------------------
const PROSPECTING_REQUESTS: { count: number; requests: ProspectingRequestRow[] } = {
  count: 2,
  requests: [
    { id: 58, created_at: ts(2), requester: "demo@adlib.example",
      accounts: [{ domain: "meridianls.com" }, { domain: "brightpathbio.com" }],
      personas: ["VP Regulatory Affairs", "Director RIM"], needs: ["email", "phone"],
      max_per_account: 5, notes: null, status: "fulfilled",
      result: { created_leads: 8, found: 9 }, fulfilled_at: ts(1), error: null },
    { id: 57, created_at: ts(5), requester: "demo@adlib.example",
      accounts: [{ domain: "cascademutual.com" }], personas: ["SVP Claims", "Head of Automation"],
      needs: ["email"], max_per_account: 4, notes: "US sites only", status: "new",
      result: null, fulfilled_at: null, error: null },
  ],
};

// ---- Ask + Agent ----------------------------------------------------------
function askResult(question: string): AskResult {
  const q = (question || "").trim();
  if (!q) {
    return {
      answer_text: "Ask a grounded question about your pipeline and I'll answer from live Salesforce with a chart and the numbers behind it.",
      metric: null, params: {}, table: null, chart_spec: null, source: null, as_of: iso(0),
      suggestions: [
        "What's my open pipeline by stage?",
        "Which deals have gone quiet this week?",
        "Win rate by industry this quarter",
        "Pipeline created in the last 30 days",
      ],
    };
  }
  return {
    answer_text: "Open pipeline is $4.79M across 37 deals. The biggest concentration is in Validate ($1.04M, median 21 days in stage) and Qualify ($1.12M). Two Insurance deals worth $212K have gone quiet in the last week. (Demo data.)",
    metric: "open_pipeline_by_stage",
    params: { scope: "team", window: "this_quarter" },
    table: {
      columns: ["Stage", "Deals", "Open NNACV"],
      rows: [
        { Stage: "Identify", Deals: 11, "Open NNACV": 980000 },
        { Stage: "Qualify", Deals: 9, "Open NNACV": 1120000 },
        { Stage: "Validate", Deals: 7, "Open NNACV": 1040000 },
        { Stage: "Propose", Deals: 6, "Open NNACV": 900000 },
        { Stage: "Negotiate", Deals: 4, "Open NNACV": 750000 },
      ],
    },
    chart_spec: { type: "bar", x: "Stage", y: "Open NNACV", unit: "usd" },
    source: "salesforce (demo)", as_of: iso(0),
  };
}

function agentResult(instruction: string): AgentResult {
  const inst = (instruction || "").trim();
  return {
    answer_text: inst
      ? `I looked at the account and drafted a next step. Nothing is written to Salesforce — the update below is staged for your approval. (Demo mode: staging is simulated.)`
      : "Tell me what you'd like to do on this account and I'll draft it. Any change to Salesforce is staged for your approval first.",
    tool_calls: inst
      ? [{ name: "read_account_context", args: { account_id: "acc_001" }, ok: true },
         { name: "stage_next_step_update", args: { opp: "opp_101", next_step: "Confirm economic-buyer sign-off; target close in 3 weeks." }, ok: true }]
      : [],
    staged_writes: inst
      ? [{ object: "Opportunity", id: "opp_101", field: "NextStep", value: "Confirm economic-buyer sign-off; target close in 3 weeks." }]
      : [],
    iterations: inst ? 2 : 0,
    degraded: false,
  };
}

// ---- Router ---------------------------------------------------------------
let requestSeq = 100;

export function demoResponse(method: "GET" | "POST", rawPath: string, body?: unknown): unknown {
  const [path, query] = rawPath.split("?");
  if (method === "GET") {
    if (path === "/accounts") return ACCOUNTS;
    if (path.startsWith("/context/account/")) {
      const id = decodeURIComponent(path.slice("/context/account/".length));
      return CONTEXTS[id] ?? CONTEXTS[ACCOUNTS[0].sfdc_account_id];
    }
    if (path === "/change-events") {
      const acct = new URLSearchParams(query || "").get("account_id");
      if (acct) {
        const evs = EVENTS.filter((e) => e.sfdc_account_id === acct);
        return { detected_date: iso(0), count: evs.length, events: evs };
      }
      return CHANGE_EVENTS_RESULT;
    }
    if (path === "/me") return VIEWER;
    if (path === "/rep-scorecard") return REP_SCORECARD;
    if (path === "/xdr-scorecard") return XDR_SCORECARD;
    if (path === "/csm-scorecard") return CSM_SCORECARD;
    if (path === "/funnel-velocity") return FUNNEL_VELOCITY;
    if (path === "/account-360") return ACCOUNT_360;
    if (path === "/deal-activity") return DEAL_ACTIVITY;
    if (path === "/call-blitz") {
      const d = new URLSearchParams(query || "").get("day");
      return d ? { ...CALL_BLITZ, day: d } : CALL_BLITZ;
    }
    if (path === "/meetings-booked") return MEETINGS_BOOKED;
    if (path === "/opps") {
      const st = new URLSearchParams(query || "").get("snapshot_type");
      return st === "created" ? CREATED_OPPS : OPEN_OPPS;   // open (default) + created snapshots
    }
    if (path === "/industry") return INDUSTRY;
    if (path === "/summary") return SUMMARY;
    if (path === "/forecast") return FORECAST;
    if (path === "/new-logo") return NEW_LOGO;
    if (path === "/win-rate-by-rev-type") return WIN_RATE;
    if (path === "/exclusions/accounts") return ACCOUNT_EXCLUSIONS;
    if (path === "/wow") return WOW;
    if (path === "/roadmap") return ROADMAP;
    if (path === "/revos-requests") return REVOS_REQUESTS;
    if (path === "/prospecting-requests") return PROSPECTING_REQUESTS;
    if (path === "/partner") return PARTNER;
  } else {
    if (path === "/ask") return askResult((body as { question?: string })?.question ?? "");
    if (path === "/agent") return agentResult((body as { instruction?: string })?.instruction ?? "");
    if (path === "/revos-request") {
      const b = (body as { kind?: string }) || {};
      return { id: ++requestSeq, created_at: new Date().toISOString(), kind: b.kind ?? "idea", status: "open" };
    }
    if (path === "/prospecting-request") {
      const b = (body as { accounts?: unknown[]; max_per_account?: number }) || {};
      const nAcc = (b.accounts || []).length;
      return { id: ++requestSeq, created_at: new Date().toISOString(), status: "new",
               accounts: nAcc, estimated_contacts: nAcc * (b.max_per_account || 5) };
    }
  }
  throw new Error(`demo: no fixture for ${method} ${rawPath}`);
}

export const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
