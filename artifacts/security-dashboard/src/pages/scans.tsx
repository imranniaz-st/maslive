import React, { useState } from "react";
import { Link } from "wouter";
import { Activity, Search, Filter, Terminal, Trash2, ArrowRight } from "lucide-react";
import { useListScans, useDeleteScan, ListScansStatus } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Scans() {
  const [statusFilter, setStatusFilter] = useState<ListScansStatus | "all">("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: scans, isLoading, refetch } = useListScans(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  
  const deleteScan = useDeleteScan();

  const filteredScans = scans?.filter(s => 
    s.target.toLowerCase().includes(search.toLowerCase()) || 
    s.toolName.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-primary/20 text-primary border-primary/30";
      case "failed": return "bg-destructive/20 text-destructive border-destructive/30";
      case "running": return "bg-chart-3/20 text-chart-3 border-chart-3/30 animate-pulse";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this scan record permanently?")) return;
    
    try {
      await deleteScan.mutateAsync({ id });
      toast({ title: "Record deleted", className: "bg-background border-border text-foreground" });
      refetch();
    } catch (err) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="text-primary" /> Operations Log
          </h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">Review historical scan telemetry</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder="Search targets or tools..." 
            className="pl-9 font-mono bg-card/50 border-border/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select 
          value={statusFilter as string} 
          onValueChange={(v) => setStatusFilter(v as any)}
        >
          <SelectTrigger className="w-[180px] font-mono bg-card/50 border-border/50">
            <Filter size={14} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL STATUSES</SelectItem>
            <SelectItem value="completed">COMPLETED</SelectItem>
            <SelectItem value="failed">FAILED</SelectItem>
            <SelectItem value="running">RUNNING</SelectItem>
            <SelectItem value="pending">PENDING</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card/30 border border-border/50 rounded-lg overflow-hidden backdrop-blur">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 bg-secondary/30 text-xs font-mono text-muted-foreground">
          <div className="col-span-2">TIMESTAMP</div>
          <div className="col-span-2">TOOL</div>
          <div className="col-span-3">TARGET</div>
          <div className="col-span-2">STATUS</div>
          <div className="col-span-2">DURATION</div>
          <div className="col-span-1 text-right">ACTION</div>
        </div>

        <div className="divide-y divide-border/30">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 p-4 items-center">
                <Skeleton className="col-span-2 h-4 bg-secondary/50" />
                <Skeleton className="col-span-2 h-4 bg-secondary/50" />
                <Skeleton className="col-span-3 h-4 bg-secondary/50" />
                <Skeleton className="col-span-2 h-6 bg-secondary/50 rounded-full" />
                <Skeleton className="col-span-2 h-4 bg-secondary/50" />
              </div>
            ))
          ) : filteredScans && filteredScans.length > 0 ? (
            filteredScans.map(scan => (
              <Link key={scan.id} href={`/scans/${scan.id}`} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-secondary/20 transition-colors group cursor-pointer">
                <div className="col-span-2 font-mono text-xs text-muted-foreground">
                  {format(new Date(scan.createdAt), 'yy/MM/dd HH:mm')}
                </div>
                <div className="col-span-2 font-mono text-sm flex items-center gap-2">
                  <Terminal size={14} className="text-primary/70" />
                  {scan.toolName}
                </div>
                <div className="col-span-3 font-mono text-sm truncate" title={scan.target}>
                  {scan.target}
                </div>
                <div className="col-span-2">
                  <Badge variant="outline" className={`font-mono text-[10px] uppercase ${getStatusColor(scan.status)}`}>
                    {scan.status}
                  </Badge>
                </div>
                <div className="col-span-2 font-mono text-xs text-muted-foreground">
                  {scan.durationMs ? `${(scan.durationMs / 1000).toFixed(1)}s` : '-'}
                </div>
                <div className="col-span-1 flex justify-end items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity" onClick={(e) => handleDelete(scan.id, e)}>
                    <Trash2 size={14} />
                  </Button>
                  <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))
          ) : (
            <div className="p-12 text-center text-muted-foreground font-mono">
              NO RECORDS FOUND
            </div>
          )}
        </div>
      </div>
    </div>
  );
}