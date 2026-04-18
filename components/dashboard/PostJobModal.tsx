"use client";

import { useState } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { buildPostJobTx, submitSignedTx } from "@/lib/contracts/client";

const STROOPS = 10_000_000n;

interface Milestone {
  title: string;
  xlm: string;
  deadline: string; // days from now, "" = no deadline
}

export default function PostJobModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { address, signTransaction } = useWallet();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([
    { title: "", xlm: "", deadline: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMilestone = () =>
    setMilestones(m => [...m, { title: "", xlm: "", deadline: "" }]);

  const removeMilestone = (i: number) =>
    setMilestones(m => m.filter((_, idx) => idx !== i));

  const updateMilestone = (i: number, field: keyof Milestone, value: string) =>
    setMilestones(m => m.map((ms, idx) => idx === i ? { ...ms, [field]: value } : ms));

  const totalXlm = milestones.reduce((s, m) => s + (parseFloat(m.xlm) || 0), 0);

  const handleSubmit = async () => {
    if (!address) return;
    if (!title.trim() || !description.trim()) { setError("Title and description required"); return; }
    if (milestones.some(m => !m.title.trim() || !m.xlm || parseFloat(m.xlm) <= 0)) {
      setError("All milestones need a title and amount > 0");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const now = Math.floor(Date.now() / 1000);
      const xdr = await buildPostJobTx(
        address,
        title.trim(),
        description.trim(),
        milestones.map(m => m.title.trim()),
        milestones.map(m => BigInt(Math.round(parseFloat(m.xlm) * Number(STROOPS)))),
        milestones.map(m =>
          m.deadline ? BigInt(now + parseInt(m.deadline) * 86400) : 0n
        ),
      );
      const signed = await signTransaction(xdr);
      await submitSignedTx(signed);
      onSuccess();
    } catch (e: any) {
      setError(e.message ?? "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "#111", borderRadius: 20,
        border: "1px solid #1f1f1f",
        width: "100%", maxWidth: 600,
        maxHeight: "90vh", overflowY: "auto",
        padding: 32,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Post a Job</h2>
            <p style={{ fontSize: 12, color: "#555", marginTop: 4 }}>Funds locked on-chain until milestones approved</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#555" }}>
            <X size={20} />
          </button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Job Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Soroban DEX Smart Contract"
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the work, requirements, and deliverables..."
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* Milestones */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <label style={labelStyle}>Milestones</label>
            <button onClick={addMilestone} style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 12, color: "#e8323c", background: "none", border: "none", cursor: "pointer",
            }}>
              <Plus size={13} /> Add Milestone
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {milestones.map((m, i) => (
              <div key={i} style={{
                background: "#0d0d0d", borderRadius: 12,
                border: "1px solid #1a1a1a", padding: "14px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "#555", fontWeight: 700, width: 24 }}>M{i + 1}</span>
                  <input
                    value={m.title}
                    onChange={e => updateMilestone(i, "title", e.target.value)}
                    placeholder="Milestone title"
                    style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                  />
                  {milestones.length > 1 && (
                    <button onClick={() => removeMilestone(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 10 }}>Amount (XLM)</label>
                    <input
                      type="number"
                      value={m.xlm}
                      onChange={e => updateMilestone(i, "xlm", e.target.value)}
                      placeholder="100"
                      min="0"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 10 }}>Deadline (days, optional)</label>
                    <input
                      type="number"
                      value={m.deadline}
                      onChange={e => updateMilestone(i, "deadline", e.target.value)}
                      placeholder="No deadline"
                      min="0"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#0d0d0d", borderRadius: 10,
          border: "1px solid #1a1a1a", padding: "12px 16px",
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 13, color: "#555" }}>Total to lock in escrow</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#e8323c" }}>
            {totalXlm.toLocaleString()} XLM
          </span>
        </div>

        {error && (
          <div style={{
            background: "rgba(232,50,60,0.08)", border: "1px solid rgba(232,50,60,0.2)",
            borderRadius: 10, padding: "10px 14px",
            fontSize: 13, color: "#e8323c", marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: "100%", padding: "13px",
            background: "#e8323c", border: "none", borderRadius: 10,
            fontSize: 14, fontWeight: 700, color: "#fff",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {submitting && <Loader2 size={16} />}
          {submitting ? "Signing & Submitting..." : `Post Job · Lock ${totalXlm} XLM`}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "#555", textTransform: "uppercase", letterSpacing: "0.5px",
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "#161616", border: "1px solid #2a2a2a",
  borderRadius: 9, color: "#fff", fontSize: 13,
  outline: "none", marginBottom: 0,
};
