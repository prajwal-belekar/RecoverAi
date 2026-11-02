import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "In Progress": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    Resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    Closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400",
    Pending: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  };
  return colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    Critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    High: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    Low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  };
  return colors[priority] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
}

export function getSentimentColor(sentiment: string): string {
  const colors: Record<string, string> = {
    positive: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    negative: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    neutral: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400",
  };
  return colors[sentiment] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400";
}