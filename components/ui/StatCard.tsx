"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  change?: number;
  accent?: boolean;
  className?: string;
}

export function StatCard({ label, value, sub, change, accent, className }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 flex flex-col gap-3",
        accent && "border-accent/30 bg-[#1a1a1a]",
        className
      )}
    >
      <span className="text-[12px] font-medium text-[#888] uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[28px] font-bold tabular-nums leading-none text-white">
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-[12px] text-[#555]">{sub}</p>
          )}
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
              isPositive
                ? "bg-[#22c55e]/10 text-[#22c55e]"
                : "bg-[#e8323c]/10 text-[#e8323c]"
            )}
          >
            {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
    </div>
  );
}
