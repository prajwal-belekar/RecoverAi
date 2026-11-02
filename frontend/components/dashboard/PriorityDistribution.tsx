"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

interface PriorityDistributionProps {
  data: Array<{ priority: string; avg_score: number; count: number }>;
  loading?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "var(--danger)",
  High: "var(--warning)",
  Medium: "var(--accent)",
  Low: "var(--success)",
};

const PRIORITY_ORDER = ["Critical", "High", "Medium", "Low"];

export function PriorityDistribution({ data, loading }: PriorityDistributionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tickets by Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tickets by Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No priority data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickets by Priority</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                formatter={(value: any, name: any) => [value ?? 0, name === "count" ? "Tickets" : "Avg Score"]}
              />
              <Legend />
              <Bar
                dataKey="count"
                name="Tickets"
                radius={[4, 4, 0, 0]}
                fill="var(--primary)"
              >
                {sortedData.map((item, index) => (
                  <Cell key={`bar-${index}`} fill={PRIORITY_COLORS[item.priority] || "var(--primary)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}