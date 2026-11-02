"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatRelativeTime } from "@/lib/utils";

interface Activity {
  id: string;
  type: "ticket_created" | "ticket_updated" | "response_approved" | "document_uploaded" | "classification_completed";
  description: string;
  user_name: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface RecentActivityProps {
  activities: Activity[];
  loading?: boolean;
}

const activityIcons: Record<Activity["type"], React.ReactNode> = {
  ticket_created: (
    <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  ticket_updated: (
    <svg className="h-4 w-4 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  response_approved: (
    <svg className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  document_uploaded: (
    <svg className="h-4 w-4 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  classification_completed: (
    <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
};

const activityLabels: Record<Activity["type"], string> = {
  ticket_created: "Created ticket",
  ticket_updated: "Updated ticket",
  response_approved: "Approved AI response",
  document_uploaded: "Uploaded document",
  classification_completed: "AI classification completed",
};

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">No recent activity</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-0 pt-4">
        {activities.slice(0, 10).map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-4 hover:bg-muted/50 rounded-lg transition-colors border border-card-border"
          >
            <div className="flex-shrink-0 mt-0.5">{activityIcons[activity.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">{activity.user_name}</span>{" "}
                {activityLabels[activity.type]}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{activity.description}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
              {formatRelativeTime(activity.timestamp)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}