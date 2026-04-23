"use client";
// Admin panel — platform-wide stats, dispute resolution, job oversight
// Only the contract admin can resolve disputes on-chain

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/wallet-context";
import {
  listJobs,
  getWorkTokenSupply,
  buildResolveDisputeTx,
  submitSignedTx,
  type Job,
} from "@/lib/contracts/client";
import { formatAddress } from "@/lib/utils";
import {
  Shield, Scale, AlertTriangle, CheckCircle2,
  Briefcase, Coins, Loader2, AlertCircle, X,
} from "lucide-react";

const STROOPS = 10_000_000n;
function xlm(s: bigint) { return (Number(s) / Number(STROOPS)).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

// ── Resolve Modal (inline) ────────────────────────────────────────────────────

function ResolveModal({
  job, milestoneIndex, onClose, onResolved, signTransaction, address,
}: {
  job: Job; milestoneIndex: number;
  onClose: () => void; onResolved: () => void;
  signTransaction: (xdr: string) => Promise<string>; address: string;
}) {
  const m = job.milestones[milestoneIndex];
  const [pct, setPct] = useState(50);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const freelancerXlm = (Number(m.amount) / 1e7 * pct / 100).toFixed(2);
  const clientXlm = (Number(m.amount) / 1e7 * (100 - pct) / 100).toFixed(2);

  const resolve = async () => {
    setPending(true); setErr(null);
    try {
      const bps = Math.round(pct * 100);
      const xdrTx = await buildResolveDisputeTx(address, job.id, milestoneIndex, bps);
      const signed = await signTransaction(xdrTx);
      await submitSignedTx(signed);
      onResolved();
    } catch (e: any) { setErr(e.message); }
    finally { setPending(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{ background: "#111", borderRadius: 20, border: "1px solid #2a2a2a", width: "100%", maxWidth: 460, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>Resolve Dispute</h2>
            <p style={{ fontSize: 11, color: "#555" }}>Job #{String(job.id)} · {m.title}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#555" }}><X size={18} /></button>
        </div>

        <div style={{ background: "#0d0d0d", borderRadius: 10, border: "1px solid #1a1a1a", padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Disputed amount</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{xlm(m.amount)} XLM</div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
            Client: {formatAddress(job.client)} · Freelancer: {job.freelancer ? formatAddress(job.freelancer) : "—"}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 10 }}>
            <span>Freelancer gets</span><span>Client gets</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={pct}
            onChange={e => setPct(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#e8323c", cursor: "pointer" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <div style={{ flex: 1, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#22c55e" }}>{freelancerXlm} XLM</div>
              <div style={{ fontSize: 11, color: "#555" }}>Freelancer ({pct}%)</div>
            </div>
            <div style={{ flex: 1, background: "rgba(232,50,60,0.1)", border: "1px solid rgba(232,50,60,0.2)", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#e8323c" }}>{clientXlm} XLM</div>
              <div style={{ fontSize: 11, color: "#555" }}>Client ({100 - pct}%)</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[{ l: "Full to Freelancer", p: 100 }, { l: "50 / 50", p: 50 }, { l: "Full to Client", p: 0 }].map(({ l, p }) => (
            <button key={p} onClick={() => setPct(p)} style={{
              flex: 1, padding: "7px 0", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${pct === p ? "#e8323c" : "#2a2a2a"}`,
              background: pct === p ? "rgba(232,50,60,0.1)" : "#0d0d0d",
              color: pct === p ? "#e8323c" : "#555", fontSize: 11, fontWeight: 600,
            }}>{l}</button>
          ))}
        </div>

        {err && <div style={{ background: "rgba(232,50,60,0.08)", border: "1px solid rgba(232,50,60,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#e8323c" }}>{err}</div>}

        <button onClick={resolve} disabled={pending} style={{
          width: "100%", padding: "12px 0", borderRadius: 10,
          background: "#e8323c", border: "none", fontSize: 14, fontWeight: 700, color: "#fff",
          cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {pending && <Loader2 size={14} />}
          {pending ? "Submitting..." : "Resolve On-Chain"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { address, isConnected, connect, signTransaction } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workSupply, setWorkSupply] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<{ job: Job; milestoneIndex: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [allJobs, supply] = await Promise.all([listJobs(0n, 100n), getWorkTokenSupply()]);
      setJobs(allJobs);
      setWorkSupply(supply);
    } catch (e: any) { setError(e.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Platform stats
  const totalJobs = jobs.length;
  const openJobs = jobs.filter(j => j.is_open).length;
  const activeJobs = jobs.filter(j => !j.is_open && j.milestones.some(m => m.status === "Locked" || m.status === "Submitted")).length;
  const completedJobs = jobs.filter(j => j.milestones.every(m => m.status === "Approved")).length;
  const disputedMilestones = jobs.flatMap(j =>
    j.milestones.map((m, i) => ({ job: j, milestone: m, index: i }))
  ).filter(({ milestone }) => milestone.status === "Disputed");
  const totalVolume = jobs.reduce((s, j) => s + j.total, 0n);
  const totalLocked = jobs.reduce((s, j) =>
    s + j.milestones.filter(m => m.status === "Locked" || m.status === "Submitted").reduce((a, m) => a + m.amount, 0n), 0n);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <div className="sw-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "rgba(232,50,60,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={20} color="#e8323c" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>Admin Panel</h1>
            <p style={{ fontSize: 13, color: "#555" }}>Platform oversight · dispute resolution · on-chain stats</p>
          </div>
        </div>

        {/* Connect prompt */}
        {!isConnected && (
          <div style={{
            background: "rgba(232,50,60,0.08)", border: "1px solid rgba(232,50,60,0.2)",
            borderRadius: 12, padding: "16px 20px", marginBottom: 24,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, color: "#888" }}>Connect your admin wallet to resolve disputes</span>
            <button onClick={connect} style={redBtn}>Connect Wallet</button>
          </div>
        )}

        {isConnected && address && (
          <div style={{
            background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
            borderRadius: 10, padding: "10px 16px", marginBottom: 24,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#22c55e", fontFamily: "monospace" }}>{address}</span>
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

        {/* Platform Stats */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
            Platform Stats
          </div>
          <div className="sw-grid-3" style={{ gap: 12, marginBottom: 12 }}>
            {[
              { label: "Total Jobs",      value: loading ? "—" : String(totalJobs),           icon: <Briefcase size={16} color="#e8323c" />,   color: "#e8323c" },
              { label: "Total Volume",    value: loading ? "—" : `${xlm(totalVolume)} XLM`,   icon: <Coins size={16} color="#f97316" />,        color: "#f97316" },
              { label: "WORK Minted",     value: loading ? "—" : String(workSupply),           icon: <CheckCircle2 size={16} color="#a78bfa" />, color: "#a78bfa" },
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
          <div className="sw-grid-4 sw-stats-grid" style={{ gap: 12 }}>
            {[
              { label: "Open",      value: loading ? "—" : String(openJobs),      color: "#22c55e" },
              { label: "Active",    value: loading ? "—" : String(activeJobs),    color: "#f97316" },
              { label: "Completed", value: loading ? "—" : String(completedJobs), color: "#555" },
              { label: "Locked",    value: loading ? "—" : `${xlm(totalLocked)} XLM`, color: "#e8323c" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "#111", borderRadius: 12, border: "1px solid #1f1f1f", padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "#444", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Disputed Milestones */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Disputed Milestones
            </div>
            {disputedMilestones.length > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: "#e8323c",
                background: "rgba(232,50,60,0.1)", padding: "2px 8px",
                borderRadius: 100, border: "1px solid rgba(232,50,60,0.2)",
              }}>
                {disputedMilestones.length} pending
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <Loader2 size={20} color="#333" />
            </div>
          ) : disputedMilestones.length === 0 ? (
            <div style={{
              background: "#111", borderRadius: 14, border: "1px solid #1f1f1f",
              padding: "32px", textAlign: "center",
            }}>
              <CheckCircle2 size={32} color="#22c55e" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>No active disputes</p>
              <p style={{ fontSize: 12, color: "#555" }}>All milestones are running smoothly</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {disputedMilestones.map(({ job, milestone, index }) => (
                <div key={`${job.id}-${index}`} style={{
                  background: "#111", borderRadius: 14,
                  border: "1px solid rgba(232,50,60,0.2)",
                  padding: "20px 24px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: "rgba(232,50,60,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <AlertTriangle size={16} color="#e8323c" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{job.title}</div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                        Milestone {index + 1}: {milestone.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
                        Client: {formatAddress(job.client)} ·
                        Freelancer: {job.freelancer ? formatAddress(job.freelancer) : "—"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#e8323c" }}>{xlm(milestone.amount)} XLM</div>
                      <div style={{ fontSize: 11, color: "#555" }}>In dispute</div>
                    </div>
                    {isConnected && (
                      <button
                        onClick={() => setResolveTarget({ job, milestoneIndex: index })}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "9px 18px", borderRadius: 9,
                          background: "rgba(167,139,250,0.15)",
                          border: "1px solid rgba(167,139,250,0.3)",
                          fontSize: 13, fontWeight: 700, color: "#a78bfa", cursor: "pointer",
                        }}
                      >
                        <Scale size={14} /> Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Jobs Table */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
            All Jobs
          </div>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <Loader2 size={20} color="#333" />
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ background: "#111", borderRadius: 14, border: "1px solid #1f1f1f", padding: "32px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#555" }}>No jobs on-chain yet</p>
            </div>
          ) : (
            <div style={{ background: "#111", borderRadius: 14, border: "1px solid #1f1f1f", overflow: "hidden" }}>
              {jobs.map((job, idx) => {
                const approved = job.milestones.filter(m => m.status === "Approved").length;
                const disputed = job.milestones.filter(m => m.status === "Disputed").length;
                const statusColor = disputed > 0 ? "#e8323c"
                  : approved === job.milestones.length ? "#22c55e"
                  : job.is_open ? "#555" : "#f97316";
                const statusLabel = disputed > 0 ? "Disputed"
                  : approved === job.milestones.length ? "Completed"
                  : job.is_open ? "Open" : "Active";

                return (
                  <div key={String(job.id)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 20px", flexWrap: "wrap", gap: 8,
                    borderBottom: idx < jobs.length - 1 ? "1px solid #1a1a1a" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace", width: 52 }}>
                        #{String(job.id).padStart(3, "0")}
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{job.title}</div>
                        <div style={{ fontSize: 11, color: "#444" }}>
                          {formatAddress(job.client)} · {job.milestones.length} milestones · {approved}/{job.milestones.length} approved
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {resolveTarget && address && (
        <ResolveModal
          job={resolveTarget.job}
          milestoneIndex={resolveTarget.milestoneIndex}
          onClose={() => setResolveTarget(null)}
          onResolved={() => { setResolveTarget(null); load(); }}
          signTransaction={signTransaction}
          address={address}
        />
      )}
    </div>
  );
}

const redBtn: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 9, background: "#e8323c",
  border: "none", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
};
