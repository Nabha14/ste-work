import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "danger" | "muted" | "accent";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  success: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  warning: "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20",
  danger:  "bg-[#e8323c]/10 text-[#e8323c] border-[#e8323c]/20",
  muted:   "bg-[#ffffff]/5  text-[#888]    border-[#ffffff]/10",
  accent:  "bg-[#e8323c]/10 text-[#e8323c] border-[#e8323c]/20",
};

export function Badge({ variant = "muted", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
