"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { SkeletonKPI } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "danger" | "secondary";
  loading?: boolean;
}

const iconColors = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  secondary: "bg-secondary/10 text-secondary",
};

const changeColors = {
  positive: "text-success",
  negative: "text-danger",
  neutral: "text-muted-foreground",
};

export function KPICard({ title, value, change, changeType = "neutral", icon, color, loading }: KPICardProps) {
  if (loading) {
    return <SkeletonKPI />;
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
            {change && (
              <p className={cn("mt-1 text-sm font-medium", changeColors[changeType])}>
                {change}
              </p>
            )}
          </div>
          <div className={cn("flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center", iconColors[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TotalTicketsIcon() {
  return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
}

function OpenTicketsIcon() {
  return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
}

function ResolutionTimeIcon() {
  return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}

function ResolutionRateIcon() {
  return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}

function AIAssistedIcon() {
  return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>;
}

interface DashboardKPICardsProps {
  totals: {
    total: number;
    open: number;
    resolved: number;
    critical: number;
  };
  avgResolutionTime: number | null;
  resolutionRate: number;
  aiAssistedCount: number;
  totalTickets: number;
  loading?: boolean;
}

export function DashboardKPICards({
  totals,
  avgResolutionTime,
  resolutionRate,
  aiAssistedCount,
  totalTickets,
  loading,
}: DashboardKPICardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <KPICard
        title="Total Tickets"
        value={totals.total.toLocaleString()}
        icon={<TotalTicketsIcon />}
        color="primary"
        loading={loading}
      />
      <KPICard
        title="Open Tickets"
        value={totals.open.toLocaleString()}
        icon={<OpenTicketsIcon />}
        color="warning"
        loading={loading}
      />
      <KPICard
        title="Avg Resolution Time"
        value={avgResolutionTime ? `${avgResolutionTime.toFixed(1)}h` : "N/A"}
        icon={<ResolutionTimeIcon />}
        color="secondary"
        loading={loading}
      />
      <KPICard
        title="Resolution Rate"
        value={`${resolutionRate.toFixed(1)}%`}
        icon={<ResolutionRateIcon />}
        color="success"
        loading={loading}
      />
      <KPICard
        title="AI-Assisted Tickets"
        value={totalTickets > 0 ? `${((aiAssistedCount / totalTickets) * 100).toFixed(1)}%` : "0%"}
        change={`${aiAssistedCount} of ${totalTickets} tickets`}
        changeType="neutral"
        icon={<AIAssistedIcon />}
        color="danger"
        loading={loading}
      />
    </div>
  );
}