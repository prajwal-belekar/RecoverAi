"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";

interface InsightStats {
  totalTickets: number;
  resolvedTickets: number;
  negativeSentimentRate: number;
  repeatedPaymentCount: number;
}

interface TrendPoint {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

interface TotalsResponse {
  total: number;
  open: number;
  resolved: number;
  critical: number;
}

interface SentimentTrendResponse {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

interface RecurringIssue {
  issue: string;
  frequency: number;
  type: string;
}

export default function AIInsightsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InsightStats | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [recurringIssues, setRecurringIssues] = useState<RecurringIssue[]>([]);

  const loadInsights = useCallback(async () => {
    try {
      setLoading(true);
      const [
        totalsData,
        sentimentTrendData,
        recurringData,
      ] = await Promise.all([
        api.get<TotalsResponse>("/analytics/totals"),
        api.get<SentimentTrendResponse[]>(`/analytics/sentiment-trend?days=30`),
        api.get<RecurringIssue[]>(`/analytics/recurring?limit=5`),
      ]);

      // Calculate negative sentiment rate
      const totalSentiment = sentimentTrendData.reduce((sum, d) => sum + d.positive + d.negative + d.neutral, 0);
      const totalNegative = sentimentTrendData.reduce((sum, d) => sum + d.negative, 0);
      const negativeSentimentRate = totalSentiment > 0 ? (totalNegative / totalSentiment) * 100 : 0;

      // Find repeated payment failures from recurring issues
      const paymentIssue = recurringData.find(r => r.issue.toLowerCase().includes("billing") || r.issue.toLowerCase().includes("payment"));
      const repeatedPaymentCount = paymentIssue ? paymentIssue.frequency : 0;

      setStats({
        totalTickets: totalsData.total,
        resolvedTickets: totalsData.resolved,
        negativeSentimentRate,
        repeatedPaymentCount,
      });
      setTrends(sentimentTrendData);
      setRecurringIssues(recurringData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load AI insights", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInsights();
  }, []);

  const statsData = stats ? (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Total Tickets</p>
        <p className="font-medium">{stats.totalTickets.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Resolved Tickets</p>
        <p className="font-medium">{stats.resolvedTickets.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Negative Sentiment Rate</p>
        <p className="font-medium">{stats.negativeSentimentRate.toFixed(1)}%</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Repeated Payment Failures</p>
        <p className="font-medium">{stats.repeatedPaymentCount.toLocaleString()}</p>
      </div>
    </div>
  ) : (
    <div className="p-8 text-center text-muted-foreground">
      <Skeleton className="h-8 w-8 mb-4" />
      <p>Loading insights data...</p>
    </div>
  );

  const trendData = trends.length > 0 ? trends : [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">AI Insights</h1>
          <p className="text-muted-foreground mt-1">Automated issue pattern recognition and corrective action recommendations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statsData}

          <div>
            <h3 className="text-semibold text-foreground">Sentiment Trends</h3>
            <div className="mt-4">
              {trends.length > 0 ? (
                <div className="space-y-2">
      {trends.map((trend, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm text-zinc-600 dark:text-gray-300">
            {format(new Date(trend.date), "MMM dd, yyyy")}
          </span>
          <div className="flex gap-2">
            <Badge variant="success" className="h-3 w-3 text-success" />
            <span className="text-xs text-muted-foreground">Positive: {trend.positive}</span>
            <Badge variant="danger" className="h-3 w-3 text-danger" />
            <span className="text-xs text-muted-foreground">Negative: {trend.negative}</span>
            <Badge variant="default" className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Neutral: {trend.neutral}</span>
          </div>
        </div>
      ))}
                </div>
              ) : (
                <div className="h-6 w-3/4">
                  <Skeleton />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}