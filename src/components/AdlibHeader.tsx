"use client";

// RevOS top bar — the AdlibHeader look (blue "A" square + "Adlib RevOS") plus
// the 5-area nav (Home · Ask · Accounts · Performance · Roadmap). Light-only,
// brand blue (#0055CC), matching the approved mock.

export type Area = "home" | "ask" | "accounts" | "performance" | "roadmap";

export const AREAS: { id: Area; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "ask", label: "Ask" },
  { id: "accounts", label: "Accounts" },
  { id: "performance", label: "Performance" },
  { id: "roadmap", label: "Roadmap" },
];

export function AdlibHeader({
  active,
  onNavigate,
  email,
}: {
  active: Area;
  onNavigate: (a: Area) => void;
  email?: string | null;
}) {
  const initials = (email || "")
    .split("@")[0]
    .split(/[.\-_]/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "MA";

  return (
    <header className="sticky top-0 z-10 h-[52px] bg-revos-panel border-b border-revos-line">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-[18px]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="flex items-center gap-[9px]"
          >
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-revos-brand text-[15px] font-bold leading-none text-white">
              A
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-bold tracking-tight text-revos-ink">Adlib</span>
              <span className="text-xs font-medium text-revos-ink3">RevOS</span>
            </span>
          </button>
          <span className="rounded-[20px] bg-revos-wash px-[9px] py-[3px] text-[11px] font-semibold text-revos-brand">
            Intelligence Layer
          </span>
          {process.env.NEXT_PUBLIC_DEMO === "1" && (
            <span
              title="Sample data — not live Salesforce"
              className="rounded-[20px] px-[9px] py-[3px] text-[11px] font-semibold"
              style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}
            >
              Demo data
            </span>
          )}
          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {AREAS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onNavigate(a.id)}
                className={
                  "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors " +
                  (active === a.id
                    ? "bg-revos-wash text-revos-brand"
                    : "text-revos-ink2 hover:bg-revos-card")
                }
              >
                {a.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3.5 text-[12.5px] text-revos-ink2">
          {email && <span className="hidden text-revos-ink3 sm:inline">{email}</span>}
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-revos-wash text-[11.5px] font-semibold text-revos-brand">
            {initials}
          </span>
        </div>
      </div>
    </header>
  );
}
