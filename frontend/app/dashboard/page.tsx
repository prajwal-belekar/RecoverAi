"use client";

import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardKPICards } from "@/components/dashboard/KPICards";
import { TicketVolumeChart } from "@/components/dashboard/TicketVolumeChart";
import { CategoryDistribution } from "@/components/dashboard/CategoryDistribution";
import { PriorityDistribution } from "@/components/dashboard/PriorityDistribution";
import { RecentTickets } from "@/components/dashboard/RecentTickets";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getDashboardTotals, getCategoryDistribution, getPriorityDistribution, getAverageResolutionTime } from "@/lib/dashboardApi";
import { api } from "@/lib/api";

interface Ticket {
  id: number;
  title: string;
  status: string;
  priority: string;
  category?: string;
  customer_name?: string;
  created_at: string;
}

interface PendingApproval {
  id: number;
  ticket_id: number;
  ticket_title: string;
  ticket_status: string;
  ticket_priority: string;
  ai_confidence: number;
  created_at: string;
}

interface Activity {
  id: string;
  type: "ticket_created" | "ticket_updated" | "response_approved" | "document_uploaded" | "classification_completed";
  description: string;
  user_name: string;
  timestamp: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ total: 0, open: 0, resolved: 0, critical: 0 });
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [priorities, setPriorities] = useState<Array<{ priority: string; avg_score: number; count: number }>>([]);
  const [avgResolutionTime, setAvgResolutionTime] = useState<number | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);

      const [
        totalsData,
        categoriesData,
        prioritiesData,
        resolutionTimeData,
        ticketsData,
        approvalsData,
        activityData,
      ] = await Promise.all([
        getDashboardTotals(),
        getCategoryDistribution(),
        getPriorityDistribution(),
        getAverageResolutionTime(),
        api.get<Ticket[]>("/tickets?limit=10&sort_by=created_at&sort_order=desc"),
        api.get<PendingApproval[]>("/tickets/pending-approvals"),
        api.get<Activity[]>("/activity/recent?limit=10"),
      ]);

      setTotals(totalsData);
      setCategories(categoriesData);
      setPriorities(prioritiesData);
      setAvgResolutionTime(resolutionTimeData.average_hours);
      setRecentTickets(ticketsData);
      setPendingApprovals(approvalsData);
      setRecentActivity(activityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await fetchDashboardData();
    };
    loadData();
  }, []);

  const resolutionRate = totals.total > 0 ? (totals.resolved / totals.total) * 100 : 0;
  const aiAssistedCount = 0; // Would need a new endpoint

  // Use a fixed date for static generation to avoid new Date() during build
  const chartData = useMemo(() => [
    { date: "2024-01-15", total: totals.total, open: totals.open, resolved: totals.resolved },
  ], [totals.total, totals.open, totals.resolved]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Overview</h1>
            <p className="text-muted-foreground mt-1">Real-time snapshot of your support operations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchDashboardData} disabled={loading}>
              Refresh
            </Button>
            <Button>Export Report</Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-danger/10 border border-danger/30 p-4 text-danger" role="alert">
            {error}
            <Button variant="ghost" size="sm" className="ml-4" onClick={fetchDashboardData}>
              Retry
            </Button>
          </div>
        )}

        <DashboardKPICards
          totals={totals}
          avgResolutionTime={avgResolutionTime}
          resolutionRate={resolutionRate}
          aiAssistedCount={aiAssistedCount}
          totalTickets={totals.total}
          loading={loading}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TicketVolumeChart
            data={chartData}
            loading={loading}
          />
          <CategoryDistribution data={categories} loading={loading} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PriorityDistribution data={priorities} loading={loading} />
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Sentiment chart coming soon
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <RecentTickets tickets={recentTickets} loading={loading} />
          <PendingApprovals approvals={pendingApprovals} loading={loading} />
          <RecentActivity activities={recentActivity} loading={loading} />
        </div>
      </div>
    </DashboardLayout>
  );
}