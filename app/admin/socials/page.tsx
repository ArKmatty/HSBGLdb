import Link from "next/link";
import { getPendingSubmissions, approveSubmission, rejectSubmission } from "@/app/actions/socials";
import { Check, X, ArrowLeft } from "lucide-react";

export default async function AdminPage() {
  const result = await getPendingSubmissions();

  if (!result.success) {
    return (
      <main style={{ minHeight: "100dvh", padding: "40px 24px" }}>
        <p style={{ color: "var(--red)" }}>Error: {result.error}</p>
      </main>
    );
  }

  const submissions = result.submissions || [];

  return (
    <main style={{ minHeight: "100dvh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-muted)",
            marginBottom: 32,
          }}
        >
          <ArrowLeft size={16} />
          Back to leaderboard
        </Link>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
          Social Link Submissions
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 32 }}>
          {submissions.length} pending {submissions.length === 1 ? "submission" : "submissions"}
        </p>

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
            {submissions.map((s: { id: string; player_name: string; platform: string; username: string; url: string; created_at: string }) => (
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
                  <form action={async () => { "use server"; await approveSubmission(s.id); }}>
                    <button
                      type="submit"
                      style={{
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid rgba(52,211,153,0.3)",
                        background: "rgba(52,211,153,0.1)",
                        color: "var(--green)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <Check size={14} /> Approve
                    </button>
                  </form>
                  <form action={async () => { "use server"; await rejectSubmission(s.id); }}>
                    <button
                      type="submit"
                      style={{
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid rgba(248,113,113,0.3)",
                        background: "rgba(248,113,113,0.1)",
                        color: "var(--red)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
