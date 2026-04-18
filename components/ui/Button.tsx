import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:   "bg-accent text-white hover:bg-[#c9272f] shadow-[0_0_20px_rgba(232,50,60,0.2)]",
  secondary: "bg-[#242424] text-white hover:bg-[#2e2e2e] border border-[#2a2a2a]",
  ghost:     "text-[#888] hover:text-white hover:bg-[#1a1a1a]",
  danger:    "bg-[#e8323c]/10 text-[#e8323c] hover:bg-[#e8323c]/20 border border-[#e8323c]/20",
  outline:   "border border-[#2a2a2a] text-white hover:border-[#3a3a3a] hover:bg-[#1a1a1a]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-[12px] rounded-md",
  md: "h-9 px-4 text-[13px] rounded-lg",
  lg: "h-11 px-6 text-[14px] rounded-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  fullWidth,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
