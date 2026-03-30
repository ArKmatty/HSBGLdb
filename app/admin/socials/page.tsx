"use client";

import { useEffect, useState } from "react";
import { loginAdmin, getPendingSubmissions, approveSubmission, rejectSubmission, logoutAdmin } from "@/app/actions/socials";
import { Check, X, ArrowLeft, LogOut, Lock, Loader2 } from "lucide-react";
import Link from "next/link";

interface Submission {
  id: string;
  player_name: string;
  platform: string;
  username: string;
  url: string;
  created_at: string;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const result = await getPendingSubmissions();
    if (result.success) {
      setAuthenticated(true);
      setSubmissions(result.submissions || []);
    } else if (result.error === "Unauthorized.") {
      setAuthenticated(false);
    } else {
      setFetchError(result.error || "Unknown error");
      setAuthenticated(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    const result = await loginAdmin(password);
    if (result.success) {
      setAuthenticated(true);
      const data = await getPendingSubmissions();
      if (data.success) {
        setSubmissions(data.submissions || []);
      }
    } else {
      setLoginError(result.error || "Wrong password.");
    }

    setLoginLoading(false);
  }

  async function handleLogout() {
    await logoutAdmin();
    setAuthenticated(false);
    setSubmissions([]);
    setPassword("");
  }

  async function handleApprove(id: string) {
    setActionLoading(id);
    await approveSubmission(id);
    const data = await getPendingSubmissions();
    if (data.success) {
      setSubmissions(data.submissions || []);
    }
    setActionLoading(null);
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    await rejectSubmission(id);
    const data = await getPendingSubmissions();
    if (data.success) {
      setSubmissions(data.submissions || []);
    }
    setActionLoading(null);
  }

  if (authenticated === null) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} color="var(--accent)" className="animate-spin" />
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-dim)",
          borderRadius: 12,
          padding: 32,
          width: "100%",
          maxWidth: 360,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "var(--accent-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--accent)",
            }}>
              <Lock size={24} />
            </div>
          </div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>
            Admin Access
          </h2>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
            Enter the admin password to continue
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-mid)",
                borderRadius: 8,
                color: "var(--text-primary)",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                marginBottom: loginError ? 12 : 20,
              }}
            />

            {loginError && (
              <div style={{
                padding: "8px 12px",
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.15)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--red)",
                marginBottom: 16,
              }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: "var(--accent)",
                color: "var(--bg-base)",
                fontSize: 13,
                fontWeight: 600,
                cursor: loginLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loginLoading && <Loader2 size={16} className="animate-spin" />}
              {loginLoading ? "Checking..." : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-muted)",
            }}
          >
            <ArrowLeft size={16} />
            Back to leaderboard
          </Link>
          <button
            onClick={handleLogout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--border-dim)",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
          Social Link Submissions
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 32 }}>
          {submissions.length} pending {submissions.length === 1 ? "submission" : "submissions"}
        </p>

        {fetchError && (
          <div style={{
            padding: "12px 16px",
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.15)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--red)",
            marginBottom: 24,
          }}>
            {fetchError}
          </div>
        )}

        {submissions.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "48px 0",
            color: "var(--text-muted)",
            fontSize: 14,
          }}>
            No pending submissions.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {submissions.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: "16px 18px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                    {s.player_name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {s.platform}: <span style={{ fontWeight: 600 }}>{s.username}</span>
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent)", marginLeft: 4 }}
                      >
                        ↗
                      </a>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => handleApprove(s.id)}
                    disabled={actionLoading === s.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid rgba(52,211,153,0.3)",
                      background: "rgba(52,211,153,0.1)",
                      color: actionLoading === s.id ? "var(--text-muted)" : "var(--green)",
                      cursor: actionLoading === s.id ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {actionLoading === s.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(s.id)}
                    disabled={actionLoading === s.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid rgba(248,113,113,0.3)",
                      background: "rgba(248,113,113,0.1)",
                      color: actionLoading === s.id ? "var(--text-muted)" : "var(--red)",
                      cursor: actionLoading === s.id ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {actionLoading === s.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
