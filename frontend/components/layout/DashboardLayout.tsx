"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className={cn("min-h-screen bg-background flex", className)}>
      <Sidebar onToggle={() => setIsMobileSidebarOpen(false)} isMobileOpen={isMobileSidebarOpen} />
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <TopNav onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}