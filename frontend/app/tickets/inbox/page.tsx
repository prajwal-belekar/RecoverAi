"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectOption } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";

interface Ticket {
  id: number;
  title: string;
  status: string;
  priority: string;
  category?: string;
  customer_name?: string;
  created_at: string;
}

interface TicketFilters {
  status: string;
  priority: string;
  category: string;
  search: string;
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div
      key={ticket.id}
      className="rounded-lg border border-border bg-card p-4 hover:bg-card/transition-shadow"
      style={{
        borderColor: ticket.priority === "Critical" ? "var(--danger)" :
          ticket.priority === "High" ? "var(--warning)" :
          ticket.priority === "Medium" ? "var(--accent)" : "var(--success)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">
            #{ticket.id}: {ticket.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {ticket.customer_name || "Unknown customer"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-medium",
              ticket.priority === "Critical" ? "text-danger" :
                ticket.priority === "High" ? "text-warning" :
                ticket.priority === "Medium" ? "text-accent" : "text-success"
            )}
          >
            {ticket.priority}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(ticket.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-3 p-6 text-center">
      <svg className="mx-auto h-12 w-12 text-muted-foreground mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <h3 className="text-lg font-semibold text-foreground mb-2">No tickets found</h3>
      <p className="text-muted-foreground">Try adjusting your filters or search criteria</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="col-span-3 p-4 text-center">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

function Pagination({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }) {
  if (total <= pageSize) return null;
  const totalPages = Math.ceil(total / pageSize);
  return (
    <div className="my-6 flex justify-center">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        Previous
      </Button>
      <span className="mx-2">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}

export default function TicketInboxPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<TicketFilters>({
    status: "all",
    priority: "all",
    category: "all",
    search: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.priority !== "all") params.append("priority", filters.priority);
      if (filters.category !== "all") params.append("category", filters.category);
      if (debouncedSearch) params.append("search", debouncedSearch);
      params.append("_page", String(page));
      params.append("_limit", String(pageSize));

      const data = await api.get<Ticket[]>(`/tickets?${params.toString()}`);

      setTickets(data);
      setTotal(data.length);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load tickets", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.priority, filters.category, debouncedSearch, page, pageSize, toast]);

  // Initial load on mount
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadTickets();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleStatusChange = (status: string) => {
    setFilters({ ...filters, status });
    setPage(1);
  };

  const handlePriorityChange = (priority: string) => {
    setFilters({ ...filters, priority });
    setPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setFilters({ ...filters, category });
    setPage(1);
  };

  const handleSearchChange = (search: string) => {
    setFilters({ ...filters, search });
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex gap-4 mb-6">
        <button
          className="flex items-center gap-2 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" />
          </svg>
          New Ticket
        </button>

        <div className="flex items-center gap-4">
          <Select
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={[
              { value: "all", label: "All Tickets" },
              { value: "open", label: "Open" },
              { value: "pending", label: "Pending" },
              { value: "resolved", label: "Resolved" },
              { value: "critical", label: "Critical" },
              { value: "assigned", label: "Assigned to Me" },
            ]}
            placeholder="Status"
            className="w-full sm:w-48"
          />
          <Select
            value={filters.priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            options={[
              { value: "all", label: "All Priorities" },
              { value: "critical", label: "Critical" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
            placeholder="Priority"
            className="w-full sm:w-48"
          />
          <Select
            value={filters.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            options={[
              { value: "all", label: "All Categories" },
              { value: "billing", label: "Billing" },
              { value: "technical", label: "Technical" },
              { value: "account", label: "Account" },
              { value: "general", label: "General" },
            ]}
            placeholder="Category"
            className="w-full sm:w-48"
          />
          <Input
            placeholder="Search tickets, customers..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            showToggle={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tickets.length === 0 && <EmptyState />}
        {tickets.length > 0 && tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
        {loading && <LoadingState />}
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}