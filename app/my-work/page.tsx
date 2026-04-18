"use client";

import { Briefcase, Clock, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";

const WORK = [
  { id: 1, title: "Soroban DEX Smart Contract", client: "0xA7F3...Ea2", status: "In Progress", milestone: "2 / 3", budget: "900 XLM", earned: "300 XLM", deadline: "5 days", statusColor: "#f97316" },
  { id: 2, title: "Token Vesting Contract",     client: "0xD4E5...C33", status: "In Review",   milestone: "3 / 4", budget: "1,200 XLM", earned: "900 XLM", deadline: "2 days", statusColor: "#a78bfa" },
  { id: 3, title: "Smart Contract Audit",       client: "0xE5F6...A66", status: "Completed",   milestone: "1 / 1", budget: "800 XLM", earned: "800 XLM", deadline: "Done", statusColor: "#22c55e" },
];

export default function MyWork() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>My Work</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Jobs you're currently working on</p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Active Jobs",    value: "2",         icon: <Briefcase size={16} color="#f97316" /> },
            { label: "Total Earned",   value: "2,000 XLM", icon: <CheckCircle2 size={16} color="#22c55e" /> },
            { label: "In Review",      value: "1",         icon: <Clock size={16} color="#a78bfa" /> },
            { label: "Pending Issues", value: "0",         icon: <AlertCircle size={16} color="#555" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{ background: "#111", borderRadius: 14, border: "1px solid #1f1f1f", padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                {icon}
                <span style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Work list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {WORK.map(job => (
            <div key={job.id} style={{
              background: "#111", borderRadius: 16,
              border: "1px solid #1f1f1f", padding: "24px",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(232,50,60,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Briefcase size={18} color="#e8323c" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{job.title}</h3>
                    <div style={{ fontSize: 12, color: "#444", marginTop: 3 }}>
                      Client: {job.client} · Milestone {job.milestone}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#444" }}>Earned</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#22c55e" }}>{job.earned}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#444" }}>Budget</div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{job.budget}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#444" }}>Deadline</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: job.deadline === "Done" ? "#22c55e" : "#f97316" }}>{job.deadline}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: job.statusColor,
                    background: `${job.statusColor}18`, padding: "5px 12px",
                    borderRadius: 100, border: `1px solid ${job.statusColor}30`,
                  }}>{job.status}</span>
                  <ChevronRight size={18} color="#444" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
