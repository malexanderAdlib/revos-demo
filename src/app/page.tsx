"use client";

import { useCallback, useEffect, useState } from "react";
import { AdlibHeader, type Area } from "@/components/AdlibHeader";
import { AccountsArea } from "@/components/AccountsArea";
import { AskArea } from "@/components/AskArea";
import { HomeArea } from "@/components/HomeArea";
import { PerformanceArea } from "@/components/PerformanceArea";
import { RoadmapArea } from "@/components/RoadmapArea";
import { getUserEmail } from "@/lib/api";

// RevOS shell — the 5-area workspace (Home · Ask · Accounts · Performance ·
// Roadmap), all built. Role only decides SCOPE, enforced server-side.
export default function Page() {
  const [area, setArea] = useState<Area>("home");
  const [email, setEmail] = useState<string | null>(null);
  // Set when Home (or a future area) deep-links a specific account; consumed by
  // AccountsArea on mount to open straight into that account's deep-dive.
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);

  // Identity is resolved client-side (query param / localStorage / dev env).
  useEffect(() => {
    setEmail(getUserEmail());
  }, []);

  const openAccount = useCallback((id: string) => {
    setPendingAccountId(id);
    setArea("accounts");
  }, []);

  return (
    <div className="min-h-screen bg-revos-ground text-revos-ink">
      <AdlibHeader active={area} onNavigate={setArea} email={email} />
      {area === "home" ? (
        <HomeArea onOpenAccount={openAccount} />
      ) : area === "ask" ? (
        <AskArea />
      ) : area === "accounts" ? (
        <AccountsArea initialAccountId={pendingAccountId} />
      ) : area === "performance" ? (
        <PerformanceArea />
      ) : (
        <RoadmapArea />
      )}
    </div>
  );
}
