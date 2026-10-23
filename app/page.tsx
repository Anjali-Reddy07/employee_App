"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            router.replace("/dashboard");
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
