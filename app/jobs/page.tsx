"use client";
// Jobs page — reads all jobs from EscrowContract.list_jobs() on Stellar testnet
// Accept job calls EscrowContract.accept_job() via Freighter-signed transaction

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Briefcase, Clock, ArrowRight, Plus, Loader2, AlertCircle } from "lucide-react";
import { listJobs, type Job } from "@/lib/contracts/client";
import { useWallet } from "@/lib/wallet-context";
import { buildAcceptJobTx, submitSignedTx } from "@/lib/contracts/client";
import { formatAddress } from "@/lib/utils";
import PostJobModal from "@/components/dashboard/PostJobModal";

const STROOPS = 10_000_000n;

function xlmDisplay(stroops: bigint): string {
  return (Number(stroops) / Number(STROOPS)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const STATUS_COLORS: Record<string, string> = {
  Locked:    "#555",
  Submitted: "#f97316",
  Approved:  "#22c55e",
  Disputed:  "#e8323c",
};

export default function Jobs() {
  const { address, isConnected, connect, signTransaction } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);
  const [accepting, setAccepting] = useState<bigint | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listJobs(0n, 20n);
      setJobs(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load jobs from chain");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleAccept = async (job: Job) => {
    if (!isConnected || !address) { connect(); return; }
    setAccepting(job.id);
    try {
      const xdr = await buildAcceptJobTx(address, job.id);
      const signed = await signTransaction(xdr);
      await submitSignedTx(signed);
      await loadJobs(); // refresh
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    } finally {
      setAccepting(null);
    }
  };

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.description.toLowerCase().includes(search.toLowerCase())
  );

  const openJobs = filtered.filter(j => j.is_open);
  const inProgressJobs = filtered.filter(j => !j.is_open && j.freelancer);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>Browse Jobs</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
              {loading ? "Loading from Stellar testnet..." : `${openJobs.length} open jobs on-chain`}
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
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={15} color="#444" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs..."
              style={{
                width: "100%", padding: "10px 14px 10px 40px",
                background: "#111", border: "1px solid #1f1f1f",
                borderRadius: 10, color: "#fff", fontSize: 13, outline: "none",
              }}
            />
          </div>
        </div>

        {/* States */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "80px 0", color: "#555" }}>
            <Loader2 size={20} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 14 }}>Reading from Stellar testnet...</span>
          </div>
        )}

        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(232,50,60,0.08)", border: "1px solid rgba(232,50,60,0.2)",
            borderRadius: 12, padding: "16px 20px", marginBottom: 20,
          }}>
            <AlertCircle size={18} color="#e8323c" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e8323c" }}>Failed to load jobs</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{error}</div>
            </div>
            <button onClick={loadJobs} style={{ ...redBtn, marginLeft: "auto", fontSize: 12, padding: "6px 14px" }}>Retry</button>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <Briefcase size={40} color="#222" style={{ margin: "0 auto 16px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>No jobs posted yet</p>
            <p style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>Be the first to post a job on StellarWork</p>
            <button onClick={() => isConnected ? setShowPostModal(true) : connect()} style={redBtn}>
              <Plus size={14} /> Post the First Job
            </button>
          </div>
        )}

        {/* Open Jobs */}
        {!loading && openJobs.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              Open · {openJobs.length}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 32 }}>
              {openJobs.map(job => (
                <JobCard
                  key={String(job.id)}
                  job={job}
                  onAccept={() => handleAccept(job)}
                  accepting={accepting === job.id}
                  isConnected={isConnected}
                  currentAddress={address}
                />
              ))}
            </div>
          </>
        )}

        {/* In Progress */}
        {!loading && inProgressJobs.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              In Progress · {inProgressJobs.length}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {inProgressJobs.map(job => (
                <JobCard
                  key={String(job.id)}
                  job={job}
                  onAccept={() => {}}
                  accepting={false}
                  isConnected={isConnected}
                  currentAddress={address}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showPostModal && (
        <PostJobModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => { setShowPostModal(false); loadJobs(); }}
        />
      )}
    </div>
  );
}

function JobCard({ job, onAccept, accepting, isConnected, currentAddress }: {
  job: Job;
  onAccept: () => void;
  accepting: boolean;
  isConnected: boolean;
  currentAddress: string | null;
}) {
  const isOwn = currentAddress === job.client;
  const isFreelancer = currentAddress === job.freelancer;
  const totalXlm = xlmDisplay(job.total);
  const milestoneCount = job.milestones.length;
  const approvedCount = job.milestones.filter(m => m.status === "Approved").length;

  return (
    <div style={{
      background: "#111", borderRadius: 16,
      border: "1px solid #1f1f1f", padding: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: "rgba(232,50,60,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Briefcase size={17} color="#e8323c" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{job.title}</div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
              {formatAddress(job.client)} · Job #{String(job.id)}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: job.is_open ? "#22c55e" : "#f97316",
          background: job.is_open ? "rgba(34,197,94,0.1)" : "rgba(249,115,22,0.1)",
          padding: "3px 10px", borderRadius: 100,
          border: `1px solid ${job.is_open ? "rgba(34,197,94,0.2)" : "rgba(249,115,22,0.2)"}`,
        }}>
          {job.is_open ? "Open" : "In Progress"}
        </span>
      </div>

      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.65, marginBottom: 16 }}>
        {job.description.length > 120 ? job.description.slice(0, 120) + "..." : job.description}
      </p>

      {/* Milestones preview */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {job.milestones.map((m, i) => (
          <span key={i} style={{
            fontSize: 11, color: STATUS_COLORS[m.status] ?? "#555",
            background: `${STATUS_COLORS[m.status] ?? "#555"}18`,
            padding: "3px 10px", borderRadius: 100,
            border: `1px solid ${STATUS_COLORS[m.status] ?? "#555"}30`,
          }}>
            M{i + 1}: {m.status}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", gap: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{totalXlm} XLM</div>
            <div style={{ fontSize: 10, color: "#444" }}>Total Budget</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700 }}>
              <Clock size={11} color="#555" /> {milestoneCount} milestones
            </div>
            <div style={{ fontSize: 10, color: "#444" }}>{approvedCount} approved</div>
          </div>
        </div>

        {job.is_open && !isOwn && (
          <button
            onClick={onAccept}
            disabled={accepting || !isConnected}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9,
              background: "#e8323c", border: "none",
              fontSize: 12, fontWeight: 700, color: "#fff",
              cursor: accepting ? "not-allowed" : "pointer",
              opacity: accepting ? 0.6 : 1,
            }}
          >
            {accepting ? <Loader2 size={12} /> : <ArrowRight size={12} />}
            {accepting ? "Accepting..." : isConnected ? "Accept Job" : "Connect to Accept"}
          </button>
        )}
        {isOwn && (
          <span style={{ fontSize: 12, color: "#555" }}>Your job</span>
        )}
        {isFreelancer && (
          <span style={{ fontSize: 12, color: "#22c55e" }}>● Assigned to you</span>
        )}
      </div>
    </div>
  );
}

const redBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 18px", borderRadius: 9,
  background: "#e8323c", border: "none",
  fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 9,
  background: "#111", border: "1px solid #1f1f1f",
  fontSize: 16, color: "#666", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
