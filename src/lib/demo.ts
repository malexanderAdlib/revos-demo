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
  ],
  reps: [
    { seller: "Jordan Reyes", open_opps: 9, cells: {
      open_pipeline: cell(1240000, "green", 82000), win_rate: cell(41, "green", 3),
      coverage: cell(318, "green", 12), next_step_fill: cell(94, "green", 2), meetings: cell(9, "green", 1) } },
    { seller: "Priya Nair", open_opps: 7, cells: {
      open_pipeline: cell(880000, "amber", -40000), win_rate: cell(33, "amber", -2),
      coverage: cell(214, "red", -8), next_step_fill: cell(78, "amber", -6), meetings: cell(6, "amber", 0) } },
    { seller: "Sam Whitfield", open_opps: 8, cells: {
      open_pipeline: cell(1010000, "green", 25000), win_rate: cell(38, "green", 1),
      coverage: cell(296, "amber", 4), next_step_fill: cell(91, "green", 3), meetings: cell(8, "green", 2) } },
    { seller: "Diego Alvarez", open_opps: 6, cells: {
      open_pipeline: cell(720000, "amber", -15000), win_rate: cell(29, "red", -4),
      coverage: cell(188, "red", -3), next_step_fill: cell(69, "red", -9), meetings: cell(5, "red", -1) } },
    { seller: "Casey Lin", open_opps: 7, cells: {
      open_pipeline: cell(940000, "green", 51000), win_rate: cell(36, "green", 2),
      coverage: cell(272, "amber", 9), next_step_fill: cell(88, "amber", 5), meetings: cell(7, "amber", 1) } },
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
