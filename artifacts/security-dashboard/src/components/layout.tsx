import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Terminal,
  Activity,
  Clock,
  ShieldAlert,
  Cpu,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useListTools } from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
}

const CATEGORY_COLORS: Record<string, string> = {
  network: "text-cyan-400",
  web: "text-amber-400",
  password: "text-red-400",
  exploitation: "text-orange-400",
  recon: "text-purple-400",
  forensics: "text-blue-400",
  wireless: "text-pink-400",
  custom: "text-green-400",
};

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const { data: tools } = useListTools();

  const mainNav = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Scans", href: "/scans", icon: Activity },
    { name: "Cron Jobs", href: "/cron-jobs", icon: Clock },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-primary/30">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col shrink-0 relative overflow-y-auto">
        {/* Glow effect */}
        <div className="absolute top-0 left-0 w-full h-32 bg-primary/5 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="p-5 flex items-center gap-3 sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border/50">
          <div className="bg-primary/10 text-primary p-2 rounded border border-primary/20">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-widest text-primary">NEXUS</h1>
            <p className="text-[10px] text-muted-foreground font-mono uppercase">Security Ops</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {/* Main nav items */}
          {mainNav.map((item) => {
            const isActive =
              location === item.href ||
              (location.startsWith(item.href) && item.href !== "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                )}
              >
                <item.icon
                  size={15}
                  className={cn(isActive ? "text-primary" : "text-muted-foreground")}
                />
                {item.name}
              </Link>
            );
          })}

          {/* Tools section with collapsible tool list */}
          <div className="pt-1">
            <button
              onClick={() => setToolsExpanded((v) => !v)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors border",
                location.startsWith("/tools")
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"
              )}
            >
              <Terminal
                size={15}
                className={cn(
                  location.startsWith("/tools") ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="flex-1 text-left">Tools</span>
              {toolsExpanded ? (
                <ChevronDown size={13} className="opacity-60" />
              ) : (
                <ChevronRight size={13} className="opacity-60" />
              )}
            </button>

            {toolsExpanded && (
              <div className="mt-0.5 ml-3 border-l border-border/50 pl-3 space-y-0.5">
                {/* All Tools link */}
                <Link
                  href="/tools"
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors",
                    location === "/tools"
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  <Zap size={11} className="shrink-0" />
                  All Tools
                </Link>

                {/* Individual tool links */}
                {tools?.map((tool) => {
                  const isToolActive = location === `/tools/${tool.id}`;
                  return (
                    <Link
                      key={tool.id}
                      href={`/tools/${tool.id}`}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors group",
                        isToolActive
                          ? "text-primary bg-primary/10 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          isToolActive
                            ? "bg-primary"
                            : "bg-muted-foreground/40 group-hover:bg-muted-foreground/70"
                        )}
                      />
                      <span className="truncate font-mono">{tool.name}</span>
                      <span
                        className={cn(
                          "ml-auto text-[9px] uppercase tracking-wider shrink-0 hidden group-hover:block",
                          CATEGORY_COLORS[tool.category] ?? "text-muted-foreground"
                        )}
                      >
                        {tool.category}
                      </span>
                    </Link>
                  );
                })}

                {!tools && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground/50 font-mono">
                    loading...
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-border/50 sticky bottom-0 bg-card/95">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground font-mono">
            <Cpu size={11} className="text-primary/70 animate-pulse" />
            <span>SYSTEM.ONLINE</span>
            <span className="ml-auto text-primary/60">{tools?.length ?? 0} tools</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-auto relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <main className="flex-1 p-8 relative z-10">{children}</main>
      </div>
    </div>
  );
}
