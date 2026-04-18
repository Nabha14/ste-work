"use client";
// My Work page — reads jobs where connected wallet is the freelancer
// All data live from EscrowContract on Stellar testnet

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/wallet-context";
import { listJobs, buildSubmitMilestoneTx, submitSignedTx, type Job } from "@/lib/contracts/client";
import { formatAddress } from "@/lib/utils";
import { Briefcase, Clock, CheckCircle2, AlertCircle, ChevronRight, Loader2, Plus } from "lucide-react";
import Link from "next/link";

const STROOPS = 10_000_000n;
function xlm(s: bigint) {
  return (Number(s) / Number(STROOPS)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const STATUS_COLOR: Record<string, string> = {
  Locked:    "#555",
  Submitted: "#f97316",
  Approved:  "#22c55e",
  Disputed:  "#e8323c",
};

export default function MyWork() {
  const { address, isConnected, connect, signTransaction } = useWallet();
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [txPending, setTxPending] = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<bigint | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await listJobs(0n, 50n);
      // Only jobs where I am the freelancer
      const mine = address
        ? all.filter(j => j.freelancer === address)
        : [];
      setJobs(mine);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (job: Job, milestoneIndex: number) => {
    if (!address) return;
    const deliverable = prompt("Enter deliverable (IPFS hash or description):");
    if (!deliverable?.trim()) return;
    const key = `${job.id}-${milestoneIndex}`;
    setTxPending(key);
    try {
      const xdr    = await buildSubmitMilestoneTx(address, job.id, milestoneIndex, deliverable.trim());
      const signed = await signTransaction(xdr);
      await submitSignedTx(signed);
      await load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setTxPending(null);
    }
  };

  // Derived stats
  const activeJobs    = jobs.filter(j => j.milestones.some(m => m.status === "Locked" || m.status === "Submitted"));
  const completedJobs = jobs.filter(j => j.milestones.every(m => m.status === "Approved"));
  const inReview      = jobs.filter(j => j.milestones.some(m => m.status === "Submitted"));
  const totalEarned   = jobs.reduce((s, j) =>
    s + j.milestones.filter(m => m.status === "Approved").reduce((a, m) => a + m.amount, 0n), 0n);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>My Work</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
              {loading ? "Reading from Stellar testnet..." : `${jobs.length} jobs assigned to your wallet`}
            </p>
          </div>
          <Link href="/jobs" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 18px", borderRadius: 9,
            background: "#e8323c", border: "none",
            fontSize: 13, fontWeight: 700, color: "#fff",
            textDecoration: "none",
          }}>
            <Plus size={14} /> Find Jobs
          </Link>
        </div>

        {/* Not connected */}
        {!isConnected && (
          <div style={{
            background: "rgba(232,50,60,0.08)", border: "1px solid rgba(232,50,60,0.2)",
            borderRadius: 12, padding: "20px 24px", marginBottom: 24,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 14, color: "#888" }}>Connect your wallet to see jobs assigned to you</span>
            <button onClick={connect} style={redBtn}>Connect Wallet</button>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Active Jobs",   value: loading ? "—" : String(activeJobs.length),    icon: <Briefcase size={16} color="#f97316" />,    color: "#f97316" },
            { label: "Total Earned",  value: loading ? "—" : `${xlm(totalEarned)} XLM`,    icon: <CheckCircle2 size={16} color="#22c55e" />,  color: "#22c55e" },
            { label: "In Review",     value: loading ? "—" : String(inReview.length),       icon: <Clock size={16} color="#a78bfa" />,         color: "#a78bfa" },
            { label: "Completed",     value: loading ? "—" : String(completedJobs.length),  icon: <CheckCircle2 size={16} color="#555" />,     color: "#555" },
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

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 size={24} color="#333" />
          </div>
        )}

        {/* Empty */}
        {!loading && !error && jobs.length === 0 && isConnected && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Briefcase size={40} color="#222" style={{ margin: "0 auto 16px" }} />
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No jobs assigned yet</p>
            <p style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>Browse open jobs and accept one to get started</p>
            <Link href="/jobs" style={{ ...redBtn, textDecoration: "none" }}>Browse Jobs</Link>
          </div>
        )}

        {/* Job list */}
        {!loading && jobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobs.map(job => {
              const approved  = job.milestones.filter(m => m.status === "Approved").length;
              const total     = job.milestones.length;
              const earned    = job.milestones.filter(m => m.status === "Approved").reduce((s, m) => s + m.amount, 0n);
              const remaining = job.milestones.filter(m => m.status !== "Approved").reduce((s, m) => s + m.amount, 0n);
              const pct       = total > 0 ? Math.round((approved / total) * 100) : 0;
              const isOpen    = expanded === job.id;

              const statusLabel = approved === total ? "Completed"
                : job.milestones.some(m => m.status === "Submitted") ? "In Review"
                : "In Progress";
              const statusColor = approved === total ? "#22c55e"
                : job.milestones.some(m => m.status === "Submitted") ? "#a78bfa"
                : "#f97316";

              return (
                <div key={String(job.id)} style={{
                  background: "#111", borderRadius: 16,
                  border: "1px solid #1f1f1f",
                  overflow: "hidden",
                }}>
                  {/* Job header row */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : job.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "20px 24px", cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(232,50,60,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Briefcase size={18} color="#e8323c" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700 }}>{job.title}</h3>
                        <div style={{ fontSize: 12, color: "#444", marginTop: 3 }}>
                          Client: {formatAddress(job.client)} · M{approved}/{total} approved
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#444" }}>Earned</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#22c55e" }}>{xlm(earned)} XLM</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#444" }}>Remaining</div>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>{xlm(remaining)} XLM</div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: statusColor,
                        background: `${statusColor}18`, padding: "5px 12px",
                        borderRadius: 100, border: `1px solid ${statusColor}30`,
                      }}>{statusLabel}</span>
                      <ChevronRight size={16} color="#444" style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ padding: "0 24px 16px" }}>
                    <div style={{ height: 4, borderRadius: 2, background: "#1a1a1a", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        background: "linear-gradient(to right, #22c55e, #e8323c)",
                        width: `${pct}%`, transition: "width 0.5s",
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>{pct}% complete</div>
                  </div>

                  {/* Expanded milestones */}
                  {isOpen && (
                    <div style={{ padding: "0 24px 20px", borderTop: "1px solid #1a1a1a", paddingTop: 16 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {job.milestones.map((m, i) => {
                          const isPending = txPending === `${job.id}-${i}`;
                          const sc = STATUS_COLOR[m.status] ?? "#555";
                          return (
                            <div key={i} style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              background: "#0d0d0d", borderRadius: 10,
                              border: "1px solid #1a1a1a", padding: "12px 16px",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 11, color: "#333", fontWeight: 700, width: 24 }}>M{i + 1}</span>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                                  {m.deliverable && (
                                    <div style={{ fontSize: 10, color: "#555", marginTop: 2, fontFamily: "monospace" }}>
                                      {m.deliverable.length > 50 ? m.deliverable.slice(0, 50) + "…" : m.deliverable}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{xlm(m.amount)} XLM</span>
                                <span style={{
                                  fontSize: 11, fontWeight: 600, color: sc,
                                  background: `${sc}18`, padding: "3px 10px",
                                  borderRadius: 100, border: `1px solid ${sc}30`,
                                }}>{m.status}</span>
                                {m.status === "Locked" && (
                                  <button
                                    onClick={() => handleSubmit(job, i)}
                                    disabled={!!txPending}
                                    style={{
                                      display: "inline-flex", alignItems: "center", gap: 4,
                                      padding: "5px 12px", borderRadius: 7,
                                      background: "#f97316", border: "none",
                                      fontSize: 11, fontWeight: 700, color: "#fff",
                                      cursor: txPending ? "not-allowed" : "pointer",
                                      opacity: txPending ? 0.6 : 1,
                                    }}
                                  >
                                    {isPending && <Loader2 size={11} />}
                                    Submit
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const redBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", borderRadius: 9,
  background: "#e8323c", border: "none",
  fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
};
