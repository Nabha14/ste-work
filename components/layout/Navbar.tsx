// Navbar — sticky header with wallet connect, active route highlighting
// Hides nav links on landing page, shows full nav on app pages
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Zap, Menu, X } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { formatAddress } from "@/lib/utils";
import { useState } from "react";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Jobs",      href: "/jobs" },
  { label: "My Work",   href: "/my-work" },
  { label: "Escrow",    href: "/escrow" },
  { label: "Profile",   href: "/profile" },
  { label: "About",     href: "/about" },
];

export default function Navbar() {
  const path = usePathname();
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const isLanding = path === "/";
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
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

        {/* Desktop nav links */}
        {!isLanding && (
          <nav style={{ display: "flex", alignItems: "center", gap: 2 }} className="sw-hide-mobile">
            {NAV.map(({ label, href }) => (
              <Link key={href} href={href} style={{
                padding: "6px 12px", borderRadius: 8,
                fontSize: 13, fontWeight: 500, textDecoration: "none",
                color: path === href ? "#fff" : "#666",
                background: path === href ? "#1a1a1a" : "transparent",
              }}>
                {label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isLanding && (
            <button style={iconBtn} className="sw-hide-mobile">
              <Search size={15} color="#666" />
            </button>
          )}

          {isConnected && address ? (
            <button onClick={disconnect} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 8,
              border: "1px solid #2a2a2a", background: "#141414",
              fontSize: 12, fontFamily: "monospace", color: "#ccc", cursor: "pointer",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
              <span className="sw-hide-mobile">{formatAddress(address)}</span>
              <span style={{ display: "none" }} className="sw-show-mobile">Connected</span>
            </button>
          ) : (
            <button onClick={connect} disabled={isConnecting} style={{
              padding: "7px 16px", borderRadius: 8,
              background: "#e8323c", border: "none",
              fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer",
              opacity: isConnecting ? 0.6 : 1,
            }}>
              {isConnecting ? "..." : "Connect"}
            </button>
          )}

          {/* Mobile hamburger */}
          {!isLanding && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ ...iconBtn, display: "none" }}
              className="sw-show-mobile"
            >
              {mobileOpen ? <X size={18} color="#fff" /> : <Menu size={18} color="#fff" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && !isLanding && (
        <div style={{
          background: "#0f0f0f", borderBottom: "1px solid #1a1a1a",
          padding: "12px 24px 16px",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {NAV.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: "10px 14px", borderRadius: 9,
                fontSize: 14, fontWeight: 500, textDecoration: "none",
                color: path === href ? "#fff" : "#666",
                background: path === href ? "#1a1a1a" : "transparent",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  border: "none", background: "transparent",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};
