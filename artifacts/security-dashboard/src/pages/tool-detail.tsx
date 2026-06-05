import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Play, Terminal, ChevronRight, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import {
  getGetScanQueryKey,
  getGetToolQueryKey,
  useCreateScan,
  useGetScan,
  useGetTool,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function ToolDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const toolId = Number(id);
  const { data: tool, isLoading: toolLoading } = useGetTool(toolId, {
    query: { queryKey: getGetToolQueryKey(toolId), enabled: !!toolId },
  });
  const createScan = useCreateScan();

  const [target, setTarget] = useState("");
  const [args, setArgs] = useState("");
  const [activeScanId, setActiveScanId] = useState<number | null>(null);

  // Poll scan status if we just started one
  const { data: scan } = useGetScan(activeScanId!, { 
    query: { 
      queryKey: getGetScanQueryKey(activeScanId!),
      enabled: !!activeScanId,
      refetchInterval: (query) => {
        const state = query.state.data?.status;
        return (state === 'pending' || state === 'running') ? 2000 : false;
      }
    } 
  });

  useEffect(() => {
    if (tool?.defaultArgs && !args) {
      setArgs(tool.defaultArgs);
    }
  }, [tool]);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) {
      toast({ title: "Target required", variant: "destructive" });
      return;
    }

    try {
      const result = await createScan.mutateAsync({
        data: {
          toolId,
          target,
          args
        }
      });
      setActiveScanId(result.id);
      toast({ title: "Scan initiated", description: `Task #${result.id} started successfully.` });
    } catch (err) {
      toast({ title: "Failed to start scan", variant: "destructive" });
    }
  };

  if (toolLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32 bg-secondary/50" />
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3 bg-secondary/50" />
            <Skeleton className="h-24 w-full bg-secondary/50" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="text-destructive mb-4" size={48} />
        <h2 className="text-xl font-bold font-mono">TOOL NOT FOUND</h2>
        <Button variant="link" className="mt-4 font-mono" onClick={() => setLocation("/tools")}>
          <ArrowLeft size={16} className="mr-2" /> RETURN TO ARSENAL
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Button variant="link" className="text-muted-foreground p-0 h-auto font-mono text-xs hover:text-primary mb-4" onClick={() => setLocation("/tools")}>
          <ArrowLeft size={14} className="mr-1" /> BACK TO ARSENAL
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded border border-border/50">
              <Terminal size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-mono">{tool.name}</h1>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="font-mono text-[10px] bg-background">
                  {tool.category.toUpperCase()}
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary border border-border/50">
                  {tool.command}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2">
                <ChevronRight size={14} className="text-primary" /> EXECUTION PARAMETERS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRun} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="target" className="font-mono text-xs text-muted-foreground">TARGET (IP / DOMAIN / SUBNET)</Label>
                  <Input 
                    id="target" 
                    placeholder="e.g. 192.168.1.1 or example.com" 
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="font-mono bg-background border-border/50 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="args" className="font-mono text-xs text-muted-foreground">ARGUMENTS</Label>
                  <Input 
                    id="args" 
                    placeholder="Optional flags..." 
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    className="font-mono bg-background border-border/50 focus-visible:ring-primary"
                  />
                </div>
                
                <div className="pt-4 flex items-center gap-4">
                  <Button 
                    type="submit" 
                    className="font-mono gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={createScan.isPending || !target}
                  >
                    {createScan.isPending ? <span className="animate-pulse">INITIALIZING...</span> : <><Play size={16} /> LAUNCH SEQUENCE</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {activeScanId && scan && (
            <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full" style={{
                backgroundColor: scan.status === 'completed' ? 'hsl(var(--primary))' : 
                                scan.status === 'failed' ? 'hsl(var(--destructive))' : 
                                'hsl(var(--chart-3))'
              }} />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2">
                    <Activity size={14} className={scan.status === 'running' ? "animate-pulse text-chart-3" : "text-muted-foreground"} /> 
                    TASK STATUS
                  </CardTitle>
                  <Badge variant="outline" className={`font-mono text-[10px] uppercase ${
                    scan.status === 'completed' ? 'bg-primary/20 text-primary border-primary/30' :
                    scan.status === 'failed' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                    'bg-chart-3/20 text-chart-3 border-chart-3/30'
                  }`}>
                    {scan.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
                  <span className="flex items-center gap-1"><Terminal size={12}/> {scan.toolName}</span>
                  <span className="flex items-center gap-1"><ChevronRight size={12}/> {scan.target}</span>
                </div>
                
                {(scan.status === 'completed' || scan.status === 'failed') && (
                  <Button 
                    variant="outline" 
                    className="w-full font-mono text-xs border-primary/30 hover:bg-primary/10 hover:text-primary"
                    onClick={() => setLocation(`/scans/${scan.id}`)}
                  >
                    VIEW FULL TELEMETRY
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm font-mono tracking-wider text-muted-foreground">INFO</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80 leading-relaxed mb-4">{tool.description}</p>
              
              <div className="space-y-3 mt-6">
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground block mb-1">COMMAND SYNTAX</span>
                  <code className="text-xs text-primary bg-background p-2 rounded block border border-border/50">
                    {tool.command} {tool.defaultArgs || '<args>'} &lt;target&gt;
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Ensure Activity icon is available since we used it in tool-detail
import { Activity } from "lucide-react";
