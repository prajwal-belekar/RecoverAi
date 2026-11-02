"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  )
);
Skeleton.displayName = "Skeleton";

export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-card border border-card-border p-6 space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-card-border overflow-hidden">
      <div className="grid grid-cols-4 gap-4 p-4 bg-muted">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 p-4 border-t border-card-border">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonKPI() {
  return (
    <div className="rounded-xl bg-card border border-card-border p-6 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}