import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  accent?: boolean;
}

export function Card({ className, elevated, accent, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        elevated ? "bg-[#242424]" : "bg-[#111]",
        accent ? "border-[rgba(232,50,60,0.25)]" : "border-[#1f1f1f]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex items-center justify-between", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-[15px] font-semibold text-white", className)} {...props} />
  );
}
