"use client";

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      style={{
        position: "absolute",
        left: "-9999px",
        zIndex: 9999,
        padding: "12px 24px",
        background: "var(--accent)",
        color: "#000",
        fontWeight: 600,
        textDecoration: "none",
        borderRadius: 8,
      }}
      onFocus={(e) => (e.currentTarget.style.left = "16px")}
      onBlur={(e) => (e.currentTarget.style.left = "-9999px")}
    >
      Skip to content
    </a>
  );
}
