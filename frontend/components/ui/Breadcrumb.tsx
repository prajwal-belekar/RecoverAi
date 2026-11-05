"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const routeLabels: Record<string, string> = {
  dashboard: "Overview",
  "tickets/inbox": "Inbox",
  tickets: "All Tickets",
  "ai-insights": "AI Insights",
  "knowledge-base": "Knowledge Base",
  analytics: "Analytics",
  team: "Team",
  settings: "Settings",
};

export function Breadcrumb({ className, items }: { className?: string; items?: BreadcrumbItem[] }) {
  const pathname = usePathname();
  
  const breadcrumbs = items || generateBreadcrumbs(pathname);

  return (
    <nav className={cn("flex items-center gap-2 text-sm", className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-2">
        {breadcrumbs.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            {index > 0 && (
              <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/dashboard" }];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = segment === segments[segments.length - 1];
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  return breadcrumbs;
}