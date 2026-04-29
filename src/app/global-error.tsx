"use client";

// src/app/global-error.tsx
// Catches crashes inside the root layout itself.
// Must use plain HTML — no ThemeProvider, no Tailwind guaranteed.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "16px",
          textAlign: "center",
          padding: "24px",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "#fef2f2",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>
            ⚠️
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#111" }}>
              Something went wrong
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 14, maxWidth: 320 }}>
              A critical error occurred. Please refresh the page or try again.
            </p>
            {error.digest && (
              <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              background: "#111827",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}