"use client";
// Profile page — wallet reputation, WORK token balance, job history
// Shows on-chain proof of work: completed milestones, earned XLM, WORK score

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/wallet-context";
import {
  listJobs,
  getWorkTokenBalance,
  getWorkTokenSupply,
  type Job,
} from "@/lib/contracts/client";
import { formatAddress } from "@/lib/utils";
import {
  Star, Briefcase, CheckCircle2, Clock,
  Coins, Copy, ExternalLink, Loader2, AlertCircle,
  Shield, TrendingUp, Share2,
} from "lucide-react";
import Link from "next/link";

const STROOPS = 10_000_000n;
function xlm(s: bigint) { return (Number(s) / Number(STROOPS)).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

function ReputationBadge({ score }: { score: bigint }) {
  const n = Number(score);
  if (n === 0) return <span style={{ fontSize: 12, color: "#555" }}>No reputation yet</span>;
  const tier = n >= 100 ? { label: "Expert", color: "#a78bfa" }
    : n >= 50  ? { label: "Pro",    color: "#22c55e" }
    : n >= 20  ? { label: "Rising", color: "#f97316" }
    :            { label: "Newcomer", color: "#e8323c" };
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, color: tier.color,
      background: `${tier.color}18`, padding: "4px 12px",
      borderRadius: 100, border: `1px solid ${tier.color}30`,
    }}>
      {tier.label}
    </span>
  );
}

export default function Profile() {
  const { address, isConnected, connect } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workBalance, setWorkBalance] = useState<bigint>(0n);
  const [workSupply, setWorkSupply] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!address) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const [allJobs, wb, supply] = await Promise.all([
        listJobs(0n, 100n),
        getWorkTokenBalance(address),
        getWorkTokenSupply(),
      ]);
      setJobs(allJobs);
      setWorkBalance(wb);
      setWorkSupply(supply);
    } catch (e: any) { setError(e.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }, [address]);

  useEffect(() => { load(); }, [load]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Derived stats
  const myJobsAsClient     = jobs.filter(j => j.client === address);
  const myJobsAsFreelancer = jobs.filter(j => j.freelancer === address);
  const completedAsFreelancer = myJobsAsFreelancer.filter(j => j.milestones.every(m => m.status === "Approved"));
  const activeAsFreelancer    = myJobsAsFreelancer.filter(j => j.milestones.some(m => m.status === "Locked" || m.status === "Submitted"));
  const totalEarned = myJobsAsFreelancer.reduce((s, j) =>
    s + j.milestones.filter(m => m.status === "Approved").reduce((a, m) => a + m.amount, 0n), 0n);
  const totalSpent = myJobsAsClient.reduce((s, j) =>
    s + j.milestones.filter(m => m.status === "Approved").reduce((a, m) => a + m.amount, 0n), 0n);
  const totalMilestonesCompleted = myJobsAsFreelancer.reduce((s, j) =>
    s + j.milestones.filter(m => m.status === "Approved").length, 0);

  // Reputation percentile
  const pctOfSupply = workSupply > 0n ? Math.round(Number(workBalance) / Number(workSupply) * 100) : 0;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <div className="sw-page" style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>

        {/* Not connected */}
        {!isConnected ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: "rgba(232,50,60,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <Shield size={28} color="#e8323c" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Your On-Chain Profile</h1>
            <p style={{ fontSize: 14, color: "#555", marginBottom: 28, maxWidth: 400, margin: "0 auto 28px" }}>
              Connect your Freighter wallet to view your reputation, WORK token balance, and job history.
            </p>
            <button onClick={connect} style={redBtn}>Connect Wallet</button>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div style={{
              background: "#111", borderRadius: 20,
              border: "1px solid #1f1f1f",
              padding: "32px",
              marginBottom: 24,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: "linear-gradient(135deg, #e8323c, #a78bfa)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, fontWeight: 800, color: "#fff", flexShrink: 0,
                  }}>
                    {address ? address.slice(0, 2).toUpperCase() : "?"}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <h1 style={{ fontSize: 20, fontWeight: 800 }}>{formatAddress(address!, 8)}</h1>
                      <ReputationBadge score={workBalance} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#444", fontFamily: "monospace" }}>
                        {address}
                      </span>
                      <button onClick={copyAddress} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: 0 }}>
                        {copied ? <CheckCircle2 size={13} color="#22c55e" /> : <Copy size={13} />}
                      </button>
                      <a
                        href={`https://stellar.expert/explorer/testnet/account/${address}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: "#555", display: "flex" }}
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                    <Link href={`/profile/${address}`} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      marginTop: 8, fontSize: 11, color: "#a78bfa",
                      textDecoration: "none",
                      background: "rgba(167,139,250,0.08)",
                      border: "1px solid rgba(167,139,250,0.2)",
                      borderRadius: 6, padding: "3px 8px",
                    }}>
                      <Share2 size={10} /> Share public profile
                    </Link>
                  </div>
                </div>

                {/* WORK token score */}
                <div style={{
                  background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)",
                  borderRadius: 14, padding: "16px 24px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                    WORK Score
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "#a78bfa", lineHeight: 1 }}>
                    {loading ? "—" : String(workBalance)}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                    {pctOfSupply}% of total supply
                  </div>
                </div>
              </div>
            </div>

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

            {/* Stats Grid */}
            <div className="sw-grid-3" style={{ gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total Earned",       value: loading ? "—" : `${xlm(totalEarned)} XLM`,          icon: <Coins size={16} color="#22c55e" />,       color: "#22c55e" },
                { label: "Milestones Done",    value: loading ? "—" : String(totalMilestonesCompleted),    icon: <CheckCircle2 size={16} color="#a78bfa" />, color: "#a78bfa" },
                { label: "Active Jobs",        value: loading ? "—" : String(activeAsFreelancer.length),   icon: <Clock size={16} color="#f97316" />,        color: "#f97316" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ background: "#111", borderRadius: 14, border: "1px solid #1f1f1f", padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    {icon}
                    <span style={{ fontSize: 11, color: "#444", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Two-column: Freelancer + Client */}
            <div className="sw-grid-2" style={{ gap: 16, marginBottom: 24 }}>
              {/* As Freelancer */}
              <div style={{ background: "#111", borderRadius: 16, border: "1px solid #1f1f1f", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <TrendingUp size={16} color="#22c55e" />
                  <h2 style={{ fontSize: 14, fontWeight: 700 }}>As Freelancer</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#555" }}>Jobs accepted</span>
                    <span style={{ fontWeight: 700 }}>{loading ? "—" : myJobsAsFreelancer.length}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#555" }}>Completed</span>
                    <span style={{ fontWeight: 700, color: "#22c55e" }}>{loading ? "—" : completedAsFreelancer.length}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#555" }}>In progress</span>
                    <span style={{ fontWeight: 700, color: "#f97316" }}>{loading ? "—" : activeAsFreelancer.length}</span>
                  </div>
                  <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#555" }}>Total earned</span>
                    <span style={{ fontWeight: 800, color: "#22c55e" }}>{loading ? "—" : `${xlm(totalEarned)} XLM`}</span>
                  </div>
                </div>
              </div>

              {/* As Client */}
              <div style={{ background: "#111", borderRadius: 16, border: "1px solid #1f1f1f", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Briefcase size={16} color="#e8323c" />
                  <h2 style={{ fontSize: 14, fontWeight: 700 }}>As Client</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#555" }}>Jobs posted</span>
                    <span style={{ fontWeight: 700 }}>{loading ? "—" : myJobsAsClient.length}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#555" }}>Completed</span>
                    <span style={{ fontWeight: 700, color: "#22c55e" }}>
                      {loading ? "—" : myJobsAsClient.filter(j => j.milestones.every(m => m.status === "Approved")).length}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#555" }}>Open</span>
                    <span style={{ fontWeight: 700 }}>{loading ? "—" : myJobsAsClient.filter(j => j.is_open).length}</span>
                  </div>
                  <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#555" }}>Total paid out</span>
                    <span style={{ fontWeight: 800, color: "#e8323c" }}>{loading ? "—" : `${xlm(totalSpent)} XLM`}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Job History */}
            {!loading && (myJobsAsFreelancer.length > 0 || myJobsAsClient.length > 0) && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
                  Job History
                </div>
                <div style={{ background: "#111", borderRadius: 14, border: "1px solid #1f1f1f", overflow: "hidden" }}>
                  {[...myJobsAsFreelancer, ...myJobsAsClient]
                    .filter((j, i, arr) => arr.findIndex(x => x.id === j.id) === i) // dedupe
                    .sort((a, b) => Number(b.created_at) - Number(a.created_at))
                    .map((job, idx, arr) => {
                      const isClient = job.client === address;
                      const approved = job.milestones.filter(m => m.status === "Approved").length;
                      const statusColor = approved === job.milestones.length ? "#22c55e"
                        : job.milestones.some(m => m.status === "Disputed") ? "#e8323c"
                        : job.is_open ? "#555" : "#f97316";
                      const statusLabel = approved === job.milestones.length ? "Completed"
                        : job.milestones.some(m => m.status === "Disputed") ? "Disputed"
                        : job.is_open ? "Open" : "Active";

                      return (
                        <div key={String(job.id)} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "14px 20px", flexWrap: "wrap", gap: 8,
                          borderBottom: idx < arr.length - 1 ? "1px solid #1a1a1a" : "none",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace", width: 52 }}>
                              #{String(job.id).padStart(3, "0")}
                            </span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{job.title}</div>
                              <div style={{ fontSize: 11, color: "#444" }}>
                                {isClient ? "You posted" : "You worked on"} · {approved}/{job.milestones.length} milestones
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{xlm(job.total)} XLM</span>
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
              </div>
            )}

            {/* Empty state */}
            {!loading && myJobsAsFreelancer.length === 0 && myJobsAsClient.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Star size={32} color="#222" style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No activity yet</p>
                <p style={{ fontSize: 13, color: "#555", marginBottom: 20 }}>Post a job or accept one to start building your reputation</p>
                <Link href="/jobs" style={{ ...redBtn, textDecoration: "none" }}>Browse Jobs</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const redBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "10px 20px", borderRadius: 9,
  background: "#e8323c", border: "none",
  fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
};
