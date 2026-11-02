import { api } from "./api";

export interface DashboardTotals {
  total: number;
  open: number;
  resolved: number;
  critical: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
}

export interface PriorityDistribution {
  priority: string;
  avg_score: number;
  count: number;
}

export interface SentimentDistribution {
  sentiment: string;
  count: number;
}

export interface RecurringIssue {
  issue: string;
  frequency: number;
  type: string;
}

export interface SentimentTrend {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

export interface ResponseTime {
  average_hours: number | null;
}

export interface ResolutionTime {
  average_hours: number | null;
}

export async function getDashboardTotals(): Promise<DashboardTotals> {
  return api.get<DashboardTotals>("/analytics/totals");
}

export async function getCategoryDistribution(): Promise<CategoryDistribution[]> {
  return api.get<CategoryDistribution[]>("/analytics/categories");
}

export async function getPriorityDistribution(): Promise<PriorityDistribution[]> {
  return api.get<PriorityDistribution[]>("/analytics/priorities");
}

export async function getSentimentDistribution(): Promise<SentimentDistribution[]> {
  return api.get<SentimentDistribution[]>("/analytics/sentiment");
}

export async function getRecurringIssues(limit = 5): Promise<RecurringIssue[]> {
  return api.get<RecurringIssue[]>(`/analytics/recurring?limit=${limit}`);
}

export async function getAverageResponseTime(): Promise<ResponseTime> {
  return api.get<ResponseTime>("/analytics/response-time");
}

export async function getAverageResolutionTime(): Promise<ResolutionTime> {
  return api.get<ResolutionTime>("/analytics/resolution-time");
}

export async function getSentimentTrend(days = 30): Promise<SentimentTrend[]> {
  return api.get<SentimentTrend[]>(`/analytics/sentiment-trend?days=${days}`);
}

export interface AIAssistedStats {
  ai_assisted_count: number;
  total_tickets: number;
  percentage: number;
}

export async function getAIAssistedStats(): Promise<AIAssistedStats> {
  try {
    return await api.get<AIAssistedStats>("/analytics/ai-assisted");
  } catch {
    return { ai_assisted_count: 0, total_tickets: 0, percentage: 0 };
  }
}