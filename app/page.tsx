"use client";

import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";
import {
  Shield, Zap, Users, ArrowRight, CheckCircle,
  Lock, Star, Globe, ChevronRight, Code2, Coins
} from "lucide-react";

export default function Landing() {
  const { connect, isConnected } = useWallet();

  return (
    <div style={{ background: "#0a0a0a", color: "#fff" }}>

      {/* ── HERO ── */}
      <section style={{
        maxWidth: 1280, margin: "0 auto", padding: "100px 24px 80px",
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", gap: 24,
      }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 14px", borderRadius: 100,
          border: "1px solid rgba(232,50,60,0.3)",
          background: "rgba(232,50,60,0.08)",
          fontSize: 12, fontWeight: 600, color: "#e8323c",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e8323c" }} />
          Built on Stellar · Powered by Soroban
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(40px, 6vw, 72px)",
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: "-2px",
          maxWidth: 800,
        }}>
          Freelance without<br />
          <span style={{ color: "#e8323c" }}>trusting anyone.</span>
        </h1>

        <p style={{
          fontSize: 18, color: "#666", maxWidth: 520,
          lineHeight: 1.7, fontWeight: 400,
        }}>
          StellarWork locks funds in a Soroban smart contract and releases them
          automatically when milestones are approved. No middlemen. No fees. No trust required.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/jobs" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "13px 28px", borderRadius: 10,
            background: "#e8323c",
            fontSize: 14, fontWeight: 700, color: "#fff",
            textDecoration: "none",
            boxShadow: "0 0 30px rgba(232,50,60,0.3)",
          }}>
            Browse Jobs <ArrowRight size={16} />
          </Link>
          <button onClick={connect} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "13px 28px", borderRadius: 10,
            border: "1px solid #2a2a2a",
            background: "#141414",
            fontSize: 14, fontWeight: 600, color: "#fff",
            cursor: "pointer",
          }}>
            {isConnected ? "Go to Dashboard" : "Connect Wallet"}
          </button>
        </div>

        {/* Social proof */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 8 }}>
          {[
            { value: "$2.4M+", label: "Escrowed" },
            { value: "1,200+", label: "Jobs Completed" },
            { value: "0", label: "Disputes Lost" },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{value}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <div style={{
          borderRadius: 20,
          border: "1px solid #1f1f1f",
          background: "#111",
          overflow: "hidden",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
        }}>
          {/* Fake browser bar */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid #1a1a1a",
            display: "flex", alignItems: "center", gap: 8,
            background: "#0f0f0f",
          }}>
            {["#e8323c","#f97316","#22c55e"].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
            ))}
            <div style={{
              flex: 1, maxWidth: 300, margin: "0 auto",
              background: "#1a1a1a", borderRadius: 6,
              padding: "4px 12px", fontSize: 11, color: "#555",
              textAlign: "center",
            }}>
              stellarwork.app/dashboard
            </div>
          </div>

          {/* Mock dashboard content */}
          <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "Total Earned", value: "4,820 XLM", sub: "≈ $1,446", color: "#22c55e" },
              { label: "Active Jobs",  value: "3",         sub: "2 pending review", color: "#f97316" },
              { label: "Escrowed",     value: "1,200 XLM", sub: "Locked in contracts", color: "#e8323c" },
              { label: "WORK Tokens",  value: "340",       sub: "Reputation score", color: "#a78bfa" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{
                background: "#161616", borderRadius: 12,
                border: "1px solid #222", padding: "16px",
              }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{value}</div>
                <div style={{ fontSize: 11, color: color, marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Mock job rows */}
          <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { title: "Soroban DEX Smart Contract", budget: "900 XLM", status: "In Progress", statusColor: "#f97316" },
              { title: "Stellar Wallet UI Design",   budget: "400 XLM", status: "In Review",   statusColor: "#a78bfa" },
              { title: "Token Vesting Contract",     budget: "1,200 XLM", status: "In Progress", statusColor: "#f97316" },
            ].map(({ title, budget, status, statusColor }) => (
              <div key={title} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "#0f0f0f", borderRadius: 10,
                border: "1px solid #1a1a1a", padding: "12px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(232,50,60,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Code2 size={15} color="#e8323c" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{title}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{budget}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: statusColor,
                    background: `${statusColor}18`, padding: "3px 10px", borderRadius: 100,
                    border: `1px solid ${statusColor}30`,
                  }}>{status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e8323c", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
            How It Works
          </div>
          <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-1px" }}>
            Three steps to get paid
          </h2>
          <p style={{ fontSize: 16, color: "#555", marginTop: 12 }}>
            No escrow service. No platform fees. Just code.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            {
              step: "01",
              icon: <Lock size={22} color="#e8323c" />,
              title: "Client Funds Escrow",
              desc: "Client deposits XLM into a Soroban smart contract. Funds are locked until milestones are approved — no one can touch them.",
            },
            {
              step: "02",
              icon: <Code2 size={22} color="#e8323c" />,
              title: "Freelancer Delivers",
              desc: "Freelancer submits work for each milestone. Deliverable hash is stored on-chain. Client reviews and approves.",
            },
            {
              step: "03",
              icon: <Coins size={22} color="#e8323c" />,
              title: "Auto Payment Release",
              desc: "On approval, the contract instantly releases XLM to the freelancer. WORK reputation tokens are minted automatically.",
            },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} style={{
              background: "#111", borderRadius: 16,
              border: "1px solid #1f1f1f",
              padding: 28,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 20, right: 20,
                fontSize: 48, fontWeight: 900, color: "#1a1a1a",
                lineHeight: 1, userSelect: "none",
              }}>{step}</div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(232,50,60,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                {icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#e8323c", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
            Features
          </div>
          <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-1px" }}>
            Built for serious builders
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { icon: <Shield size={20} color="#e8323c" />, title: "Dispute Resolution", desc: "3rd-party arbitration built into the contract. Funds split fairly if both parties disagree." },
            { icon: <Zap size={20} color="#e8323c" />,    title: "Instant Settlement", desc: "Payments release in seconds on Stellar's 5-second finality. No waiting, no banks." },
            { icon: <Lock size={20} color="#e8323c" />,   title: "Time-Locked Escrow", desc: "Deadlines enforced on-chain. If client ghosts, funds auto-release to freelancer." },
            { icon: <Star size={20} color="#e8323c" />,   title: "WORK Token Reputation", desc: "Every completed job mints WORK tokens. Your on-chain reputation follows you forever." },
            { icon: <Globe size={20} color="#e8323c" />,  title: "Global & Permissionless", desc: "Anyone with a Stellar wallet can use StellarWork. No KYC, no geography restrictions." },
            { icon: <Users size={20} color="#e8323c" />,  title: "Multi-Sig Clients", desc: "Teams can require multiple approvals before releasing milestone payments." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{
              background: "#111", borderRadius: 14,
              border: "1px solid #1f1f1f",
              padding: "22px 24px",
              transition: "border-color 0.2s",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: "rgba(232,50,60,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 14,
              }}>
                {icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 13, color: "#555", lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 120px" }}>
        <div style={{
          borderRadius: 20,
          background: "linear-gradient(135deg, #1a0a0b 0%, #0f0f0f 50%, #0a0a14 100%)",
          border: "1px solid rgba(232,50,60,0.2)",
          padding: "60px 48px",
          textAlign: "center",
          position: "relative", overflow: "hidden",
        }}>
          {/* Glow */}
          <div style={{
            position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
            width: 400, height: 200,
            background: "radial-gradient(ellipse, rgba(232,50,60,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-1px", marginBottom: 16 }}>
            Ready to build on Stellar?
          </h2>
          <p style={{ fontSize: 16, color: "#666", marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
            Connect your Freighter wallet and start posting or applying for jobs today.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/jobs" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 28px", borderRadius: 10,
              background: "#e8323c",
              fontSize: 14, fontWeight: 700, color: "#fff",
              textDecoration: "none",
              boxShadow: "0 0 30px rgba(232,50,60,0.3)",
            }}>
              Browse Jobs <ChevronRight size={16} />
            </Link>
            <Link href="/about" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 28px", borderRadius: 10,
              border: "1px solid #2a2a2a",
              background: "transparent",
              fontSize: 14, fontWeight: 600, color: "#fff",
              textDecoration: "none",
            }}>
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid #141414",
        padding: "32px 24px",
        maxWidth: 1280, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "#e8323c", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={11} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
            Stellar<span style={{ color: "#e8323c" }}>Work</span>
          </span>
        </div>
        <p style={{ fontSize: 12, color: "#333" }}>
          Built for Stellar Journey to Mastery · Level 4 Green Belt
        </p>
        <div style={{ display: "flex", gap: 20 }}>
          {["About", "Jobs", "Dashboard"].map(l => (
            <Link key={l} href={`/${l.toLowerCase()}`} style={{ fontSize: 12, color: "#444", textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
