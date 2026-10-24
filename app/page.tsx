"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        // 1. Already authenticated?
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.authenticated) {
            router.replace("/dashboard");
            return;
          }
        }

        // 2. First-time setup needed?
        const setupRes = await fetch("/api/auth/setup");
        if (setupRes.ok) {
          const setupData = await setupRes.json();
          if (setupData.needsSetup) {
            router.replace("/setup");
            return;
          }
        }

        router.replace("/login");
      } catch {
        router.replace("/login");
      }
    }

    checkAuth();
  }, [router]);

  return (
    <div style={{ display: "grid", minHeight: "100vh", placeItems: "center", background: "#f8f9fb" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: "#64748b" }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid #7057d9", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "13px", fontWeight: 500 }}>Redirecting to Admin Portal...</span>
      </div>
    </div>
  );
}
