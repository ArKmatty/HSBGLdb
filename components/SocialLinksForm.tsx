"use client";

import { useState } from "react";
import { X, Plus, Check, AlertCircle, Loader2 } from "lucide-react";
import { submitSocialLink } from "@/app/actions/socials";
import { useFocusTrap } from "@/lib/useFocusTrap";

const PLATFORMS = [
  { key: "twitch", label: "Twitch", prefix: "twitch.tv/" },
  { key: "youtube", label: "YouTube", prefix: "youtube.com/@" },
  { key: "twitter", label: "X / Twitter", prefix: "x.com/" },
  { key: "discord", label: "Discord", prefix: "" },
];

export default function SocialLinksForm({ playerName }: { playerName: string }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState("twitch");
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trapRef = useFocusTrap(open);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await submitSocialLink({ playerName, platform, username });

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || "Something went wrong.");
    }

    setLoading(false);
  };

  const reset = () => {
    setOpen(false);
    setSubmitted(false);
    setUsername("");
    setError(null);
  };

  const selectedPlatform = PLATFORMS.find(p => p.key === platform);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
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
          transition: "all 150ms",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "var(--border-mid)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "var(--border-dim)";
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        <Plus size={14} />
        Add social
      </button>

      {open && (
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="social-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) reset(); }}
          onKeyDown={e => { if (e.key === 'Escape') reset(); }}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: 12,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 id="social-modal-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                Add social link
              </h3>
              <button
                onClick={reset}
                aria-label="Close form"
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {submitted ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "rgba(52,211,153,0.1)",
                  border: "1px solid rgba(52,211,153,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "var(--green)",
                }}>
                  <Check size={24} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                  Link submitted!
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
                  It will appear on the profile once approved.
                </p>
                <button
                  onClick={reset}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--accent)",
                    color: "var(--bg-base)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="platform-select" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Platform
                  </label>
                  <div role="radiogroup" aria-label="Platform selection" style={{ display: "flex", gap: 6 }}>
                    {PLATFORMS.map(p => (
                      <button
                        key={p.key}
                        type="button"
                        role="radio"
                        aria-checked={platform === p.key}
                        id={`platform-${p.key}`}
                        onClick={() => setPlatform(p.key)}
                        style={{
                          flex: 1,
                          padding: "8px 4px",
                          borderRadius: 6,
                          border: platform === p.key ? "1px solid var(--accent)" : "1px solid var(--border-dim)",
                          background: platform === p.key ? "var(--accent-dim)" : "transparent",
                          color: platform === p.key ? "var(--accent)" : "var(--text-muted)",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "border-color 150ms, background-color 150ms, color 150ms",
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="username-input" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Username
                  </label>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-mid)",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}>
                    {selectedPlatform?.prefix && (
                      <span style={{
                        padding: "10px 0 10px 12px",
                        fontSize: 12,
                        color: "var(--text-muted)",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}>
                        {selectedPlatform.prefix}
                      </span>
                    )}
                    <input
                      id="username-input"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder={selectedPlatform?.key === "discord" ? "username#0000" : "username"}
                      required
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        background: "transparent",
                        border: "none",
                        color: "var(--text-primary)",
                        fontSize: 13,
                        fontWeight: 500,
                        fontFamily: "inherit",
                        outline: "none",
                        minWidth: 0,
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 12px",
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.15)",
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 12,
                    color: "var(--red)",
                  }}>
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--accent)",
                    color: "var(--bg-base)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? "Submitting..." : "Submit link"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
