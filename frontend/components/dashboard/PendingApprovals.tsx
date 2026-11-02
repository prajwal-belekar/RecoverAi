"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { getPriorityColor, getStatusColor } from "@/lib/utils";

interface PendingApproval {
  id: number;
  ticket_id: number;
  ticket_title: string;
  ticket_status: string;
  ticket_priority: string;
  ai_confidence: number;
  created_at: string;
}

interface PendingApprovalsProps {
  approvals: PendingApproval[];
  loading?: boolean;
}

export function PendingApprovals({ approvals, loading }: PendingApprovalsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">No pending approvals</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pending Approvals</CardTitle>
        <span className="text-sm text-muted-foreground">{approvals.length} pending</span>
      </CardHeader>
      <CardContent className="space-y-3 p-0 pt-4">
        {approvals.slice(0, 5).map((approval) => (
          <Link
            key={approval.id}
            href={`/tickets/${approval.ticket_id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg transition-colors border border-card-border"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                #{approval.ticket_id}: {approval.ticket_title}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <Badge variant="outline" className={getStatusColor(approval.ticket_status)}>
                  {approval.ticket_status}
                </Badge>
                <Badge variant="outline" className={getPriorityColor(approval.ticket_priority)}>
                  {approval.ticket_priority}
                </Badge>
                <span className="text-muted-foreground">
                  AI Confidence: {(approval.ai_confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <span className="text-sm text-muted-foreground ml-4 whitespace-nowrap">
              {formatRelativeTime(approval.created_at)}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}