import React from "react";
import { Link } from "wouter";
import { Activity, Terminal, Shield, CheckCircle, XCircle, Clock } from "lucide-react";
import { useGetDashboardStats, useGetRecentScans, useGetToolUsage } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentScans, isLoading: scansLoading } = useGetRecentScans();
  const { data: toolUsage, isLoading: usageLoading } = useGetToolUsage();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-primary/20 text-primary border-primary/30";
      case "failed": return "bg-destructive/20 text-destructive border-destructive/30";
      case "running": return "bg-chart-3/20 text-chart-3 border-chart-3/30 animate-pulse";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="text-primary" /> System Overview
          </h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">Real-time telemetry and operation status</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Scans" value={stats?.totalScans} icon={Shield} loading={statsLoading} />
        <StatCard title="Active Operations" value={stats?.activeScans} icon={Activity} loading={statsLoading} valueClassName="text-chart-3" />
        <StatCard title="Completed" value={stats?.completedScans} icon={CheckCircle} loading={statsLoading} valueClassName="text-primary" />
        <StatCard title="Available Tools" value={stats?.totalTools} icon={Terminal} loading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tool Usage Chart */}
        <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2">
              <Terminal size={14} className="text-primary" /> TOOL USAGE METRICS
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {usageLoading ? (
              <Skeleton className="w-full h-full bg-secondary/50" />
            ) : toolUsage && toolUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toolUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="toolName" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--secondary))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {toolUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--primary))" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono text-sm border border-dashed border-border/50 rounded">
                NO DATA AVAILABLE
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2">
              <Clock size={14} className="text-primary" /> RECENT ACTIVITY
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scansLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-secondary/50" />)}
              </div>
            ) : recentScans && recentScans.length > 0 ? (
              <div className="space-y-4">
                {recentScans.slice(0, 6).map(scan => (
                  <Link key={scan.id} href={`/scans/${scan.id}`} className="block group">
                    <div className="p-3 rounded border border-border/50 bg-secondary/20 hover:bg-secondary/50 transition-colors flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{scan.toolName}</span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate max-w-[150px]" title={scan.target}>
                          {scan.target}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] uppercase font-mono px-2 py-0 h-5", getStatusColor(scan.status))}>
                        {scan.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground font-mono text-sm border border-dashed border-border/50 rounded">
                NO RECENT ACTIVITY
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, loading, valueClassName = "" }: any) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-mono tracking-wider text-muted-foreground uppercase">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 bg-secondary/50" />
            ) : (
              <p className={cn("text-3xl font-bold font-mono", valueClassName)}>{value || 0}</p>
            )}
          </div>
          <div className="p-2 bg-secondary rounded border border-border/50">
            <Icon size={18} className="text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility class included locally since we aren't using the full cn import everywhere yet
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}