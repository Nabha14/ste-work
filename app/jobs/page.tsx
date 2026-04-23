"use client";
// Jobs page — browse jobs with filters, sort, and expanded detail view
// Own jobs shown in a separate "My Postings" section (bug fix)

import { useState, useEffect, useCallback } from "react";
import {
  Search, Briefcase, Clock, ArrowRight, Plus,
  Loader2, AlertCircle, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { listJobs, type Job } from "@/lib/contracts/client";
import { useWallet } from "@/lib/wallet-context";
import { buildAcceptJobTx, submitSignedTx } from "@/lib/contracts/client";
import { formatAddress } from "@/lib/utils";
import PostJobModal from "@/components/dashboard/PostJobModal";

const STROOPS = 10_000_000n;
function xlmDisplay(stroops: bigint) {
  return (Number(stroops) / Number(STROOPS)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
const STATUS_COLORS: Record<string, string> = {
  Locked: "#555", Submitted: "#f97316", Approved: "#22c55e", Disputed: "#e8323c",
};
type SortKey = "newest" | "budget_high" | "budget_low" | "milestones";
type BudgetFilter = "all" | "lt100" | "100to500" | "gt500";
type StatusFilter = "all" | "open" | "inprogress";

export default function Jobs() {
  const { address, isConnected, connect, signTransaction } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);
  const [accepting, setAccepting] = useState<bigint | null>(null);
  const [expanded, setExpanded] = useState<bigint | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");
  const [budget, setBudget] = useState<BudgetFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [milestoneFilter, setMilestoneFilter] = useState(0);

  const loadJobs = useCallback(async () => {
    setLoading(true); setError(null);
    try { setJobs(await listJobs(0n, 50n)); }
    catch (e: any) { setError(e.message ?? "Failed to load jobs from chain"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleAccept = async (job: Job) => {
    if (!isConnected || !address) { connect(); return; }
    setAccepting(job.id);
    try {
      const xdr = await buildAcceptJobTx(address, job.id);
      const signed = await signTransaction(xdr);
      await submitSignedTx(signed);
      await loadJobs();
    } catch (e: any) { alert(`Failed: ${e.message}`); }
    finally { setAccepting(null); }
  };

  const myJobs = jobs.filter(j => j.client === address);
  const otherJobs = jobs.filter(j => j.client !== address);

  const filtered = otherJobs
    .filter(j => {
      const xlmVal = Number(j.total) / 1e7;
      if (search && !j.title.toLowerCase().includes(search.toLowerCase()) &&
          !j.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (budget === "lt100" && xlmVal >= 100) return false;
      if (budget === "100to500" && (xlmVal < 100 || xlmVal > 500)) return false;
      if (budget === "gt500" && xlmVal <= 500) return false;
      if (milestoneFilter > 0 && j.milestones.length < milestoneFilter) return false;
      if (statusFilter === "open" && !j.is_open) return false;
      if (statusFilter === "inprogress" && j.is_open) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "budget_high") return Number(b.total - a.total);
      if (sort === "budget_low") return Number(a.total - b.total);
      if (sort === "milestones") return b.milestones.length - a.milestones.length;
      return Number(b.created_at - a.created_at);
    });

  const openCount = otherJobs.filter(j => j.is_open).length;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <div className="sw-page" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>Browse Jobs</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
              {loading ? "Loading from Stellar testnet..." : `${openCount} open jobs on-chain`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={loadJobs} style={ghostBtn} title="Refresh">↻</button>
            <button onClick={() => isConnected ? setShowPostModal(true) : connect()} style={redBtn}>
              <Plus size={14} /> Post a Job
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={15} color="#444" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs by title or description..."
            style={{
              width: "100%", padding: "10px 14px 10px 40px",
              background: "#111", border: "1px solid #1f1f1f",
              borderRadius: 10, color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 24 }}>
          {[
            { label: "All", val: "all" }, { label: "Open", val: "open" }, { label: "In Progress", val: "inprogress" },
          ].map(o => (
            <button key={o.val} onClick={() => setStatusFilter(o.val as StatusFilter)} style={chipStyle(statusFilter === o.val)}>
              {o.label}
            </button>
          ))}
          <div style={{ width: 1, height: 18, background: "#2a2a2a" }} />
          {[
            { label: "Any Budget", val: "all" }, { label: "< 100 XLM", val: "lt100" },
            { label: "100–500 XLM", val: "100to500" }, { label: "> 500 XLM", val: "gt500" },
          ].map(o => (
            <button key={o.val} onClick={() => setBudget(o.val as BudgetFilter)} style={chipStyle(budget === o.val)}>
              {o.label}
            </button>
          ))}
          <div style={{ width: 1, height: 18, background: "#2a2a2a" }} />
          {[
            { label: "Any Milestones", val: 0 }, { label: "1+", val: 1 }, { label: "2+", val: 2 }, { label: "3+", val: 3 },
          ].map(o => (
            <button key={o.val} onClick={() => setMilestoneFilter(o.val)} style={chipStyle(milestoneFilter === o.val)}>
              {o.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto" }}>
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
              style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, color: "#888", fontSize: 12, padding: "6px 10px", cursor: "pointer", outline: "none" }}>
              <option value="newest">Newest first</option>
              <option value="budget_high">Highest budget</option>
              <option value="budget_low">Lowest budget</option>
              <option value="milestones">Most milestones</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(232,50,60,0.08)", border: "1px solid rgba(232,50,60,0.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
            <AlertCircle size={18} color="#e8323c" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e8323c" }}>Failed to load jobs</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{error}</div>
            </div>
            <button onClick={loadJobs} style={{ ...redBtn, marginLeft: "auto", fontSize: 12, padding: "6px 14px" }}>Retry</button>
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "80px 0", color: "#555" }}>
            <Loader2 size={20} />
            <span style={{ fontSize: 14 }}>Reading from Stellar testnet...</span>
          </div>
        )}

        {/* My Postings — separate section */}
        {!loading && myJobs.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e8323c", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              My Postings · {myJobs.length}
            </div>
            <div className="sw-grid-2">
              {myJobs.map(job => (
                <JobCard key={String(job.id)} job={job} onAccept={() => {}} accepting={false}
                  isConnected={isConnected} currentAddress={address}
                  expanded={expanded === job.id} onToggle={() => setExpanded(expanded === job.id ? null : job.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Browsable jobs */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <Briefcase size={40} color="#222" style={{ margin: "0 auto 16px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              {jobs.length === 0 ? "No jobs posted yet" : "No jobs match your filters"}
            </p>
            <p style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>
              {jobs.length === 0 ? "Be the first to post a job on StellarWork" : "Try adjusting your filters"}
            </p>
            {jobs.length === 0 && (
              <button onClick={() => isConnected ? setShowPostModal(true) : connect()} style={redBtn}>
                <Plus size={14} /> Post the First Job
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              {statusFilter === "open" ? "Open" : statusFilter === "inprogress" ? "In Progress" : "All Jobs"} · {filtered.length}
            </div>
            <div className="sw-grid-2">
              {filtered.map(job => (
                <JobCard key={String(job.id)} job={job} onAccept={() => handleAccept(job)}
                  accepting={accepting === job.id} isConnected={isConnected} currentAddress={address}
                  expanded={expanded === job.id} onToggle={() => setExpanded(expanded === job.id ? null : job.id)} />
              ))}
            </div>
          </>
        )}
      </div>

      {showPostModal && (
        <PostJobModal onClose={() => setShowPostModal(false)} onSuccess={() => { setShowPostModal(false); loadJobs(); }} />
      )}
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job, onAccept, accepting, isConnected, currentAddress, expanded, onToggle }: {
  job: Job; onAccept: () => void; accepting: boolean;
  isConnected: boolean; currentAddress: string | null;
  expanded: boolean; onToggle: () => void;
}) {
  const isOwn = currentAddress === job.client;
  const isFreelancer = currentAddress === job.freelancer;

  return (
    <div style={{
      background: "#111", borderRadius: 16,
      border: `1px solid ${isOwn ? "rgba(232,50,60,0.25)" : "#1f1f1f"}`,
      overflow: "hidden",
    }}>
      <div style={{ padding: "24px 24px 0" }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: "rgba(232,50,60,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Briefcase size={17} color="#e8323c" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{job.title}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
                {formatAddress(job.client)} · Job #{String(job.id)}
                {isOwn && <span style={{ color: "#e8323c", marginLeft: 6 }}>· Your posting</span>}
              </div>
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, flexShrink: 0,
            color: job.is_open ? "#22c55e" : "#f97316",
            background: job.is_open ? "rgba(34,197,94,0.1)" : "rgba(249,115,22,0.1)",
            padding: "3px 10px", borderRadius: 100,
            border: `1px solid ${job.is_open ? "rgba(34,197,94,0.2)" : "rgba(249,115,22,0.2)"}`,
          }}>
            {job.is_open ? "Open" : "In Progress"}
          </span>
        </div>

        {/* Description preview */}
        <p style={{ fontSize: 13, color: "#555", lineHeight: 1.65, marginBottom: 14 }}>
          {job.description.length > 120 ? job.description.slice(0, 120) + "..." : job.description}
        </p>

        {/* Milestone pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {job.milestones.map((m, i) => (
            <span key={i} style={{
              fontSize: 11, color: STATUS_COLORS[m.status] ?? "#555",
              background: `${STATUS_COLORS[m.status] ?? "#555"}18`,
              padding: "3px 10px", borderRadius: 100,
              border: `1px solid ${STATUS_COLORS[m.status] ?? "#555"}30`,
            }}>M{i + 1}: {m.status}</span>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, paddingBottom: 16, borderTop: "1px solid #1a1a1a" }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{xlmDisplay(job.total)} XLM</div>
              <div style={{ fontSize: 10, color: "#444" }}>Total Budget</div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700 }}>
                <Clock size={11} color="#555" /> {job.milestones.length} milestone{job.milestones.length !== 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 10, color: "#444" }}>{job.milestones.filter(m => m.status === "Approved").length} approved</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onToggle} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "6px 12px", borderRadius: 8,
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              fontSize: 11, fontWeight: 600, color: "#666", cursor: "pointer",
            }}>
              Details {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {job.is_open && !isOwn && (
              <button onClick={onAccept} disabled={accepting}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, background: "#e8323c", border: "none", fontSize: 12, fontWeight: 700, color: "#fff", cursor: accepting ? "not-allowed" : "pointer", opacity: accepting ? 0.6 : 1 }}>
                {accepting ? <Loader2 size={12} /> : <ArrowRight size={12} />}
                {accepting ? "Accepting..." : isConnected ? "Accept Job" : "Connect"}
              </button>
            )}
            {isFreelancer && <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>● Assigned to you</span>}
          </div>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{ borderTop: "1px solid #1a1a1a", padding: "18px 24px 20px", background: "#0d0d0d" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 10 }}>Full Details</div>

          <p style={{ fontSize: 13, color: "#666", lineHeight: 1.75, marginBottom: 16 }}>{job.description}</p>

          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" as const }}>
            <div>
              <div style={{ fontSize: 11, color: "#444", marginBottom: 3 }}>Client</div>
              <a href={`https://stellar.expert/explorer/testnet/account/${job.client}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: "#e8323c", fontFamily: "monospace", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                {formatAddress(job.client, 8)} <ExternalLink size={10} />
              </a>
            </div>
            {job.freelancer && (
              <div>
                <div style={{ fontSize: 11, color: "#444", marginBottom: 3 }}>Freelancer</div>
                <a href={`https://stellar.expert/explorer/testnet/account/${job.freelancer}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: "#22c55e", fontFamily: "monospace", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                  {formatAddress(job.freelancer, 8)} <ExternalLink size={10} />
                </a>
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, color: "#444", marginBottom: 3 }}>Posted</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {new Date(Number(job.created_at) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 8 }}>Milestone Breakdown</div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
            {job.milestones.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111", borderRadius: 8, padding: "10px 14px", border: "1px solid #1a1a1a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#333", fontWeight: 700, width: 22 }}>M{i + 1}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                    {m.deadline > 0n && (
                      <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                        Deadline: {new Date(Number(m.deadline) * 1000).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{xlmDisplay(m.amount)} XLM</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[m.status] ?? "#555", background: `${STATUS_COLORS[m.status] ?? "#555"}18`, padding: "3px 10px", borderRadius: 100, border: `1px solid ${STATUS_COLORS[m.status] ?? "#555"}30` }}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: "5px 12px", borderRadius: 8, cursor: "pointer",
  fontSize: 12, fontWeight: 600,
  border: `1px solid ${active ? "#e8323c" : "#1f1f1f"}`,
  background: active ? "rgba(232,50,60,0.1)" : "#111",
  color: active ? "#e8323c" : "#555",
});
const redBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 18px", borderRadius: 9, background: "#e8323c",
  border: "none", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 9, background: "#111",
  border: "1px solid #1f1f1f", fontSize: 16, color: "#666", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
