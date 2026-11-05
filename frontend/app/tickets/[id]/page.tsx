"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatRelativeTime } from "@/lib/utils";

interface Ticket {
  ticketId: number;
  title: string;
  status: string;
  priority: string;
  category?: string;
  customer_name?: string;
  customer_email?: string;
  created_at: string;
  last_activity: string;
}

interface AIClassification {
  category: string;
  urgency: string;
  sentiment: string;
  department: string;
  confticketIdence: number;
  suggested_action: string;
}

interface AISuggestedResponse {
  response: string;
  confticketIdence: number;
  sources: Array<{ title: string; snippet: string }>;
  requiresApproval: boolean;
}

interface ApprovalResult {
  approved: boolean;
  message: string;
}

interface TimelineEvent {
  ticketId: string;
  type: "message" | "status" | "classification" | "response";
  user_name: string;
  message: string;
  timestamp: string;
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { toast } = useToast();
  const [ticketId, setTicketId] = useState<string>("");
  
  useEffect(() => {
    params.then((p) => setTicketId(p.ticketId));
  }, [params]);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [classification, setClassification] = useState<AIClassification | null>(null);
  const [suggestedResponse, setSuggestedResponse] = useState<AISuggestedResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [approvalPending, setApprovalPending] = useState(false);

  const loadTicket = useCallback(async () => {
    try {
      setLoading(true);
      const [ticketData, classificationData, timelineData, responseData] = await Promise.all([
        api.get<Ticket>(`/tickets/${ticketId}`),
        api.post<AIClassification>(`/ai/classify`, { ticketId: ticketId }),
        api.get<TimelineEvent[]>(`/activity/ticket/${ticketId}`),
        api.post<AISuggestedResponse>(`/ai/respond/${ticketId}`, {}),
      ]);

      setTicket(ticketData);
      setClassification(classificationData);
      setTimeline(timelineData);
      setSuggestedResponse(responseData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load ticket details", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTicket();
  }, [ticketId]);

  const handleApproveResponse = useCallback(async () => {
    setApprovalPending(true);
    try {
      const result = await api.post<ApprovalResult>(`/ai-response/complete`, { approved: true });
      setApprovalPending(false);
      toast({ title: "Success", description: result.message, variant: "success" });
    } catch (error) {
      setApprovalPending(false);
      toast({ title: "Error", description: "Failed to approve response", variant: "danger" });
    }
  }, []);

  const handleRejectResponse = useCallback(async () => {
    setApprovalPending(true);
    try {
      const result = await api.post<ApprovalResult>(`/ai-response/complete`, { approved: false });
      setApprovalPending(false);
      toast({ title: "Rejected", description: result.message, variant: "warning" });
    } catch (error) {
      setApprovalPending(false);
      toast({ title: "Error", description: "Failed to reject response", variant: "danger" });
    }
  }, []);

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-64 w-3/4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="grticketId grticketId-cols-1 lg:grticketId-cols-2 gap-8">
          {/* Left Panel: Customer & Conversation */}
          <div>
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grticketId grticketId-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{ticket?.customer_name || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{ticket?.customer_email || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ticket ID</p>
                  <p className="font-medium">{ticket?.ticketId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatRelativeTime(ticket?.created_at)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Conversation Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                {ticket?.last_activity ? (
                  <p className="text-sm text-muted-foreground last-activity">
                    {formatRelativeTime(ticket.last_activity)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}

                {timeline.length > 0 && (
                  <div className="space-y-3 pt-4">
                    {timeline.map((event) => (
                      <div
                        key={event.ticketId}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex-shrink-0">
                          {event.type === "message" && (
                            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          )}
                          {event.type === "status" && (
                            <svg className="h-5 w-5 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          )}
                          {event.type === "classification" && (
                            <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 6v6l4 2" />
                            </svg>
                          )}
                          {event.type === "response" && (
                            <svg className="h-5 w-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {event.user_name}: {event.message}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(event.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: AI Analysis & Response */}
          <div>
            {/* AI Classification */}
            {classification && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grticketId grticketId-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium">{classification.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Urgency</p>
                      <Badge
                        variant={classification.urgency === "Critical" ? "danger" : classification.urgency === "High" ? "warning" : "default"}
                        className="text-xs font-medium"
                      >
                        {classification.urgency}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sentiment</p>
                      <Badge
                        variant={classification.sentiment === "negative" ? "danger" : classification.sentiment === "positive" ? "success" : "default"}
                        className="text-xs font-medium"
                      >
                        {classification.sentiment}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="font-medium">{classification.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ConfticketIdence</p>
                      <div className="mt-1">
                        <div className="h-2 bg-muted rounded-full">
                          <div
                            className="h-2 rounded-full bg-primary transition-width"
                            style={{ width: `${classification.confticketIdence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground ml-2">{`${(classification.confticketIdence * 100).toFixed(0)}%`}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-gray-300">
                    {classification.suggested_action}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* AI Response Assistant */}
            <Card>
              <CardHeader>
                <CardTitle>AI Response Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                {suggestedResponse ? (
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-gray-300 mb-2">
                      {suggestedResponse.response}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSuggestedResponse(null)}
                        className="flex-1"
                        disabled={loadingResponse}
                      >
                        Regenerate
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleApproveResponse}
                        disabled={approvalPending || loadingResponse}
                      >
                        {approvalPending ? "Approving..." : "Approve & Send"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRejectResponse}
                        disabled={approvalPending || loadingResponse}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-24 p-4" />
                )}

                {!suggestedResponse && !loadingResponse && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      const res = await fetch(`/api/ai/respond/${ticketId}`);
                      const data = await res.json();
                      setSuggestedResponse(data);
                    }}
                  >
                    Generate Response
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}