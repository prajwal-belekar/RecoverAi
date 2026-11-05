"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-primary text-white hover:bg-primary-hover",
      secondary: "bg-secondary text-foreground hover:bg-secondary-hover",
      success: "bg-success text-white hover:bg-success/90",
      warning: "bg-warning text-black hover:bg-warning/90",
      danger: "bg-danger text-white hover:bg-danger/90",
      outline: "text-foreground border border-border",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";