"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { UserMenu } from "@/components/ui/Dropdown";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { clearToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: string;
}

interface TopNavProps {
  className?: string;
  onMenuClick?: () => void;
}

const notifications = [
  { id: "1", title: "New ticket assigned", message: "Ticket #1234 assigned to you", time: "2m ago", read: false, type: "ticket" },
  { id: "2", title: "AI response approved", message: "Response for Ticket #1235 approved", time: "15m ago", read: false, type: "approval" },
  { id: "3", title: "Document processed", message: "Payment Guide v2 indexed successfully", time: "1h ago", read: true, type: "document" },
];

const helpItems = [
  { label: "Documentation", href: "https://docs.resolveai.com", icon: DocIcon },
  { label: "Keyboard Shortcuts", href: "#", icon: ShortcutIcon },
  { label: "Send Feedback", href: "#", icon: FeedbackIcon },
  { label: "Contact Support", href: "mailto:support@resolveai.com", icon: SupportIcon },
];

export function TopNav({ className, onMenuClick }: TopNavProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Fetch notifications from backend
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/v1/activity/recent?limit=5");
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.map((item: { id: string; type: string; message: string; timestamp: string }) => ({
            id: item.id,
            title: item.type === "classification" ? "AI Classification" : "New Activity",
            message: item.message,
            time: formatRelativeTime(item.timestamp),
            read: true,
            type: item.type,
          })));
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };
    fetchNotifications();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tickets/inbox?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setShowSearchResults(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.replace("/auth/login");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mock search results
  const searchResults = searchQuery.length > 1 ? [
    { id: "1", type: "ticket", title: "Payment failure on checkout", subtitle: "Ticket #1234 \u2022 High Priority", href: "/tickets/1234" },
    { id: "2", type: "ticket", title: "Login issue with SSO", subtitle: "Ticket #1235 \u2022 Medium Priority", href: "/tickets/1235" },
    { id: "3", type: "customer", title: "Jane Smith", subtitle: "Customer \u2022 jane@example.com", href: "/customers/jane-smith" },
  ] : [];

  return (
    <header className={cn("sticky top-0 z-30 h-16 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80", className)}>
      <div className="flex h-full items-center justify-between px-4 gap-4">
        {/* Left: Mobile menu toggle + Breadcrumbs + Search */}
        <div className="flex-1 flex items-center gap-4 min-w-0">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuClick}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
            aria-label="Open menu"
            aria-expanded={false}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Breadcrumbs */}
          <Breadcrumb className="hidden md:flex" />

          {/* Global Search */}
          <div className="relative w-full max-w-md hidden md:block" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowSearchResults(searchQuery.length > 1)}
                  placeholder="Search tickets, customers, docs... (\u2318K)"
                  className="h-9 w-full rounded-lg border border-border bg-input pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-ring"
                  aria-label="Global search"
                  aria-controls="search-results"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <kbd className="absolute right-10 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-1.5 text-xs text-muted-foreground">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span>\u2318K</span>
              </kbd>
            </form>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div id="search-results" className="absolute top-full left-0 right-0 mt-2 w-full rounded-lg bg-card border border-border shadow-lg overflow-hidden z-50 animate-in">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                  Results
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {searchResults.map((result) => (
                    <a
                      key={result.id}
                      href={result.href}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        {result.type === "ticket" ? (
                          <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                    </a>
                  ))}
                  <a
                    href={`/tickets/inbox?search=${encodeURIComponent(searchQuery)}`}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary hover:bg-muted transition-colors border-t border-border"
                  >
                    View all results
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </a>
                </div>
              </div>
            )}

            {showSearchResults && searchQuery.length > 1 && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 w-full rounded-lg bg-card border border-border shadow-lg overflow-hidden z-50 animate-in p-6 text-center">
                <EmptySearchIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No results for &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Notifications, Help, User Menu */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
              aria-expanded={showNotifications}
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
              <div className="absolute right-0 mt-2 w-80 rounded-lg bg-card border border-border shadow-lg overflow-hidden z-50 animate-in">
                <div className="flex items-center justify-between p-3 border-b border-border">
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
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {notification.type === "message" && (
                            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          )}
                          {notification.type === "classification" && (
                            <svg className="h-5 w-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                          )}
                          {notification.type === "approval" && (
                            <svg className="h-5 w-5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          )}
                          {!["message", "classification", "approval"].includes(notification.type) && (
                            <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 16v-4M12 8h.01" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {notifications.length === 0 && (
                    <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Help */}
          <div className="relative" ref={helpRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHelp(!showHelp)}
              aria-label="Help"
              aria-expanded={showHelp}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </Button>

            {showHelp && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg bg-card border border-border shadow-lg overflow-hidden z-50 animate-in">
                <div className="p-2">
                  {helpItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      onClick={() => setShowHelp(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
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

// Helper Icons
function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function ShortcutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M8 16h8" />
    </svg>
  );
}

function FeedbackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.514 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function SupportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function EmptySearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}