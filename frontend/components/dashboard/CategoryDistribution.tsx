"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CategoryDistributionProps {
  data: Array<{ category: string; count: number }>;
  loading?: boolean;
}

const COLORS = [
  "var(--primary)",
  "var(--secondary)",
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "var(--danger)",
];

function renderPieLabel(props: { name?: string; percent?: number }) {
  const name = props.name ?? "";
  const percent = props.percent ?? 0;
  return `${name} ${(percent * 100).toFixed(0)}%`;
}

export function CategoryDistribution({ data, loading }: CategoryDistributionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tickets by Category</CardTitle>
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
          <CardTitle>Tickets by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No category data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickets by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-64">
          <ResponsiveContainer width="60%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                nameKey="category"
                label={renderPieLabel}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [value ?? 0, "Tickets"]}
              />
            </PieChart>
          </ResponsiveContainer>
          <Legend width="40%" layout="vertical" align="center" verticalAlign="middle">
            {data.map((item, index) => (
              <div key={item.category} className="flex items-center gap-2 py-1">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-foreground">{item.category}</span>
                <span className="text-sm text-muted-foreground ml-auto">
                  {item.count} ({(item.count / total * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </Legend>
        </div>
      </CardContent>
    </Card>
  );
}