import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StellarWork — Trustless Freelancing on Stellar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background grid */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(232,50,60,0.08) 0%, transparent 70%)",
          display: "flex",
        }} />

        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 32,
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#e8323c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}>
            ⚡
          </div>
          <span style={{ fontSize: 40, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>
            Stellar<span style={{ color: "#e8323c" }}>Work</span>
          </span>
        </div>

        {/* Headline */}
        <div style={{
          fontSize: 56,
          fontWeight: 800,
          color: "#fff",
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: "-2px",
          maxWidth: 900,
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          <span>Freelance without</span>
          <span style={{ color: "#e8323c" }}>trusting anyone.</span>
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 22,
          color: "#666",
          textAlign: "center",
          maxWidth: 700,
          lineHeight: 1.5,
          marginBottom: 40,
          display: "flex",
        }}>
          Milestone-based escrow powered by Soroban smart contracts on Stellar
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 12 }}>
          {["Built on Stellar", "Soroban Smart Contracts", "Zero Fees"].map(label => (
            <div key={label} style={{
              padding: "8px 18px",
              borderRadius: 100,
              border: "1px solid rgba(232,50,60,0.3)",
              background: "rgba(232,50,60,0.08)",
              fontSize: 14,
              fontWeight: 600,
              color: "#e8323c",
              display: "flex",
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          position: "absolute",
          bottom: 32,
          fontSize: 16,
          color: "#333",
          display: "flex",
        }}>
          ste-work.vercel.app
        </div>
      </div>
    ),
    { ...size },
  );
}
