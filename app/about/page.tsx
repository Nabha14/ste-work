"use client";
// About page — project mission, tech architecture, smart contract design, Journey to Mastery timeline

import { Shield, Zap, Code2, Users, Globe, Lock, Star, ArrowRight } from "lucide-react";
import Link from "next/link";

const TEAM = [
  { name: "Smart Contract Layer", role: "Soroban / Rust", desc: "Two inter-calling contracts: EscrowContract handles milestone state machines, WorkToken mints SEP-41 reputation tokens on completion.", icon: <Code2 size={20} color="#e8323c" /> },
  { name: "Frontend Layer",       role: "Next.js / TypeScript", desc: "Fully responsive dApp with Freighter wallet integration, real-time contract event listening, and a clean dark UI.", icon: <Globe size={20} color="#e8323c" /> },
  { name: "CI/CD Pipeline",       role: "GitHub Actions / Vercel", desc: "Automated testing and deployment on every push. Soroban contracts tested with cargo test before any frontend deploy.", icon: <Zap size={20} color="#e8323c" /> },
];

export default function About() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <div className="sw-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 12px", borderRadius: 100,
            border: "1px solid rgba(232,50,60,0.3)",
            background: "rgba(232,50,60,0.08)",
            fontSize: 11, fontWeight: 600, color: "#e8323c",
            marginBottom: 20,
          }}>
            About StellarWork
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-2px", lineHeight: 1.05, marginBottom: 20 }}>
            Trustless freelancing<br />
            <span style={{ color: "#e8323c" }}>on Stellar.</span>
          </h1>
          <p style={{ fontSize: 17, color: "#555", maxWidth: 600, lineHeight: 1.75 }}>
            StellarWork is a decentralized freelance escrow platform built on Stellar's Soroban
            smart contract platform. It eliminates the need for trust between clients and freelancers
            by encoding the entire payment agreement into immutable on-chain logic.
          </p>
        </div>

        {/* Mission */}
        <div className="sw-grid-2" style={{
          background: "#111", borderRadius: 20,
          border: "1px solid #1f1f1f",
          padding: "40px 48px",
          marginBottom: 48,
          gap: 48,
        }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 16 }}>
              The Problem
            </h2>
            <p style={{ fontSize: 15, color: "#555", lineHeight: 1.75 }}>
              Freelancers get stiffed. Clients get ghosted. Platforms take 20% and still
              can't guarantee outcomes. Traditional escrow services are slow, expensive,
              and require trusting a third party with your money.
            </p>
          </div>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 16 }}>
              Our Solution
            </h2>
            <p style={{ fontSize: 15, color: "#555", lineHeight: 1.75 }}>
              A Soroban smart contract that holds funds, tracks milestones, enforces deadlines,
              and releases payments automatically. No platform. No fees. No trust required —
              just code that does exactly what it says.
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1px", marginBottom: 8 }}>
            Technical Architecture
          </h2>
          <p style={{ fontSize: 15, color: "#555", marginBottom: 32 }}>
            Built to satisfy Stellar Journey to Mastery Level 4 (Green Belt) requirements.
          </p>
          <div className="sw-grid-3" style={{ gap: 16 }}>
            {TEAM.map(({ name, role, desc, icon }) => (
              <div key={name} style={{
                background: "#111", borderRadius: 16,
                border: "1px solid #1f1f1f", padding: 28,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(232,50,60,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16,
                }}>
                  {icon}
                </div>
                <div style={{ fontSize: 11, color: "#e8323c", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{role}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{name}</h3>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Details */}
        <div style={{
          background: "#111", borderRadius: 20,
          border: "1px solid #1f1f1f",
          padding: "40px 48px",
          marginBottom: 64,
        }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 24 }}>
            Smart Contract Design
          </h2>
          <div className="sw-grid-2" style={{ gap: 32 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e8323c", marginBottom: 12 }}>EscrowContract</h3>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Multi-milestone state machine (pending → submitted → approved / disputed)",
                  "Time-locked auto-release if client is unresponsive",
                  "Partial refund logic for partially accepted work",
                  "Calls WorkToken contract to mint rep on completion",
                  "3rd-party arbitrator dispute resolution",
                ].map(item => (
                  <li key={item} style={{ display: "flex", gap: 10, fontSize: 13, color: "#666" }}>
                    <span style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e8323c", marginBottom: 12 }}>WorkToken (SEP-41)</h3>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Custom fungible token following Stellar SEP-41 standard",
                  "Minted only by EscrowContract via inter-contract call",
                  "Non-transferable reputation score (soulbound)",
                  "Queryable on-chain for job eligibility checks",
                  "Satisfies Level 4 custom token + inter-contract requirements",
                ].map(item => (
                  <li key={item} style={{ display: "flex", gap: 10, fontSize: 13, color: "#666" }}>
                    <span style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{
          background: "linear-gradient(135deg, #1a0a0b, #0f0f0f)",
          border: "1px solid rgba(232,50,60,0.2)",
          borderRadius: 20, padding: "48px",
          textAlign: "center",
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1px", marginBottom: 12 }}>
            Start building with us
          </h2>
          <p style={{ fontSize: 15, color: "#555", marginBottom: 28 }}>
            Connect your Freighter wallet and explore the platform.
          </p>
          <Link href="/jobs" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 24px", borderRadius: 10,
            background: "#e8323c",
            fontSize: 14, fontWeight: 700, color: "#fff",
            textDecoration: "none",
          }}>
            Browse Jobs <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
