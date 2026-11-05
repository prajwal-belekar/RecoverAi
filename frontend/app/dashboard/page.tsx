"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardKPICards } from "@/components/dashboard/KPICards";
import { TicketVolumeChart } from "@/components/dashboard/TicketVolumeChart";
import { CategoryDistribution } from "@/components/dashboard/CategoryDistribution";
import { PriorityDistribution } from "@/components/dashboard/PriorityDistribution";
import { SentimentDistribution } from "@/components/dashboard/SentimentDistribution";
import { ResolutionTrendsChart } from "@/components/dashboard/ResolutionTrendsChart";
import { AIPerformanceSummary } from "@/components/dashboard/AIPerformanceSummary";
import { RecentTickets } from "@/components/dashboard/RecentTickets";
import { PendingApprovals } from "@/components/dashboard/PendingApprovals";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, EmptyActivityIcon } from "@/components/ui/EmptyState";
import {
  getDashboardTotals,
  getCategoryDistribution,
  getPriorityDistribution,
  getSentimentDistribution,
  getAverageResolutionTime,
  getResolutionTrends,
  getAIPerformanceData,
} from "@/lib/dashboardApi";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

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

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [totals, setTotals] = useState({ total: 0, open: 0, resolved: 0, critical: 0 });
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [priorities, setPriorities] = useState<{ priority: string; avg_score: number; count: number }[]>([]);
  const [sentiments, setSentiments] = useState<{ sentiment: string; count: number }[]>([]);
  const [avgResolutionTime, setAvgResolutionTime] = useState<number | null>(null);
  const [resolutionTrends, setResolutionTrends] = useState<{ date: string; created: number; resolved: number }[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [aiPerformance, setAIPerformance] = useState<{
    aiClassifiedTickets: number;
    totalTickets: number;
    aiAssistedResponses: number;
    humanApprovalRate: number;
    aiResponseAcceptanceRate: number;
    avgConfidence: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Callback declared before useEffect
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const days = dateRange.from && dateRange.to
        ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
        : 30;

      const [
        totalsData,
        categoriesData,
        prioritiesData,
        sentimentsData,
        resolutionTimeData,
        resolutionTrendsData,
        ticketsData,
        approvalsData,
        activityData,
        aiPerformanceData,
      ] = await Promise.all([
        getDashboardTotals(),
        getCategoryDistribution(),
        getPriorityDistribution(),
        getSentimentDistribution(),
        getAverageResolutionTime(),
        getResolutionTrends(days),
        api.get<Ticket[]>("/tickets?limit=10&sort_by=created_at&sort_order=desc"),
        api.get<PendingApproval[]>("/tickets/pending-approvals"),
        api.get<Activity[]>("/activity/recent?limit=10"),
        getAIPerformanceData(),
      ]);

      setTotals(totalsData);
      setCategories(categoriesData);
      setPriorities(prioritiesData);
      setSentiments(sentimentsData);
      setAvgResolutionTime(resolutionTimeData.average_hours);
      setResolutionTrends(resolutionTrendsData);
      setRecentTickets(ticketsData);
      setPendingApprovals(approvalsData);
      setRecentActivity(activityData);
      setAIPerformance(aiPerformanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      toast({ title: "Error", description: "Failed to load dashboard data", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Initial data fetch on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // Re-fetch when date range changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [dateRange, fetchDashboardData]);

  // Calculate volume chart data from resolution trends after data is fetched
  const volumeChartData = resolutionTrends.length > 0
    ? resolutionTrends.map((d) => ({
        date: d.date,
        total: d.created + d.resolved,
        open: d.created,
        resolved: d.resolved,
      }))
    : [
        { date: "2024-01-15", total: totals.total, open: totals.open, resolved: totals.resolved }
      ];

  const resolutionRate = totals.total > 0 ? (totals.resolved / totals.total) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Overview</h1>
            <p className="text-muted-foreground mt-1">Real-time snapshot of your support operations</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeFilter onChange={handleDateRangeChange} />
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
          aiAssistedCount={aiPerformance?.aiAssistedResponses ?? 0}
          totalTickets={totals.total}
          loading={loading}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TicketVolumeChart data={volumeChartData} loading={loading} />
          <CategoryDistribution data={categories} loading={loading} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PriorityDistribution data={priorities} loading={loading} />
          <SentimentDistribution data={sentiments} loading={loading} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ResolutionTrendsChart data={resolutionTrends} loading={loading} />
          <AIPerformanceSummary data={aiPerformance} loading={loading} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <RecentTickets tickets={recentTickets} loading={loading} />
          <PendingApprovals approvals={pendingApprovals} loading={loading} />
          {recentActivity.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={<EmptyActivityIcon />}
                  title="No recent activity"
                  description="Activity will appear here as your team works on tickets"
                />
              </CardContent>
            </Card>
          ) : (
            <RecentActivity activities={recentActivity} loading={loading} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}