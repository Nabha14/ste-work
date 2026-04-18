"use client";
// Dashboard — live on-chain stats, my jobs, chain activity feed, escrow health
// All data fetched from Stellar testnet — zero hardcoded values

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/wallet-context";
import { formatAddress } from "@/lib/utils";
import {
  listJobs, getWorkTokenBalance, getWorkTokenSupply,
  type Job,
} from "@/lib/contracts/client";
import { Sparkline } from "@/components/ui/Sparkline";
import {
  Briefcase, Clock, CheckCircle2, Shield,
  ArrowUpRight, ArrowDownLeft, Plus, ChevronRight,
  Loader2, Zap, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import PostJobModal from "@/components/dashboard/PostJobModal";

const STROOPS = 10_000_000n;

function xlm(stroops: bigint) {
  return (Number(stroops) / Number(STROOPS)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const { address, isConnected, connect } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workBalance, setWorkBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPost, setShowPost] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allJobs, wb] = await Promise.all([
        listJobs(0n, 50n),
        address ? getWorkTokenBalance(address) : Promise.resolve(0n),
      ]);
      setJobs(allJobs);
      setWorkBalance(wb);
    } catch (e: any) {
      setError(e.message ?? "Failed to load chain data");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { load(); }, [load]);

  // Derive stats from real data
  const myJobs = jobs.filter(j => j.client === address || j.freelancer === address);
  const activeJobs = myJobs.filter(j => !j.is_open && j.milestones.some(m => m.status === "Locked" || m.status === "Submitted"));
  const completedJobs = myJobs.filter(j => j.milestones.every(m => m.status === "Approved"));
  const disputedJobs = myJobs.filter(j => j.milestones.some(m => m.status === "Disputed"));

  const totalEarned = myJobs
    .filter(j => j.freelancer === address)
    .reduce((sum, j) => sum + j.milestones
      .filter(m => m.status === "Approved")
      .reduce((s, m) => s + m.amount, 0n), 0n);

  const totalEscrowed = myJobs
    .filter(j => j.client === address)
    .reduce((sum, j) => sum + j.milestones
      .filter(m => m.status === "Locked" || m.status === "Submitted")
      .reduce((s, m) => s + m.amount, 0n), 0n);

  const STATS = [
    { label: "Total Earned",  value: `${xlm(totalEarned)} XLM`,  sub: "As freelancer",         color: "#22c55e" },
    { label: "Active Jobs",   value: String(activeJobs.length),   sub: "In progress",           color: "#f97316" },
    { label: "Escrowed",      value: `${xlm(totalEscrowed)} XLM`, sub: "Locked in contracts",   color: "#e8323c", accent: true },
    { label: "WORK Tokens",   value: String(workBalance),         sub: "Reputation score",      color: "#a78bfa" },
  ];

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <div className="sw-page" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>
              {isConnected ? `Welcome back${address ? ", " + formatAddress(address, 4) : ""}` : "Your Dashboard"}
            </h1>
            {isConnected && address ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#555" }}>{formatAddress(address, 8)}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#22c55e" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
                  Stellar Testnet
                </span>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Connect your Freighter wallet to view your jobs, earnings and escrow contracts</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {!isConnected && <button onClick={connect} style={redBtn}>Connect Wallet</button>}
            <button onClick={() => isConnected ? setShowPost(true) : connect()} style={secondaryBtn}>
              <Plus size={14} /> Post a Job
            </button>
          </div>
        </div>

        {/* Not connected banner */}
        {!isConnected && (
          <div style={{
            background: "linear-gradient(135deg, #1a0a0b, #111)",
            border: "1px solid rgba(232,50,60,0.2)",
            borderRadius: 16, padding: "28px 32px",
            marginBottom: 24,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
          }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Get started with StellarWork</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  "① Connect your Freighter wallet (Stellar Testnet)",
                  "② Post a job and lock XLM into escrow",
                  "③ Approve milestones to release payment on-chain",
                ].map(step => (
                  <p key={step} style={{ fontSize: 13, color: "#666" }}>{step}</p>
                ))}
              </div>
            </div>
            <button onClick={connect} style={{ ...redBtn, whiteSpace: "nowrap", padding: "10px 24px", fontSize: 14 }}>
              Connect Wallet
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(232,50,60,0.08)", border: "1px solid rgba(232,50,60,0.2)",
            borderRadius: 12, padding: "14px 18px", marginBottom: 20,
          }}>
            <AlertCircle size={16} color="#e8323c" />
            <span style={{ fontSize: 13, color: "#e8323c" }}>{error}</span>
            <button onClick={load} style={{ ...redBtn, marginLeft: "auto", fontSize: 12, padding: "5px 12px" }}>Retry</button>
          </div>
        )}

        {/* Stats */}
        <div className="sw-grid-4 sw-stats-grid" style={{ marginBottom: 20 }}>
          {STATS.map(({ label, value, sub, color, accent }) => (
            <div key={label} style={{
              background: "#111", borderRadius: 14,
              border: `1px solid ${accent ? "rgba(232,50,60,0.25)" : "#1f1f1f"}`,
              padding: "20px 22px",
              position: "relative",
            }}>
              {loading && (
                <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: "rgba(10,10,10,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 size={16} color="#333" />
                </div>
              )}
              <div style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="sw-dashboard-main" style={{ gap: 12 }}>

          {/* My Jobs */}
          <div style={{ ...card, gridColumn: "1 / 3" }}>
            <div style={cardHeader}>
              <div>
                <span style={cardTitle}>My Jobs</span>
                <div style={{ fontSize: 11, color: "#444", marginTop: 3 }}>Jobs where you are the client or freelancer</div>
              </div>
              <Link href="/jobs" style={viewAll}>View All <ChevronRight size={13} /></Link>
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                <Loader2 size={20} color="#333" />
              </div>
            ) : myJobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <Briefcase size={32} color="#222" style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 6 }}>
                  {isConnected ? "No jobs yet" : "Wallet not connected"}
                </p>
                <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
                  {isConnected
                    ? "Post a job as a client or browse open jobs to work as a freelancer"
                    : "Connect your Freighter wallet to see your jobs"}
                </p>
                {isConnected && (
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button onClick={() => setShowPost(true)} style={{ ...redBtn, fontSize: 12, padding: "6px 14px" }}>Post a Job</button>
                    <Link href="/jobs" style={{ ...secondaryBtn, textDecoration: "none", fontSize: 12, padding: "6px 14px" }}>Browse Jobs</Link>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myJobs.slice(0, 5).map(job => {
                  const approved = job.milestones.filter(m => m.status === "Approved").length;
                  const total = job.milestones.length;
                  const isClient = job.client === address;
                  const statusLabel = job.is_open ? "Open" : approved === total ? "Completed" : "In Progress";
                  const statusColor = job.is_open ? "#22c55e" : approved === total ? "#a78bfa" : "#f97316";

                  return (
                    <div key={String(job.id)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "#0d0d0d", borderRadius: 10,
                      border: "1px solid #1a1a1a", padding: "14px 16px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(232,50,60,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Briefcase size={15} color="#e8323c" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{job.title}</div>
                          <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
                            {isClient ? "You're the client" : "You're the freelancer"} · M{approved}/{total}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{xlm(job.total)} XLM</span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: statusColor,
                          background: `${statusColor}18`, padding: "3px 10px",
                          borderRadius: 100, border: `1px solid ${statusColor}30`,
                        }}>{statusLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chain Activity */}
          <div style={{ ...card, gridRow: "1 / 3" }}>
            <div style={cardHeader}>
              <div>
                <span style={cardTitle}>Chain Activity</span>
                <div style={{ fontSize: 11, color: "#444", marginTop: 3 }}>All jobs on Stellar testnet</div>
              </div>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#22c55e" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
                Live
              </span>
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                <Loader2 size={20} color="#333" />
              </div>
            ) : jobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <p style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>No on-chain activity yet</p>
                <p style={{ fontSize: 11, color: "#333" }}>Be the first to post a job</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {jobs.slice(0, 8).map((job, i) => {
                  const isIn = job.freelancer === address;
                  const sparkData = job.milestones.map((_, idx) => idx + 1);
                  return (
                    <div key={String(job.id)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "#0d0d0d", border: "1px solid #1a1a1a",
                      borderRadius: 10, padding: "10px 12px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: job.is_open ? "rgba(34,197,94,0.1)" : "rgba(249,115,22,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {job.is_open
                            ? <ArrowDownLeft size={12} color="#22c55e" />
                            : <ArrowUpRight size={12} color="#f97316" />
                          }
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                            {job.title.length > 22 ? job.title.slice(0, 22) + "…" : job.title}
                          </div>
                          <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                            {formatAddress(job.client)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <div style={{ width: 56, height: 20 }}>
                          <Sparkline data={sparkData} color={job.is_open ? "#22c55e" : "#f97316"} height={20} />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                          {xlm(job.total)} XLM
                        </div>
                        <div style={{ fontSize: 10, color: job.is_open ? "#22c55e" : "#f97316" }}>
                          ● {job.is_open ? "Open" : "Active"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Escrow Health */}
          <div style={{ ...card, gridColumn: "1 / 3" }}>
            <div style={cardHeader}>
              <div>
                <span style={cardTitle}>Escrow Health</span>
                <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
                  {loading ? "Checking contracts..." : `${jobs.length} contract${jobs.length !== 1 ? "s" : ""} tracked on-chain`}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, color: "#22c55e",
                background: "rgba(34,197,94,0.1)", padding: "4px 10px",
                borderRadius: 100, border: "1px solid rgba(34,197,94,0.2)",
              }}>
                {disputedJobs.length === 0 ? "No Disputes" : `${disputedJobs.length} Disputed`}
              </span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ position: "relative", height: 6, borderRadius: 3, background: "#1a1a1a", overflow: "visible", marginBottom: 6 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 3, background: "linear-gradient(to right, #22c55e, #f97316, #e8323c)" }} />
                <div style={{
                  position: "absolute", top: "50%", left: `${disputedJobs.length === 0 ? 15 : 60}%`,
                  transform: "translate(-50%, -50%)",
                  width: 14, height: 14, borderRadius: "50%",
                  background: disputedJobs.length === 0 ? "#22c55e" : "#e8323c",
                  border: "2px solid #0a0a0a",
                  boxShadow: `0 0 8px ${disputedJobs.length === 0 ? "rgba(34,197,94,0.6)" : "rgba(232,50,60,0.6)"}`,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#444" }}>
                <span>Low Risk</span><span>High Risk</span>
              </div>
            </div>

            <div className="sw-grid-3" style={{ gap: 10 }}>
              {[
                { icon: <CheckCircle2 size={16} color="#22c55e" />, label: "Completed", value: completedJobs.length, color: "#22c55e" },
                { icon: <Clock size={16} color="#f97316" />,        label: "Active",    value: activeJobs.length,    color: "#f97316" },
                { icon: <Shield size={16} color="#555" />,          label: "Disputed",  value: disputedJobs.length,  color: disputedJobs.length > 0 ? "#e8323c" : "#555" },
              ].map(({ icon, label, value, color }) => (
                <div key={label} style={{
                  background: "#0d0d0d", border: "1px solid #1a1a1a",
                  borderRadius: 10, padding: "14px", textAlign: "center",
                }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{loading ? "—" : value}</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPost && (
        <PostJobModal
          onClose={() => setShowPost(false)}
          onSuccess={() => { setShowPost(false); load(); }}
        />
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: "#111", borderRadius: 16, border: "1px solid #1f1f1f", padding: "22px 24px" };
const cardHeader: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 };
const cardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "#fff" };
const viewAll: React.CSSProperties = { display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: "#555", textDecoration: "none" };
const redBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, background: "#e8323c", border: "none", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, background: "#161616", border: "1px solid #2a2a2a", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" };
