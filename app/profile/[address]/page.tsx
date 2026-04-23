"use client";
// Public profile — shareable /profile/GXXX... page, no wallet required
// Shows WORK score, reputation badge, job history for any address

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  listJobs, getWorkTokenBalance, getWorkTokenSupply, type Job,
} from "@/lib/contracts/client";
import { formatAddress } from "@/lib/utils";
import {
  Star, Briefcase, CheckCircle2, Clock, Coins,
  ExternalLink, Copy, Loader2, AlertCircle, TrendingUp,
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
    }}>{tier.label}</span>
  );
}

export default function PublicProfile() {
  const params = useParams();
  const profileAddress = decodeURIComponent(params.address as string);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [workBalance, setWorkBalance] = useState<bigint>(0n);
  const [workSupply, setWorkSupply] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profileAddress) return;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [allJobs, wb, supply] = await Promise.all([
          listJobs(0n, 100n),
          getWorkTokenBalance(profileAddress),
          getWorkTokenSupply(),
        ]);
        setJobs(allJobs);
        setWorkBalance(wb);
        setWorkSupply(supply);
      } catch (e: any) { setError(e.message ?? "Failed to load"); }
      finally { setLoading(false); }
    })();
  }, [profileAddress]);

  const copyAddress = () => {
    navigator.clipboard.writeText(profileAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const jobsAsClient     = jobs.filter(j => j.client === profileAddress);
  const jobsAsFreelancer = jobs.filter(j => j.freelancer === profileAddress);
  const completedJobs    = jobsAsFreelancer.filter(j => j.milestones.every(m => m.status === "Approved"));
  const activeJobs       = jobsAsFreelancer.filter(j => j.milestones.some(m => m.status === "Locked" || m.status === "Submitted"));
  const totalEarned      = jobsAsFreelancer.reduce((s, j) =>
    s + j.milestones.filter(m => m.status === "Approved").reduce((a, m) => a + m.amount, 0n), 0n);
  const totalMilestones  = jobsAsFreelancer.reduce((s, j) =>
    s + j.milestones.filter(m => m.status === "Approved").length, 0);
  const pctOfSupply = workSupply > 0n ? Math.round(Number(workBalance) / Number(workSupply) * 100) : 0;

  const allMyJobs = [...jobsAsFreelancer, ...jobsAsClient]
    .filter((j, i, arr) => arr.findIndex(x => x.id === j.id) === i)
    .sort((a, b) => Number(b.created_at) - Number(a.created_at));

  if (!profileAddress || profileAddress.length < 10) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#555", fontSize: 14 }}>Invalid address</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>

        {/* Profile card */}
        <div style={{ background: "#111", borderRadius: 20, border: "1px solid #1f1f1f", padding: "32px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: "linear-gradient(135deg, #e8323c, #a78bfa)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, color: "#fff", flexShrink: 0,
              }}>
                {profileAddress.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 800 }}>{formatAddress(profileAddress, 8)}</h1>
                  {!loading && <ReputationBadge score={workBalance} />}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>
                    {formatAddress(profileAddress, 12)}
                  </span>
                  <button onClick={copyAddress} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: 0 }}>
                    {copied ? <CheckCircle2 size={13} color="#22c55e" /> : <Copy size={13} />}
                  </button>
                  <a href={`https://stellar.expert/explorer/testnet/account/${profileAddress}`}
                    target="_blank" rel="noopener noreferrer" style={{ color: "#555", display: "flex" }}>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              {/* WORK score */}
              <div style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 14, padding: "14px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>WORK Score</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#a78bfa", lineHeight: 1 }}>
                  {loading ? "—" : String(workBalance)}
                </div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{pctOfSupply}% of supply</div>
              </div>
              {/* Share button */}
              <button onClick={copyProfileLink} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 9,
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                fontSize: 12, fontWeight: 600, color: "#888", cursor: "pointer",
              }}>
                <Copy size={12} /> Copy Profile Link
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(232,50,60,0.08)", border: "1px solid rgba(232,50,60,0.2)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
            <AlertCircle size={16} color="#e8323c" />
            <span style={{ fontSize: 13, color: "#e8323c" }}>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 size={24} color="#333" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="sw-grid-3" style={{ gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total Earned",    value: `${xlm(totalEarned)} XLM`,    icon: <Coins size={16} color="#22c55e" />,       color: "#22c55e" },
                { label: "Milestones Done", value: String(totalMilestones),       icon: <CheckCircle2 size={16} color="#a78bfa" />, color: "#a78bfa" },
                { label: "Active Jobs",     value: String(activeJobs.length),     icon: <Clock size={16} color="#f97316" />,        color: "#f97316" },
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

            {/* As Freelancer / As Client */}
            <div className="sw-grid-2" style={{ gap: 16, marginBottom: 24 }}>
              <div style={{ background: "#111", borderRadius: 16, border: "1px solid #1f1f1f", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <TrendingUp size={16} color="#22c55e" />
                  <h2 style={{ fontSize: 14, fontWeight: 700 }}>As Freelancer</h2>
                </div>
                {[
                  { label: "Jobs accepted", value: jobsAsFreelancer.length },
                  { label: "Completed",     value: completedJobs.length, color: "#22c55e" },
                  { label: "In progress",   value: activeJobs.length,    color: "#f97316" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: "#555" }}>{label}</span>
                    <span style={{ fontWeight: 700, color: color ?? "#fff" }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#111", borderRadius: 16, border: "1px solid #1f1f1f", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Briefcase size={16} color="#e8323c" />
                  <h2 style={{ fontSize: 14, fontWeight: 700 }}>As Client</h2>
                </div>
                {[
                  { label: "Jobs posted",  value: jobsAsClient.length },
                  { label: "Completed",    value: jobsAsClient.filter(j => j.milestones.every(m => m.status === "Approved")).length, color: "#22c55e" },
                  { label: "Open",         value: jobsAsClient.filter(j => j.is_open).length },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: "#555" }}>{label}</span>
                    <span style={{ fontWeight: 700, color: color ?? "#fff" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Job history */}
            {allMyJobs.length > 0 ? (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Job History</div>
                <div style={{ background: "#111", borderRadius: 14, border: "1px solid #1f1f1f", overflow: "hidden" }}>
                  {allMyJobs.map((job, idx) => {
                    const isClient = job.client === profileAddress;
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
                        borderBottom: idx < allMyJobs.length - 1 ? "1px solid #1a1a1a" : "none",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace", width: 52 }}>#{String(job.id).padStart(3, "0")}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{job.title}</div>
                            <div style={{ fontSize: 11, color: "#444" }}>
                              {isClient ? "Posted" : "Worked on"} · {approved}/{job.milestones.length} milestones
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{xlm(job.total)} XLM</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, background: `${statusColor}18`, padding: "3px 10px", borderRadius: 100, border: `1px solid ${statusColor}30` }}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Star size={32} color="#222" style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, color: "#555" }}>No on-chain activity yet for this address</p>
              </div>
            )}

            {/* CTA */}
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <Link href="/jobs" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 9, background: "#e8323c",
                border: "none", fontSize: 13, fontWeight: 700, color: "#fff", textDecoration: "none",
              }}>
                Browse Jobs on StellarWork
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
