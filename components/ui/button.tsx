import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost";
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-primary text-white hover:bg-blue-500 disabled:bg-blue-500/60 disabled:text-white/80",
  ghost: "bg-transparent theme-muted hover:bg-[var(--surface-soft)]"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[14px] border border-transparent px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
