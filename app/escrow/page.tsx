"use client";
// Escrow page — reads live contract state, submit/approve/dispute milestones on-chain
// Freelancer submits deliverable hash, client approves to release XLM payment
// Either party can raise a dispute; admin resolves via basis-point split

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/wallet-context";
import {
  listJobs,
  buildSubmitMilestoneTx,
  buildApproveMilestoneTx,
  buildDisputeMilestoneTx,
  buildClaimTimeoutTx,
  buildCancelJobTx,
  buildRefundMilestoneTx,
  submitSignedTx,
  type Job,
} from "@/lib/contracts/client";
import { formatAddress } from "@/lib/utils";
import {
  Lock, CheckCircle2, Clock, AlertTriangle,
  Loader2, AlertCircle, Scale, ExternalLink,
} from "lucide-react";
import ResolveDisputeModal from "@/components/ui/ResolveDisputeModal";

const STROOPS = 10_000_000n;
function xlm(s: bigint) { return (Number(s) / Number(STROOPS)).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  Locked:    { color: "#555",    bg: "rgba(255,255,255,0.04)", border: "#222" },
  Submitted: { color: "#f97316", bg: "rgba(249,115,22,0.1)",   border: "rgba(249,115,22,0.2)" },
  Approved:  { color: "#22c55e", bg: "rgba(34,197,94,0.1)",    border: "rgba(34,197,94,0.2)" },
  Disputed:  { color: "#e8323c", bg: "rgba(232,50,60,0.1)",    border: "rgba(232,50,60,0.2)" },
  Refunded:  { color: "#6b7280", bg: "rgba(107,114,128,0.1)",  border: "rgba(107,114,128,0.2)" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Locked:    <Lock size={13} color="#555" />,
  Submitted: <Clock size={13} color="#f97316" />,
  Approved:  <CheckCircle2 size={13} color="#22c55e" />,
  Disputed:  <AlertTriangle size={13} color="#e8323c" />,
  Refunded:  <AlertCircle size={13} color="#6b7280" />,
};

// ── Deliverable Preview ───────────────────────────────────────────────────────

function DeliverablePreview({ value }: { value: string }) {
  const isUrl = /^https?:\/\//i.test(value);
  const isIpfs = /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|baf[a-z0-9]{50,})/i.test(value);
  const ipfsUrl = isIpfs ? `https://ipfs.io/ipfs/${value}` : null;
  const href = isUrl ? value : ipfsUrl;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          marginTop: 4, fontSize: 11, color: "#e8323c",
          textDecoration: "none", fontFamily: "monospace",
          background: "rgba(232,50,60,0.08)",
          border: "1px solid rgba(232,50,60,0.2)",
          borderRadius: 6, padding: "3px 8px",
          maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}
      >
        <ExternalLink size={10} style={{ flexShrink: 0 }} />
        {isIpfs ? `ipfs://${value.slice(0, 20)}…` : value.length > 40 ? value.slice(0, 40) + "…" : value}
      </a>
    );
  }

  return (
    <div style={{ fontSize: 10, color: "#555", marginTop: 2, fontFamily: "monospace" }}>
      {value.length > 40 ? value.slice(0, 40) + "…" : value}
    </div>
  );
}



// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Escrow() {
  const { address, isConnected, connect, signTransaction } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txPending, setTxPending] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<{
    jobId: bigint;
    milestoneIndex: number;
    title: string;
    amount: bigint;
    client: string;
    freelancer: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await listJobs(0n, 50n);
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
      const xdrTx = await buildSubmitMilestoneTx(address, job.id, milestoneIndex, deliverable);
      const signed = await signTransaction(xdrTx);
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
      const xdrTx = await buildApproveMilestoneTx(address, job.id, milestoneIndex);
      const signed = await signTransaction(xdrTx);
      await submitSignedTx(signed);
      await load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setTxPending(null);
    }
  };

  const handleDispute = async (job: Job, milestoneIndex: number) => {
    if (!address) return;
    if (!confirm("Raise a dispute for this milestone? An admin will review and resolve it.")) return;
    setTxPending(`dispute-${job.id}-${milestoneIndex}`);
    try {
      const xdrTx = await buildDisputeMilestoneTx(address, job.id, milestoneIndex);
      const signed = await signTransaction(xdrTx);
      await submitSignedTx(signed);
      await load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setTxPending(null);
    }
  };

  const handleClaimTimeout = async (job: Job, milestoneIndex: number) => {
    if (!address) return;
    if (!confirm("Claim this milestone payment due to client timeout?")) return;
    setTxPending(`timeout-${job.id}-${milestoneIndex}`);
    try {
      const xdrTx = await buildClaimTimeoutTx(address, job.id, milestoneIndex);
      const signed = await signTransaction(xdrTx);
      await submitSignedTx(signed);
      await load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setTxPending(null);
    }
  };

  const handleCancelJob = async (job: Job) => {
    if (!address) return;
    if (!confirm("Cancel this job and refund all locked funds to your wallet? This is only possible because no freelancer has accepted the job yet.")) return;
    setTxPending(`cancel-${job.id}`);
    try {
      const xdrTx = await buildCancelJobTx(address, job.id);
      const signed = await signTransaction(xdrTx);
      await submitSignedTx(signed);
      await load();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setTxPending(null);
    }
  };

  const handleRefundMilestone = async (job: Job, milestoneIndex: number) => {
    if (!address) return;
    if (!confirm("Refund this milestone's locked funds to your wallet? This is possible because the freelancer has missed the completion deadline and has not submitted any work yet.")) return;
    setTxPending(`refund-${job.id}-${milestoneIndex}`);
    try {
      const xdrTx = await buildRefundMilestoneTx(address, job.id, milestoneIndex);
      const signed = await signTransaction(xdrTx);
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
      <div className="sw-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
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
        <div className="sw-grid-3" style={{ gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Locked",   value: `${xlm(totalLocked)} XLM`,   color: "#e8323c", icon: <Lock size={16} color="#e8323c" /> },
            { label: "Total Released", value: `${xlm(totalReleased)} XLM`, color: "#22c55e", icon: <CheckCircle2 size={16} color="#22c55e" /> },
            { label: "In Dispute",     value: `${xlm(totalDisputed)} XLM`, color: totalDisputed > 0n ? "#e8323c" : "#555", icon: <AlertTriangle size={16} color={totalDisputed > 0n ? "#e8323c" : "#555"} /> },
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
              const isFreelancer = job.freelancer === address;
              const released = job.milestones.filter(m => m.status === "Approved").reduce((s, m) => s + m.amount, 0n);
              const pct = job.total > 0n ? Number(released * 100n / job.total) : 0;

              return (
                <div key={String(job.id)} style={{ background: "#111", borderRadius: 16, border: "1px solid #1f1f1f", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#555" }}>JOB-{String(job.id).padStart(3, "0")}</span>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{job.title}</h3>
                        {isClient && job.is_open && (
                          <button
                            onClick={() => handleCancelJob(job)}
                            disabled={!!txPending}
                            style={{ ...actionBtn, background: "#e8323c", marginLeft: 8 }}
                          >
                            {txPending === `cancel-${job.id}` ? <Loader2 size={11} /> : null}
                            Cancel Job & Refund
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>
                        Client: {formatAddress(job.client)} ·
                        Freelancer: {job.freelancer ? formatAddress(job.freelancer) : "Unassigned"} ·
                        {isClient ? " You're the client" : isFreelancer ? " You're the freelancer" : ""}
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
                      const isPending = (k: string) => txPending === `${k}-${job.id}-${i}`;
                      const now = Math.floor(Date.now() / 1000);
                      const isReviewTimedOut = m.review_deadline > 0n && Number(m.review_deadline) < now && m.status === "Submitted";
                      const isCompletionOverdue = m.deadline > 0n && Number(m.deadline) < now && m.status === "Locked";

                      return (
                        <div key={i} style={{
                          background: "#0d0d0d", borderRadius: 10,
                          border: `1px solid ${m.status === "Disputed" ? "rgba(232,50,60,0.3)" : m.status === "Refunded" ? "rgba(107,114,128,0.2)" : "#1a1a1a"}`,
                          padding: "12px 16px",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 11, color: "#333", fontWeight: 700, width: 24 }}>M{i + 1}</span>
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</span>
                                {m.deliverable && (
                                  <DeliverablePreview value={m.deliverable} />
                                )}
                                {m.deadline > 0n && (
                                  <div style={{ fontSize: 10, color: isCompletionOverdue ? "#e8323c" : "#444", marginTop: 2 }}>
                                    Deadline: {new Date(Number(m.deadline) * 1000).toLocaleDateString()}
                                    {isCompletionOverdue && " · OVERDUE"}
                                  </div>
                                )}
                                {m.status === "Submitted" && m.review_deadline > 0n && (
                                  <div style={{ fontSize: 10, color: isReviewTimedOut ? "#e8323c" : "#f97316", marginTop: 2 }}>
                                    Review Deadline: {new Date(Number(m.review_deadline) * 1000).toLocaleString()}
                                    {isReviewTimedOut && " · TIMED OUT"}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                              {isFreelancer && m.status === "Locked" && (
                                <button
                                  onClick={() => handleSubmit(job, i)}
                                  disabled={!!txPending}
                                  style={{ ...actionBtn, background: "#f97316" }}
                                >
                                  {isPending("submit") ? <Loader2 size={11} /> : null}
                                  Submit
                                </button>
                              )}

                              {/* Client: refund milestone if completion deadline missed */}
                              {isClient && m.status === "Locked" && isCompletionOverdue && (
                                <button
                                  onClick={() => handleRefundMilestone(job, i)}
                                  disabled={!!txPending}
                                  style={{ ...actionBtn, background: "#e8323c" }}
                                >
                                  {isPending("refund") ? <Loader2 size={11} /> : null}
                                  Refund Milestone
                                </button>
                              )}

                              {/* Client: approve */}
                              {isClient && m.status === "Submitted" && (
                                <button
                                  onClick={() => handleApprove(job, i)}
                                  disabled={!!txPending}
                                  style={{ ...actionBtn, background: "#22c55e" }}
                                >
                                  {isPending("approve") ? <Loader2 size={11} /> : null}
                                  Approve
                                </button>
                              )}

                              {/* Either party: dispute (on Submitted milestones) */}
                              {(isClient || isFreelancer) && m.status === "Submitted" && (
                                <button
                                  onClick={() => handleDispute(job, i)}
                                  disabled={!!txPending}
                                  style={{ ...actionBtn, background: "rgba(232,50,60,0.15)", color: "#e8323c", border: "1px solid rgba(232,50,60,0.3)" }}
                                >
                                  {isPending("dispute") ? <Loader2 size={11} /> : <AlertTriangle size={11} />}
                                  Dispute
                                </button>
                              )}

                              {/* Admin: resolve dispute */}
                              {m.status === "Disputed" && (
                                <button
                                  onClick={() => setResolveModal({
                                    jobId: job.id,
                                    milestoneIndex: i,
                                    title: m.title,
                                    amount: m.amount,
                                    client: job.client,
                                    freelancer: job.freelancer,
                                  })}
                                  disabled={!!txPending}
                                  style={{ ...actionBtn, background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}
                                >
                                  <Scale size={11} />
                                  Resolve
                                </button>
                              )}

                              {/* Freelancer: claim timeout */}
                              {isFreelancer && isReviewTimedOut && (
                                <button
                                  onClick={() => handleClaimTimeout(job, i)}
                                  disabled={!!txPending}
                                  style={{ ...actionBtn, background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }}
                                >
                                  {isPending("timeout") ? <Loader2 size={11} /> : <Clock size={11} />}
                                  Claim Timeout
                                </button>
                              )}
                            </div>
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

      {/* Resolve Dispute Modal */}
      {resolveModal && address && (
        <ResolveDisputeModal
          jobId={resolveModal.jobId}
          milestoneIndex={resolveModal.milestoneIndex}
          milestoneTitle={resolveModal.title}
          milestoneAmount={resolveModal.amount}
          clientAddress={resolveModal.client}
          freelancerAddress={resolveModal.freelancer}
          onClose={() => setResolveModal(null)}
          onResolved={() => { setResolveModal(null); load(); }}
          signTransaction={signTransaction}
          address={address}
        />
      )}
    </div>
  );
}

const redBtn: React.CSSProperties = { padding: "8px 16px", borderRadius: 9, background: "#e8323c", border: "none", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" };
const actionBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 7, border: "none", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" };
