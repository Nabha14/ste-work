"use client";

import { useState } from "react";
import { Scale, X, Loader2 } from "lucide-react";
import { buildResolveDisputeTx, submitSignedTx } from "@/lib/contracts/client";
import { formatAddress } from "@/lib/utils";

const STROOPS = 10_000_000n;
function xlm(s: bigint) {
  return (Number(s) / Number(STROOPS)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

interface ResolveDisputeModalProps {
  jobId: bigint;
  milestoneIndex: number;
  milestoneTitle: string;
  milestoneAmount: bigint;
  onClose: () => void;
  onResolved: () => void;
  signTransaction: (xdr: string) => Promise<string>;
  address: string;
  clientAddress: string;
  freelancerAddress: string | null;
}

export default function ResolveDisputeModal({
  jobId,
  milestoneIndex,
  milestoneTitle,
  milestoneAmount,
  onClose,
  onResolved,
  signTransaction,
  address,
  clientAddress,
  freelancerAddress,
}: ResolveDisputeModalProps) {
  const [freelancerPct, setFreelancerPct] = useState(50);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const freelancerBps = Math.round(freelancerPct * 100);
  const freelancerXlm = (Number(milestoneAmount) / 1e7 * freelancerPct / 100).toFixed(2);
  const clientXlm = (Number(milestoneAmount) / 1e7 * (100 - freelancerPct) / 100).toFixed(2);

  const handleResolve = async () => {
    setPending(true);
    setError(null);
    try {
      const xdrTx = await buildResolveDisputeTx(address, jobId, milestoneIndex, freelancerBps);
      const signed = await signTransaction(xdrTx);
      await submitSignedTx(signed);
      onResolved();
    } catch (e: any) {
      setError(e.message ?? "Transaction failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "#111", borderRadius: 20,
        border: "1px solid #2a2a2a",
        width: "100%", maxWidth: 480,
        padding: 32,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(232,50,60,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Scale size={16} color="#e8323c" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Resolve Dispute</h2>
              <p style={{ fontSize: 11, color: "#555" }}>Job #{String(jobId)} · {milestoneTitle}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#555" }}>
            <X size={18} />
          </button>
        </div>

        {/* Amount info */}
        <div style={{
          background: "#0d0d0d", borderRadius: 12,
          border: "1px solid #1a1a1a", padding: "16px 20px",
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Total in dispute</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{xlm(milestoneAmount)} XLM</div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
            Client: {formatAddress(clientAddress)} · Freelancer: {freelancerAddress ? formatAddress(freelancerAddress) : "—"}
          </div>
        </div>

        {/* Slider */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 12 }}>
            <span>Freelancer gets</span>
            <span>Client gets</span>
          </div>
          <input
            type="range"
            min={0} max={100} step={5}
            value={freelancerPct}
            onChange={e => setFreelancerPct(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#e8323c", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <div style={{
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: 10, padding: "10px 16px", textAlign: "center", flex: 1, marginRight: 8,
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>{freelancerXlm} XLM</div>
              <div style={{ fontSize: 11, color: "#555" }}>Freelancer ({freelancerPct}%)</div>
            </div>
            <div style={{
              background: "rgba(232,50,60,0.1)", border: "1px solid rgba(232,50,60,0.2)",
              borderRadius: 10, padding: "10px 16px", textAlign: "center", flex: 1, marginLeft: 8,
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#e8323c" }}>{clientXlm} XLM</div>
              <div style={{ fontSize: 11, color: "#555" }}>Client ({100 - freelancerPct}%)</div>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[
            { label: "Full to Freelancer", pct: 100 },
            { label: "50 / 50", pct: 50 },
            { label: "Full to Client", pct: 0 },
          ].map(({ label, pct }) => (
            <button
              key={pct}
              onClick={() => setFreelancerPct(pct)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 8,
                border: `1px solid ${freelancerPct === pct ? "#e8323c" : "#2a2a2a"}`,
                background: freelancerPct === pct ? "rgba(232,50,60,0.1)" : "#0d0d0d",
                color: freelancerPct === pct ? "#e8323c" : "#555",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            background: "rgba(232,50,60,0.08)", border: "1px solid rgba(232,50,60,0.2)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            fontSize: 12, color: "#e8323c",
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleResolve}
          disabled={pending}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 10,
            background: "#e8323c", border: "none",
            fontSize: 14, fontWeight: 700, color: "#fff",
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {pending && <Loader2 size={14} />}
          {pending ? "Submitting..." : "Resolve Dispute On-Chain"}
        </button>
        <p style={{ fontSize: 11, color: "#444", textAlign: "center", marginTop: 10 }}>
          This action is irreversible. Funds will be split immediately.
        </p>
      </div>
    </div>
  );
}
