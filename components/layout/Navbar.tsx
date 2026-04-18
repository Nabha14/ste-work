"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Zap } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { formatAddress } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Jobs",      href: "/jobs" },
  { label: "My Work",   href: "/my-work" },
  { label: "Escrow",    href: "/escrow" },
  { label: "About",     href: "/about" },
];

export default function Navbar() {
  const path = usePathname();
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const isLanding = path === "/";

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(10,10,10,0.92)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1a1a1a",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        padding: "0 24px",
        height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "#e8323c",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Zap size={14} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>
            Stellar<span style={{ color: "#e8323c" }}>Work</span>
          </span>
        </Link>

        {/* Nav links — hide on landing */}
        {!isLanding && (
          <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {NAV.map(({ label, href }) => (
              <Link key={href} href={href} style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                color: path === href ? "#fff" : "#666",
                background: path === href ? "#1a1a1a" : "transparent",
                transition: "all 0.15s",
              }}>
                {label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isLanding && (
            <>
              <button style={iconBtn}><Search size={15} color="#666" /></button>
              <button style={{ ...iconBtn, position: "relative" }}>
                <Bell size={15} color="#666" />
                <span style={{
                  position: "absolute", top: 8, right: 8,
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#e8323c",
                }} />
              </button>
            </>
          )}

          {isConnected && address ? (
            <button onClick={disconnect} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 8,
              border: "1px solid #2a2a2a",
              background: "#141414",
              fontSize: 12, fontFamily: "monospace",
              color: "#ccc", cursor: "pointer",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
              {formatAddress(address)}
            </button>
          ) : (
            <button onClick={connect} disabled={isConnecting} style={{
              padding: "7px 16px", borderRadius: 8,
              background: "#e8323c",
              border: "none",
              fontSize: 13, fontWeight: 600,
              color: "#fff", cursor: "pointer",
              opacity: isConnecting ? 0.6 : 1,
            }}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  border: "none", background: "transparent",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};
