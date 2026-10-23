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

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Check if already authenticated on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            router.push("/dashboard");
          }
        }
      } catch {
        // Not logged in, proceed to login form
      }
    }
    checkAuth();
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

      // Successful login - redirect to employee dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Unable to connect to database. Ensure SQL Server is running.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleAutofill() {
    setUsername("admin");
    setPassword("admin123");
    setErrorMessage("");
  }

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
          Authenticate with your SQL Server administrator credentials to manage organizational employee records.
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
                style={{ paddingRight: "40px" }}
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
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Callout */}
        <div className="demo-credentials-box">
          <div>
            <strong>Default SQL Server Credentials:</strong>
            <div style={{ marginTop: "2px", color: "#64748b" }}>
              Username: <code>admin</code> &nbsp;|&nbsp; Password: <code>admin123</code>
            </div>
          </div>
          <button type="button" className="autofill-btn" onClick={handleAutofill}>
            Autofill
          </button>
        </div>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
          Protected by SQL Server Database Authentication (<code>dbo.AdminUser</code>)
        </div>
      </div>
    </div>
  );
}
