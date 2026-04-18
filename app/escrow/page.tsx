"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/wallet-context";
import {
  listJobs, buildSubmitMilestoneTx, buildApproveMilestoneTx,
  submitSignedTx, type Job,
} from "@/lib/contracts/client";
import { formatAddress } from "@/lib/utils";
import { Lock, CheckCircle2, Clock, AlertTriangle, Loader2, AlertCircle } from "lucide-react";

const STROOPS = 10_000_000n;
function xlm(s: bigint) { return (Number(s) / Number(STROOPS)).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  Locked:    { color: "#555",    bg: "rgba(255,255,255,0.04)", border: "#222" },
  Submitted: { color: "#f97316", bg: "rgba(249,115,22,0.1)",   border: "rgba(249,115,22,0.2)" },
  Approved:  { color: "#22c55e", bg: "rgba(34,197,94,0.1)",    border: "rgba(34,197,94,0.2)" },
  Disputed:  { color: "#e8323c", bg: "rgba(232,50,60,0.1)",    border: "rgba(232,50,60,0.2)" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Locked:    <Lock size={13} color="#555" />,
  Submitted: <Clock size={13} color="#f97316" />,
  Approved:  <CheckCircle2 size={13} color="#22c55e" />,
  Disputed:  <AlertTriangle size={13} color="#e8323c" />,
};

export default function Escrow() {
  const { address, isConnected, connect, signTransaction } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txPending, setTxPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await listJobs(0n, 50n);
      // Only show jobs where user is client or freelancer
      const mine = address
        ? all.filter(j => j.client === address || j.freelancer === address)
        : all;
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
    if (!deliverable) return;
    setTxPending(`submit-${job.id}-${milestoneIndex}`);
    try {
      const xdr = await buildSubmitMilestoneTx(address, job.id, milestoneIndex, deliverable);
      const signed = await signTransaction(xdr);
      await submitSignedTx(signed);
      await load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setTxPending(null);
    }
  };

  const handleApprove = async (job: Job, milestoneIndex: number) => {
    if (!address) return;
    if (!confirm("Approve this milestone and release payment?")) return;
    setTxPending(`approve-${job.id}-${milestoneIndex}`);
    try {
      const xdr = await buildApproveMilestoneTx(address, job.id, milestoneIndex);
      const signed = await signTransaction(xdr);
      await submitSignedTx(signed);
      await load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setTxPending(null);
    }
  };

  const totalLocked = jobs.reduce((s, j) =>
    s + j.milestones.filter(m => m.status === "Locked" || m.status === "Submitted").reduce((a, m) => a + m.amount, 0n), 0n);
  const totalReleased = jobs.reduce((s, j) =>
    s + j.milestones.filter(m => m.status === "Approved").reduce((a, m) => a + m.amount, 0n), 0n);
  const totalDisputed = jobs.reduce((s, j) =>
    s + j.milestones.filter(m => m.status === "Disputed").reduce((a, m) => a + m.amount, 0n), 0n);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>Escrow Contracts</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            {loading ? "Reading from Stellar testnet..." : `${jobs.length} contracts · live on-chain`}
          </p>
        </div>

        {!isConnected && (
          <div style={{
            background: "rgba(232,50,60,0.08)", border: "1px solid rgba(232,50,60,0.2)",
            borderRadius: 12, padding: "16px 20px", marginBottom: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, color: "#888" }}>Connect wallet to see your escrow contracts</span>
            <button onClick={connect} style={redBtn}>Connect Wallet</button>
          </div>
        )}

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

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Locked",    value: `${xlm(totalLocked)} XLM`,    color: "#e8323c", icon: <Lock size={16} color="#e8323c" /> },
            { label: "Total Released",  value: `${xlm(totalReleased)} XLM`,  color: "#22c55e", icon: <CheckCircle2 size={16} color="#22c55e" /> },
            { label: "In Dispute",      value: `${xlm(totalDisputed)} XLM`,  color: totalDisputed > 0n ? "#e8323c" : "#555", icon: <AlertTriangle size={16} color={totalDisputed > 0n ? "#e8323c" : "#555"} /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: "#111", borderRadius: 14, border: "1px solid #1f1f1f", padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                {icon}
                <span style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color }}>{loading ? "—" : value}</div>
            </div>
          ))}
        </div>

        {/* Jobs */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 size={24} color="#333" />
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 14, color: "#555" }}>
              {isConnected ? "No escrow contracts found for your wallet." : "Connect wallet to view your contracts."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {jobs.map(job => {
              const isClient = job.client === address;
              const released = job.milestones.filter(m => m.status === "Approved").reduce((s, m) => s + m.amount, 0n);
              const pct = job.total > 0n ? Number(released * 100n / job.total) : 0;

              return (
                <div key={String(job.id)} style={{ background: "#111", borderRadius: 16, border: "1px solid #1f1f1f", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#555" }}>JOB-{String(job.id).padStart(3, "0")}</span>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{job.title}</h3>
                      </div>
                      <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>
                        Client: {formatAddress(job.client)} ·
                        Freelancer: {job.freelancer ? formatAddress(job.freelancer) : "Unassigned"} ·
                        {isClient ? " You're the client" : " You're the freelancer"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>{xlm(job.total)} XLM</div>
                      <div style={{ fontSize: 11, color: "#555" }}>Total Contract</div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#444", marginBottom: 6 }}>
                      <span>Released: {xlm(released)} XLM</span>
                      <span>Locked: {xlm(job.total - released)} XLM</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "#1a1a1a", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        background: "linear-gradient(to right, #22c55e, #e8323c)",
                        width: `${pct}%`, transition: "width 0.5s",
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>{pct}% released</div>
                  </div>

                  {/* Milestones */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {job.milestones.map((m, i) => {
                      const s = STATUS_STYLE[m.status] ?? STATUS_STYLE.Locked;
                      const pendingKey = `${isClient ? "approve" : "submit"}-${job.id}-${i}`;
                      const isPending = txPending === pendingKey;

                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: "#0d0d0d", borderRadius: 10,
                          border: "1px solid #1a1a1a", padding: "12px 16px",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11, color: "#333", fontWeight: 700, width: 24 }}>M{i + 1}</span>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</span>
                              {m.deliverable && (
                                <div style={{ fontSize: 10, color: "#555", marginTop: 2, fontFamily: "monospace" }}>
                                  {m.deliverable.length > 40 ? m.deliverable.slice(0, 40) + "…" : m.deliverable}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{xlm(m.amount)} XLM</span>
                            <span style={{
                              display: "flex", alignItems: "center", gap: 5,
                              fontSize: 11, fontWeight: 600,
                              padding: "3px 10px", borderRadius: 100,
                              color: s.color, background: s.bg, border: `1px solid ${s.border}`,
                            }}>
                              {STATUS_ICON[m.status]}
                              {m.status}
                            </span>

                            {/* Freelancer: submit */}
                            {!isClient && m.status === "Locked" && job.freelancer === address && (
                              <button
                                onClick={() => handleSubmit(job, i)}
                                disabled={!!txPending}
                                style={{ ...actionBtn, background: "#f97316" }}
                              >
                                {isPending ? <Loader2 size={11} /> : null}
                                Submit
                              </button>
                            )}

                            {/* Client: approve */}
                            {isClient && m.status === "Submitted" && (
                              <button
                                onClick={() => handleApprove(job, i)}
                                disabled={!!txPending}
                                style={{ ...actionBtn, background: "#22c55e" }}
                              >
                                {isPending ? <Loader2 size={11} /> : null}
                                Approve
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const redBtn: React.CSSProperties = { padding: "8px 16px", borderRadius: 9, background: "#e8323c", border: "none", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" };
const actionBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 7, border: "none", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" };
