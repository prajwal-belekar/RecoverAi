"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { SVGProps } from "react";
import { Tooltip } from "@/components/ui/Tooltip";

interface SidebarProps {
  className?: string;
  onToggle?: () => void;
  isMobileOpen?: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  badge?: string;
}

const navigation: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: OverviewIcon },
  { name: "Inbox", href: "/tickets/inbox", icon: InboxIcon },
  { name: "All Tickets", href: "/tickets", icon: TicketsIcon },
  { name: "AI Insights", href: "/ai-insights", icon: InsightsIcon },
  { name: "Knowledge Base", href: "/knowledge-base", icon: KnowledgeIcon },
  { name: "Analytics", href: "/analytics", icon: AnalyticsIcon },
];

const management: NavItem[] = [
  { name: "Team", href: "/team", icon: TeamIcon },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("sidebar-collapsed");
  return saved === "true";
}

export function Sidebar({ className, onToggle, isMobileOpen = false }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);
  const mobileOpenRef = useRef(isMobileOpen);

  useEffect(() => {
    mobileOpenRef.current = isMobileOpen;
  }, [isMobileOpen]);

  const toggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem("sidebar-collapsed", String(newValue));
    onToggle?.();
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onToggle?.();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => onToggle?.()}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full border-r border-sidebar-border bg-sidebar transition-all duration-200 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-[256px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-full flex-col">
          {/* Logo Section */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
            <Link href="/dashboard" className="flex items-center gap-3" aria-label="ResolveAI Home">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <OverviewIcon className="h-5 w-5 text-white" />
              </div>
              {!isCollapsed && (
                <span className="font-semibold text-lg text-foreground truncate">ResolveAI</span>
              )}
            </Link>
            {!isCollapsed && (
              <button
                onClick={toggleCollapse}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!isCollapsed}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isCollapsed ? (
                    <polyline points="9 18 15 12 9 6" />
                  ) : (
                    <polyline points="15 18 9 12 15 6" />
                  )}
                </svg>
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3 overflow-y-auto" aria-label="Sidebar navigation">
            <NavSection title="WORKSPACE" items={navigation} pathname={pathname} isCollapsed={isCollapsed} onNavClick={handleNavClick} />
            <NavSection title="MANAGEMENT" items={management} pathname={pathname} isCollapsed={isCollapsed} onNavClick={handleNavClick} />
          </nav>

          {/* Workspace Selector & User Profile */}
          <div className="p-3 border-t border-sidebar-border space-y-3">
            {/* Workspace Selector */}
            <WorkspaceSelector isCollapsed={isCollapsed} />

            {/* User Profile */}
            <UserProfile isCollapsed={isCollapsed} />

            {/* Collapse Toggle (when collapsed) */}
            {isCollapsed && (
              <button
                onClick={toggleCollapse}
                className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
                aria-label="Expand sidebar"
                aria-expanded={false}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function NavSection({
  title,
  items,
  pathname,
  isCollapsed,
  onNavClick,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  isCollapsed: boolean;
  onNavClick: () => void;
}) {
  return (
    <div className="space-y-1">
      {!isCollapsed && (
        <h3 className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Tooltip key={item.name} content={item.name} position="right" disabled={!isCollapsed}>
            <Link
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isCollapsed && "justify-center px-2"
              )}
              aria-current={isActive ? "page" : undefined}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
              {item.badge && !isCollapsed && (
                <span className="ml-auto rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">
                  {item.badge}
                </span>
              )}
            </Link>
          </Tooltip>
        );
      })}
    </div>
  );
}

function WorkspaceSelector({ isCollapsed }: { isCollapsed: boolean }) {
  const workspaces = [
    { id: "1", name: "Acme Corp", subdomain: "acme" },
    { id: "2", name: "Globex Inc", subdomain: "globex" },
  ];

  if (isCollapsed) {
    return (
      <Tooltip content="Workspace" position="right">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mx-auto">
          <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-1">
      <label htmlFor="workspace-select" className="block px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Workspace
      </label>
      <select
        id="workspace-select"
        value={workspaces[0].id}
        onChange={(e) => console.log("Switch workspace:", e.target.value)}
        className="w-full h-9 rounded-lg border border-border bg-input px-3 py-1 text-sm focus-ring cursor-pointer"
        aria-label="Select workspace"
      >
        {workspaces.map((ws) => (
          <option key={ws.id} value={ws.id}>
            {ws.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function UserProfile({ isCollapsed }: { isCollapsed: boolean }) {
  const user = { name: "John Doe", email: "john@acme.com", role: "Admin" };

  if (isCollapsed) {
    return (
      <Tooltip content={user.name} position="right">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary font-medium mx-auto">
          {user.name.charAt(0).toUpperCase()}
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary font-medium">
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
    </div>
  );
}

// Icon Components
function OverviewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function InboxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <polyline points="22 6 12 13 2 6" />
    </svg>
  );
}

function TicketsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function InsightsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function KnowledgeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function AnalyticsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function TeamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}