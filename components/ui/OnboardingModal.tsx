"use client";
// Onboarding modal — shown on first visit to guide new users
// Walks through: install Freighter → get testnet XLM → post or accept a job

import { useState, useEffect } from "react";
import {
  X, Wallet, Coins, Briefcase, CheckCircle2,
  ArrowRight, ExternalLink, ChevronLeft,
} from "lucide-react";

const STEPS = [
  {
    id: "welcome",
    icon: "⚡",
    title: "Welcome to StellarWork",
    subtitle: "Trustless freelancing on Stellar",
    content: (
      <div>
        <p style={{ fontSize: 14, color: "#888", lineHeight: 1.75, marginBottom: 16 }}>
          StellarWork is a decentralized freelance platform where payments are locked in
          smart contracts — no middlemen, no platform fees, no trust required.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "🔒", text: "Funds locked on-chain until work is approved" },
            { icon: "⚡", text: "Instant XLM release when milestones are approved" },
            { icon: "🏆", text: "Earn WORK reputation tokens for completed jobs" },
            { icon: "⚖️", text: "Built-in dispute resolution via arbitration" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#666" }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "wallet",
    icon: "👛",
    title: "Install Freighter Wallet",
    subtitle: "Your gateway to Stellar",
    content: (
      <div>
        <p style={{ fontSize: 14, color: "#888", lineHeight: 1.75, marginBottom: 20 }}>
          Freighter is a browser extension wallet for Stellar. You'll need it to sign
          transactions and interact with the smart contracts.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { step: "1", text: "Install Freighter from freighter.app", href: "https://www.freighter.app/" },
            { step: "2", text: "Create a new wallet and save your seed phrase" },
            { step: "3", text: "Switch to Testnet in Freighter settings" },
          ].map(({ step, text, href }) => (
            <div key={step} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: "#0d0d0d", borderRadius: 10,
              border: "1px solid #1a1a1a", padding: "12px 16px",
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "rgba(232,50,60,0.15)", border: "1px solid rgba(232,50,60,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#e8323c", flexShrink: 0,
              }}>{step}</span>
              <span style={{ fontSize: 13, color: "#888", flex: 1 }}>{text}</span>
              {href && (
                <a href={href} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#e8323c", display: "flex" }}>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "xlm",
    icon: "💰",
    title: "Get Testnet XLM",
    subtitle: "Fund your wallet for free",
    content: (
      <div>
        <p style={{ fontSize: 14, color: "#888", lineHeight: 1.75, marginBottom: 20 }}>
          StellarWork runs on Stellar Testnet. You can get free testnet XLM from the
          Stellar Friendbot — no real money needed.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { step: "1", text: "Copy your Stellar address from Freighter" },
            { step: "2", text: "Visit the Stellar Friendbot to fund your account", href: "https://laboratory.stellar.org/#account-creator?network=test" },
            { step: "3", text: "Paste your address and click 'Get test network lumens'" },
            { step: "4", text: "You'll receive 10,000 XLM — more than enough to test" },
          ].map(({ step, text, href }) => (
            <div key={step} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: "#0d0d0d", borderRadius: 10,
              border: "1px solid #1a1a1a", padding: "12px 16px",
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#22c55e", flexShrink: 0,
              }}>{step}</span>
              <span style={{ fontSize: 13, color: "#888", flex: 1 }}>{text}</span>
              {href && (
                <a href={href} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#22c55e", display: "flex" }}>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "start",
    icon: "🚀",
    title: "Start Building",
    subtitle: "Post a job or find work",
    content: (
      <div>
        <p style={{ fontSize: 14, color: "#888", lineHeight: 1.75, marginBottom: 20 }}>
          You're ready to go. Here's what you can do on StellarWork:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            {
              icon: "📋",
              title: "Post a Job (Client)",
              desc: "Lock XLM in escrow, define milestones, and hire a freelancer",
              href: "/jobs",
              cta: "Post a Job",
            },
            {
              icon: "💼",
              title: "Find Work (Freelancer)",
              desc: "Browse open jobs, accept one, and submit your deliverables",
              href: "/jobs",
              cta: "Browse Jobs",
            },
            {
              icon: "📊",
              title: "Track Your Escrow",
              desc: "Monitor milestone status, approve work, and manage disputes",
              href: "/escrow",
              cta: "View Escrow",
            },
          ].map(({ icon, title, desc, href, cta }) => (
            <a key={title} href={href} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: "#0d0d0d", borderRadius: 10,
              border: "1px solid #1a1a1a", padding: "14px 16px",
              textDecoration: "none",
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#555" }}>{desc}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, color: "#e8323c",
                background: "rgba(232,50,60,0.1)", padding: "4px 10px",
                borderRadius: 7, border: "1px solid rgba(232,50,60,0.2)",
                flexShrink: 0,
              }}>{cta}</span>
            </a>
          ))}
        </div>
      </div>
    ),
  },
];

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("sw_onboarded");
    if (!seen) {
      // Small delay so the page loads first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("sw_onboarded", "1");
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "#111", borderRadius: 24,
        border: "1px solid #2a2a2a",
        width: "100%", maxWidth: 520,
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: "#1a1a1a" }}>
          <div style={{
            height: "100%", background: "#e8323c",
            width: `${((step + 1) / STEPS.length) * 100}%`,
            transition: "width 0.3s ease",
          }} />
        </div>

        <div style={{ padding: "32px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: "rgba(232,50,60,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>
                {current.icon}
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px" }}>{current.title}</h2>
                <p style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{current.subtitle}</p>
              </div>
            </div>
            <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          {/* Step content */}
          <div style={{ marginBottom: 28 }}>
            {current.content}
          </div>

          {/* Step dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 20 : 6, height: 6, borderRadius: 3,
                  background: i === step ? "#e8323c" : "#2a2a2a",
                  border: "none", cursor: "pointer",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 18px", borderRadius: 10,
                  background: "#1a1a1a", border: "1px solid #2a2a2a",
                  fontSize: 13, fontWeight: 600, color: "#888", cursor: "pointer",
                }}
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button
              onClick={isLast ? dismiss : () => setStep(s => s + 1)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 0", borderRadius: 10,
                background: "#e8323c", border: "none",
                fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer",
              }}
            >
              {isLast ? (
                <><CheckCircle2 size={15} /> Get Started</>
              ) : (
                <>Next <ArrowRight size={14} /></>
              )}
            </button>
          </div>

          <button
            onClick={dismiss}
            style={{
              width: "100%", marginTop: 10, padding: "8px 0",
              background: "none", border: "none",
              fontSize: 12, color: "#444", cursor: "pointer",
            }}
          >
            Skip intro
          </button>
        </div>
      </div>
    </div>
  );
}
