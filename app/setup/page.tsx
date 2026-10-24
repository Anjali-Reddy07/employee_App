"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

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

function StrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["#e2e8f0", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

  if (!password) return null;

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "5px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              background: i <= score ? colors[score] : "#e2e8f0",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: "11px", color: colors[score], fontWeight: 600 }}>
        {score > 0 ? `${labels[score]} password` : ""}
      </span>
    </div>
  );
}

type Step = "check" | "setup" | "done";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("check");

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // On mount: check if setup is needed
  useEffect(() => {
    async function checkSetupStatus() {
      try {
        // If already logged in, go to dashboard
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.authenticated) {
            router.replace("/dashboard");
            return;
          }
        }

        // Check if setup is needed
        const setupRes = await fetch("/api/auth/setup");
        if (setupRes.ok) {
          const setupData = await setupRes.json();
          if (!setupData.needsSetup) {
            // Admin already exists — redirect to login
            router.replace("/login");
            return;
          }
        }
        setStep("setup");
      } catch {
        setStep("setup"); // Fail open — show the form
      }
    }
    checkSetupStatus();
  }, [router]);

  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const canSubmit =
    username.trim().length >= 3 &&
    password.length >= 8 &&
    password === confirmPassword;

  async function handleSetup(e: FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (!username.trim()) {
      setErrorMessage("Username is required.");
      return;
    }
    if (username.trim().length < 3) {
      setErrorMessage("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
      setErrorMessage("Username may only contain letters, numbers, underscores, hyphens, and dots.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          // Setup already done — go to login
          router.replace("/login");
          return;
        }
        setErrorMessage(data.error || "Setup failed. Please try again.");
        return;
      }

      // Success: auto-signed in, show success then redirect
      setStep("done");
      setTimeout(() => router.replace("/dashboard"), 2000);
    } catch {
      setErrorMessage("Unable to reach database. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Loading / checking state ──────────────────────────────────────────────
  if (step === "check") {
    return (
      <div className="login-page">
        <div className="login-bg-glow" />
        <div className="login-card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              width: "44px", height: "44px", border: "3px solid #e2e8f0",
              borderTopColor: "#6d28d9", borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto",
            }} />
          </div>
          <p style={{ color: "#64748b", fontSize: "14px" }}>Checking system status…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="login-page">
        <div className="login-bg-glow" />
        <div className="login-card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <div style={{
            width: "64px", height: "64px", background: "linear-gradient(135deg,#22c55e,#16a34a)",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontSize: "28px",
          }}>
            ✓
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
            Account Created!
          </h2>
          <p style={{ color: "#64748b", margin: "0 0 16px", fontSize: "14px" }}>
            Your admin account has been set up successfully.<br />
            Redirecting to the dashboard…
          </p>
          <div style={{
            width: "100%", height: "3px", background: "#e2e8f0", borderRadius: "2px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", background: "linear-gradient(90deg,#6d28d9,#2563eb)",
              animation: "progress 2s linear forwards",
            }} />
          </div>
        </div>
        <style>{`@keyframes progress { from { width: 0%; } to { width: 100%; } }`}</style>
      </div>
    );
  }

  // ── Setup Form ────────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      <div className="login-bg-glow" />

      <div className="login-card" style={{ maxWidth: "460px" }}>
        {/* Brand */}
        <div className="login-brand-wrap">
          <div className="brand" style={{ margin: 0 }}>
            <BrandMark />
            <span>people<span className="brand-period">.</span></span>
          </div>
          <span
            className="login-badge"
            style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "#fff" }}
          >
            First-Time Setup
          </span>
        </div>

        {/* Heading */}
        <h1 className="login-title" style={{ marginTop: "24px" }}>Create Admin Account</h1>
        <p className="login-subtitle">
          Welcome! No admin account exists yet. Set up your credentials to get started.
          This setup page will be disabled once your account is created.
        </p>

        {/* Steps indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          margin: "20px 0 24px", padding: "12px 16px",
          background: "#f0f4ff", border: "1px solid #c7d2fe",
          borderRadius: "10px", fontSize: "12px", color: "#3730a3",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            <strong>One-time setup:</strong> Your password will be securely hashed with bcrypt before storage.
          </span>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="error-message" role="alert" style={{ marginBottom: "18px" }}>
            {errorMessage}
          </div>
        )}

        {/* Setup Form */}
        <form className="login-form" onSubmit={handleSetup} noValidate>
          {/* Username */}
          <div className="field">
            <label htmlFor="setup-username">
              Admin Username <span className="required-mark">*</span>
            </label>
            <input
              id="setup-username"
              type="text"
              placeholder="e.g. admin, john_doe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              minLength={3}
              maxLength={100}
            />
            <span className="field-hint">
              Min 3 chars. Letters, numbers, underscores, hyphens, and dots only.
            </span>
          </div>

          {/* Password */}
          <div className="field">
            <label htmlFor="setup-password">
              Password <span className="required-mark">*</span>
            </label>
            <div className="password-input-wrap">
              <input
                id="setup-password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                style={{ paddingRight: "48px" }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <StrengthBar password={password} />
          </div>

          {/* Confirm Password */}
          <div className="field">
            <label htmlFor="setup-confirm">
              Confirm Password <span className="required-mark">*</span>
            </label>
            <div className="password-input-wrap">
              <input
                id="setup-confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{
                  paddingRight: "48px",
                  borderColor: confirmPassword && !passwordsMatch ? "#ef4444" : undefined,
                  boxShadow: confirmPassword && !passwordsMatch ? "0 0 0 3px rgba(239,68,68,.15)" : undefined,
                }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <span style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px", display: "block" }}>
                Passwords do not match
              </span>
            )}
            {confirmPassword && passwordsMatch && (
              <span style={{ fontSize: "12px", color: "#22c55e", marginTop: "4px", display: "block", fontWeight: 600 }}>
                ✓ Passwords match
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading || !canSubmit}
            id="setup-submit-btn"
            style={{
              marginTop: "8px",
              background: canSubmit
                ? "linear-gradient(135deg, #7c3aed, #2563eb)"
                : undefined,
              opacity: !canSubmit && !isLoading ? 0.6 : 1,
              cursor: !canSubmit && !isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? (
              <span>Creating Account…</span>
            ) : (
              <>
                <span>Create Admin Account</span>
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        {/* Security note */}
        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
          Password hashed with <strong>bcrypt</strong> (cost factor 12) before storage in{" "}
          <code>dbo.AdminUser</code>
        </div>
      </div>
    </div>
  );
}
