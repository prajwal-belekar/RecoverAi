"use client";

import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { UserMenu } from "@/components/ui/Dropdown";
import { clearToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface TopNavProps {
  children?: ReactNode;
  className?: string;
}

const workspaces = [
  { id: "1", name: "Acme Corp", subdomain: "acme" },
  { id: "2", name: "Globex Inc", subdomain: "globex" },
];

const notifications = [
  { id: "1", title: "New ticket assigned", message: "Ticket #1234 assigned to you", time: "2m ago", read: false },
  { id: "2", title: "AI response approved", message: "Response for Ticket #1235 approved", time: "15m ago", read: false },
  { id: "3", title: "Document processed", message: "Payment Guide v2 indexed successfully", time: "1h ago", read: true },
];

export function TopNav({ className }: TopNavProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tickets/inbox?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  const handleLogout = () => {
    clearToken();
    router.replace("/auth/login");
  };

  const handleWorkspaceChange = (workspaceId: string) => {
    console.log("Switch workspace:", workspaceId);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className={cn("sticky top-0 z-30 h-16 border-b border-card-border bg-card/95 backdrop-blur", className)}>
      <div className="flex h-full items-center justify-between px-4 gap-4">
        <div className="flex-1 flex items-center gap-4 min-w-0">
          <form onSubmit={handleSearch} className="relative w-full max-w-md hidden md:block">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets, customers..."
              className="h-9 w-full rounded-lg border border-border bg-input pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-ring"
              aria-label="Search"
            />
          </form>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Workspace selector">
            <select
              value={workspaces[0].id}
              onChange={(e) => handleWorkspaceChange(e.target.value)}
              className="h-9 rounded-lg border border-border bg-input px-3 py-1 text-sm focus-ring cursor-pointer"
              aria-label="Select workspace"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-lg bg-card border border-card-border shadow-lg overflow-hidden z-50">
                <div className="flex items-center justify-between p-3 border-b border-card-border">
                  <h3 className="font-semibold">Notifications</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
                    Mark all read
                  </Button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className={cn(
                        "w-full px-3 py-3 text-left hover:bg-muted transition-colors",
                        !notification.read && "bg-muted/50"
                      )}
                      onClick={() => setShowNotifications(false)}
                    >
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </button>
                  ))}
                  {notifications.length === 0 && (
                    <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <UserMenu
            name="John Doe"
            onProfileClick={() => router.push("/settings")}
            onSettingsClick={() => router.push("/settings")}
            onLogoutClick={handleLogout}
          />
        </div>
      </div>
    </header>
  );
}