"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { SkeletonTable } from "@/components/ui/Skeleton";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { getPriorityColor, getStatusColor } from "@/lib/utils";

interface Ticket {
  id: number;
  title: string;
  status: string;
  priority: string;
  category?: string;
  customer_name?: string;
  created_at: string;
}

interface RecentTicketsProps {
  tickets: Ticket[];
  loading?: boolean;
}

export function RecentTickets({ tickets, loading }: RecentTicketsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTable rows={5} />
        </CardContent>
      </Card>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">No recent tickets</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Tickets</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Ticket</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.slice(0, 5).map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    #{ticket.id}: {ticket.title}
                  </Link>
                  {ticket.category && (
                    <span className="ml-2 text-xs text-muted-foreground">({ticket.category})</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ticket.customer_name || "Unknown"}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatRelativeTime(ticket.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}