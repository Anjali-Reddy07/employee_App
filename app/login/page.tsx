"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M7 21.5 16 6l9 15.5H7Z" fill="currentColor" />
        <path d="m12.1 21.5 3.9-6.7 3.9 6.7h-7.8Z" fill="#fff" />
      </svg>
    </span>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [checking, setChecking] = useState(true);

  // On mount: redirect if already authenticated or setup is needed
  useEffect(() => {
    async function checkStatus() {
      try {
        // 1. Already logged in?
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.authenticated) {
            router.replace("/dashboard");
            return;
          }
        }

        // 2. No admin created yet → go to first-time setup
        const setupRes = await fetch("/api/auth/setup");
        if (setupRes.ok) {
          const setupData = await setupRes.json();
          if (setupData.needsSetup) {
            router.replace("/setup");
            return;
          }
        }
      } catch {
        // DB might be unreachable — show form anyway
      } finally {
        setChecking(false);
      }
    }
    checkStatus();
  }, [router]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUser, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Invalid username or password.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Unable to connect to database. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Loading / redirect check ───────────────────────────────────────────────
  if (checking) {
    return (
      <div className="login-page">
        <div className="login-bg-glow" />
        <div className="login-card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <div style={{
            width: "40px", height: "40px", border: "3px solid #e2e8f0",
            borderTopColor: "#6d28d9", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }} />
          <p style={{ color: "#64748b", fontSize: "14px" }}>Verifying session…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Sign-in form ───────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      <div className="login-bg-glow" />

      <div className="login-card">
        {/* Brand & Badge */}
        <div className="login-brand-wrap">
          <div className="brand" style={{ margin: 0 }}>
            <BrandMark />
            <span>people<span className="brand-period">.</span></span>
          </div>
          <span className="login-badge">Admin Portal</span>
        </div>

        <h1 className="login-title">Admin Sign In</h1>
        <p className="login-subtitle">
          Authenticate with your administrator credentials to manage employee records.
        </p>

        {/* Error Alert */}
        {errorMessage && (
          <div className="error-message" role="alert" style={{ marginBottom: "18px" }}>
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <form className="login-form" onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="username">Admin Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Admin Password</label>
            <div className="password-input-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: "48px" }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading}
            id="login-submit-btn"
          >
            {isLoading ? (
              <span>Authenticating…</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        {/* First-time setup link */}
        <div style={{
          marginTop: "18px", padding: "12px 16px",
          background: "#f8fafc", border: "1px solid #e2e8f0",
          borderRadius: "10px", display: "flex",
          alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            No admin account yet?
          </span>
          <Link
            href="/setup"
            style={{
              fontSize: "12px", fontWeight: 600,
              color: "#6d28d9", textDecoration: "none",
              padding: "4px 12px", border: "1px solid #ede9fe",
              borderRadius: "6px", background: "#f5f3ff",
              transition: "background 0.15s",
            }}
          >
            First-Time Setup →
          </Link>
        </div>

        <div style={{ marginTop: "16px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
          Protected by PostgreSQL database authentication (<code>admin_user</code>) with bcrypt hashing
        </div>
      </div>
    </div>
  );
}
