"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { cn } from "@/lib/utils";

interface SupportMetrics {
  totalTickets: number;
  resolvedTickets: number;
  unresolvedTickets: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}

interface AIPerformanceMetrics {
  aiClassifiedTickets: number;
  totalTickets: number;
  aiAssistedResponses: number;
  humanApprovalRate: number;
  aiResponseAcceptanceRate: number;
  avgConfidence: number;
}

interface CategoryData {
  category: string;
  count: number;
}

interface PriorityData {
  priority: string;
  count: number;
}

interface SentimentData {
  sentiment: string;
  count: number;
}

interface TrendPoint {
  date: string;
  created: number;
  resolved: number;
  positive?: number;
  negative?: number;
  neutral?: number;
}

interface AITrendPoint {
  date: string;
  classified: number;
  assisted: number;
  approved: number;
}

// Formatter for Tooltip
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ticketFormatter = (value: number | undefined) => [value ?? 0, "Tickets"] as any;

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [supportMetrics, setSupportMetrics] = useState<SupportMetrics | null>(null);
  const [aiMetrics, setAIMetrics] = useState<AIPerformanceMetrics | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [priorities, setPriorities] = useState<PriorityData[]>([]);
  const [sentiments, setSentiments] = useState<SentimentData[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [aiTrends, setAITrends] = useState<AITrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const days = dateRange.from && dateRange.to
        ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
        : 30;

      const [
        totalsData,
        categoriesData,
        prioritiesData,
        sentimentsData,
        responseTimeData,
        resolutionTimeData,
        resolutionTrendsData,
        sentimentTrendsData,
        aiPerformanceData,
        aiTrendsData,
      ] = await Promise.all([
        api.get<{ total: number; open: number; resolved: number; critical: number }>("/analytics/totals"),
        api.get<CategoryData[]>("/analytics/categories"),
        api.get<{ priority: string; count: number }[]>("/analytics/priorities"),
        api.get<{ sentiment: string; count: number }[]>("/analytics/sentiment"),
        api.get<{ average_hours: number | null }>("/analytics/response-time"),
        api.get<{ average_hours: number | null }>("/analytics/resolution-time"),
        api.get<{ date: string; created: number; resolved: number }[]>(`/analytics/resolution-trends?days=${days}`),
        api.get<{ date: string; positive: number; negative: number; neutral: number }[]>(`/analytics/sentiment-trend?days=${days}`),
        api.get<AIPerformanceMetrics>("/analytics/ai-performance"),
        api.get<AITrendPoint[]>(`/analytics/ai-trends?days=${days}`),
      ]);

      setSupportMetrics({
        totalTickets: totalsData.total,
        resolvedTickets: totalsData.resolved,
        unresolvedTickets: totalsData.total - totalsData.resolved,
        avgResponseTime: responseTimeData.average_hours ?? 0,
        avgResolutionTime: resolutionTimeData.average_hours ?? 0,
      });
      setCategories(categoriesData);
      setPriorities(prioritiesData);
      setSentiments(sentimentsData);
      // Map resolution trends to TrendPoint format
      setTrends(resolutionTrendsData.map((d) => ({
        date: d.date,
        created: d.created,
        resolved: d.resolved,
        positive: 0,
        negative: 0,
        neutral: 0,
      })));
      setAITrends(aiTrendsData);
      setAIMetrics(aiPerformanceData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load analytics data", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAnalytics();
  }, [loadAnalytics]);

  const totalTickets = supportMetrics?.totalTickets ?? 0;
  const resolvedTickets = supportMetrics?.resolvedTickets ?? 0;
  const unresolvedTickets = supportMetrics?.unresolvedTickets ?? 0;
  const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

  const categoryTotal = categories.reduce((sum, c) => sum + c.count, 0);
  const priorityTotal = priorities.reduce((sum, p) => sum + p.count, 0);
  const sentimentTotal = sentiments.reduce((sum, s) => sum + s.count, 0);

  const PRIORITY_COLORS: Record<string, string> = {
    Critical: "var(--danger)",
    High: "var(--warning)",
    Medium: "var(--accent)",
    Low: "var(--success)",
  };

  const SENTIMENT_COLORS: Record<string, string> = {
    positive: "var(--success)",
    negative: "var(--danger)",
    neutral: "var(--warning)",
  };

  const CATEGORY_COLORS = [
    "var(--primary)",
    "var(--secondary)",
    "var(--accent)",
    "var(--success)",
    "var(--warning)",
    "var(--danger)",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Detailed insights into support operations and AI performance</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeFilter onChange={handleDateRangeChange} />
            <Button variant="outline" onClick={loadAnalytics} disabled={loading}>
              Refresh
            </Button>
            <Button>Export Report</Button>
          </div>
        </div>

        {/* Support Performance KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{totalTickets.toLocaleString()}</p>
                </div>
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resolved Tickets</p>
                  <p className="mt-2 text-3xl font-bold text-success">{resolvedTickets.toLocaleString()}</p>
                </div>
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unresolved Tickets</p>
                  <p className="mt-2 text-3xl font-bold text-danger">{unresolvedTickets.toLocaleString()}</p>
                </div>
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{supportMetrics?.avgResponseTime?.toFixed(1) ?? 0}h</p>
                </div>
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resolution Rate</p>
                  <p className="mt-2 text-3xl font-bold text-primary">{resolutionRate.toFixed(1)}%</p>
                </div>
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Performance KPIs */}
        <Card>
          <CardHeader>
            <CardTitle>AI Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm font-medium text-muted-foreground">AI Classification Rate</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {aiMetrics && aiMetrics.totalTickets > 0 ? ((aiMetrics.aiClassifiedTickets / aiMetrics.totalTickets) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {aiMetrics?.aiClassifiedTickets ?? 0} of {aiMetrics?.totalTickets ?? 0} tickets
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm font-medium text-muted-foreground">AI-Assisted Responses</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{aiMetrics?.aiAssistedResponses ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Responses generated by AI</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm font-medium text-muted-foreground">Human Approval Rate</p>
                <p className="mt-1 text-2xl font-bold text-success">
                  {aiMetrics?.humanApprovalRate?.toFixed(1) ?? 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">AI responses approved by agents</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm font-medium text-muted-foreground">AI Acceptance Rate</p>
                <p className="mt-1 text-2xl font-bold text-warning">
                  {aiMetrics?.aiResponseAcceptanceRate?.toFixed(1) ?? 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Approved responses sent to customers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Volume (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), "MMM dd")}
                      className="text-xs"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      className="text-xs"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "var(--foreground)" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="created"
                      name="Created"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      name="Resolved"
                      stroke="var(--success)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Activity Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aiTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), "MMM dd")}
                      className="text-xs"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      className="text-xs"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "var(--foreground)" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="classified"
                      name="AI Classified"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="assisted"
                      name="AI Assisted"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="approved"
                      name="Approved"
                      stroke="var(--success)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tickets by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="category"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categories.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={ticketFormatter as any}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Legend width="40%" layout="vertical" align="center" verticalAlign="middle">
                  {categories.map((item, index) => (
                    <div key={item.category} className="flex items-center gap-2 py-1">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-sm text-foreground">{item.category}</span>
                      <span className="text-sm text-muted-foreground ml-auto">
                        {item.count} ({(item.count / categoryTotal * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </Legend>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorities} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis
                      dataKey="priority"
                      className="text-xs"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      className="text-xs"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={ticketFormatter as any}
                    />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="Tickets"
                      radius={[4, 4, 0, 0]}
                      fill="var(--primary)"
                    >
                      {priorities.map((item, index) => (
                        <Cell key={`bar-${index}`} fill={PRIORITY_COLORS[item.priority] || "var(--primary)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentiments}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="sentiment"
                      label={({ name, percent }) => `${(name ?? "").charAt(0).toUpperCase() + (name ?? "").slice(1)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {sentiments.map((item, index) => (
                        <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[item.sentiment] || CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={ticketFormatter as any}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Legend width="40%" layout="vertical" align="center" verticalAlign="middle">
                  {sentiments.map((item, index) => (
                    <div key={item.sentiment} className="flex items-center gap-2 py-1">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: SENTIMENT_COLORS[item.sentiment] || CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-sm text-foreground capitalize">{item.sentiment}</span>
                      <span className="text-sm text-muted-foreground ml-auto">
                        {item.count} ({(item.count / sentimentTotal * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </Legend>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sentiment Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), "MMM dd")}
                      className="text-xs"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      className="text-xs"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "var(--foreground)" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="positive"
                      name="Positive"
                      stroke="var(--success)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="negative"
                      name="Negative"
                      stroke="var(--danger)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="neutral"
                      name="Neutral"
                      stroke="var(--warning)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}