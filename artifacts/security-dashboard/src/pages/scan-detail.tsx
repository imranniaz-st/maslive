import React, { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Terminal, Activity, Clock, Server, CheckCircle, XCircle } from "lucide-react";
import { getGetScanQueryKey, useGetScan } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function ScanDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const terminalRef = useRef<HTMLDivElement>(null);
  
  const scanId = Number(id);
  const { data: scan, isLoading } = useGetScan(scanId, {
    query: {
      queryKey: getGetScanQueryKey(scanId),
      enabled: !!scanId,
      refetchInterval: (query) => {
        const state = query.state.data?.status;
        return (state === 'pending' || state === 'running') ? 2000 : false;
      }
    }
  });

  // Auto-scroll terminal to bottom when output updates
  useEffect(() => {
    if (terminalRef.current && scan?.status === 'running') {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [scan?.output, scan?.status]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        <Skeleton className="h-8 w-48 bg-secondary/50" />
        <Skeleton className="h-24 w-full bg-secondary/50" />
        <Skeleton className="flex-1 w-full bg-secondary/50 rounded-lg" />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Activity className="text-destructive mb-4" size={48} />
        <h2 className="text-xl font-bold font-mono">RECORD NOT FOUND</h2>
        <Button variant="link" className="mt-4 font-mono" onClick={() => setLocation("/scans")}>
          <ArrowLeft size={16} className="mr-2" /> RETURN TO LOGS
        </Button>
      </div>
    );
  }

  const isRunning = scan.status === 'pending' || scan.status === 'running';

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-6rem)] flex flex-col space-y-4">
      <div>
        <Button variant="link" className="text-muted-foreground p-0 h-auto font-mono text-xs hover:text-primary mb-2" onClick={() => setLocation("/scans")}>
          <ArrowLeft size={14} className="mr-1" /> BACK TO LOGS
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono flex items-center gap-2">
              <Terminal size={20} className="text-primary" />
              {scan.toolName} 
            </h1>
            <span className="text-muted-foreground font-mono">/</span>
            <span className="text-foreground font-mono text-lg">{scan.target}</span>
          </div>
          
          <Badge variant="outline" className={`font-mono text-xs px-3 py-1 uppercase ${
            scan.status === 'completed' ? 'bg-primary/20 text-primary border-primary/30' :
            scan.status === 'failed' ? 'bg-destructive/20 text-destructive border-destructive/30' :
            'bg-chart-3/20 text-chart-3 border-chart-3/30 animate-pulse'
          }`}>
            {scan.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card/50 border border-border/50 rounded p-3 flex flex-col">
          <span className="text-[10px] text-muted-foreground font-mono mb-1">TASK ID</span>
          <span className="font-mono text-sm">{scan.id}</span>
        </div>
        <div className="bg-card/50 border border-border/50 rounded p-3 flex flex-col">
          <span className="text-[10px] text-muted-foreground font-mono mb-1">STARTED</span>
          <span className="font-mono text-sm">{format(new Date(scan.createdAt), 'HH:mm:ss.SSS')}</span>
        </div>
        <div className="bg-card/50 border border-border/50 rounded p-3 flex flex-col">
          <span className="text-[10px] text-muted-foreground font-mono mb-1">DURATION</span>
          <span className="font-mono text-sm">{scan.durationMs ? `${(scan.durationMs / 1000).toFixed(2)}s` : '...'}</span>
        </div>
        <div className="bg-card/50 border border-border/50 rounded p-3 flex flex-col">
          <span className="text-[10px] text-muted-foreground font-mono mb-1">EXIT CODE</span>
          <span className={`font-mono text-sm ${scan.exitCode === 0 ? 'text-primary' : scan.exitCode ? 'text-destructive' : ''}`}>
            {scan.exitCode !== null ? scan.exitCode : '-'}
          </span>
        </div>
      </div>

      <Card className="flex-1 border-border/50 bg-[#0a0a0c] overflow-hidden flex flex-col shadow-lg shadow-black/50">
        <div className="h-8 bg-[#15151a] border-b border-border/50 flex items-center px-4 justify-between shrink-0">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-chart-3/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-primary/80"></div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
            {isRunning && <span className="animate-pulse text-chart-3 flex items-center gap-1"><Activity size={10}/> RECEIVING</span>}
            nexus@system:~$ {scan.toolName} {scan.args} {scan.target}
          </div>
        </div>
        
        <div 
          ref={terminalRef}
          className="flex-1 p-4 overflow-auto font-mono text-sm leading-relaxed text-primary/90 whitespace-pre-wrap break-all"
        >
          {scan.output ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeOutput(scan.output) }} />
          ) : (
            <div className="text-muted-foreground italic">
              {isRunning ? 'Waiting for telemetry...' : 'No output recorded.'}
            </div>
          )}
          {isRunning && <span className="inline-block w-2 h-4 bg-primary/70 animate-pulse align-middle ml-1" />}
        </div>
      </Card>
    </div>
  );
}

// Very basic sanitization to prevent raw HTML rendering issues while preserving newlines
function sanitizeOutput(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
