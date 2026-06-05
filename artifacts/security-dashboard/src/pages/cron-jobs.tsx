import React, { useState } from "react";
import { Link } from "wouter";
import {
  Clock,
  Plus,
  Trash2,
  Play,
  Power,
  Terminal,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  useListCronJobs,
  useCreateCronJob,
  useDeleteCronJob,
  useToggleCronJob,
  useRunCronJobNow,
  useListTools,
  getListCronJobsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every Sunday", value: "0 0 * * 0" },
];

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[10px] uppercase tracking-wider gap-1",
        enabled
          ? "border-primary/40 text-primary bg-primary/10"
          : "border-muted text-muted-foreground"
      )}
    >
      {enabled ? <CheckCircle size={9} /> : <XCircle size={9} />}
      {enabled ? "Active" : "Disabled"}
    </Badge>
  );
}

function formatSchedule(schedule: string) {
  const preset = PRESETS.find((p) => p.value === schedule);
  return preset ? preset.label : schedule;
}

export default function CronJobs() {
  const { data: jobs, isLoading } = useListCronJobs();
  const { data: tools } = useListTools();
  const deleteCronJob = useDeleteCronJob();
  const toggleCronJob = useToggleCronJob();
  const runNow = useRunCronJobNow();
  const createCronJob = useCreateCronJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    toolId: "",
    target: "",
    args: "",
    schedule: "*/15 * * * *",
    customSchedule: "",
    useCustom: false,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListCronJobsQueryKey() });
  }

  async function handleCreate() {
    const schedule = form.useCustom ? form.customSchedule : form.schedule;
    if (!form.toolId || !form.target || !schedule) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    try {
      await createCronJob.mutateAsync({
        data: {
          toolId: parseInt(form.toolId),
          target: form.target,
          args: form.args || undefined,
          schedule,
        },
      });
      toast({ title: "Cron job scheduled", className: "bg-background border-border text-foreground" });
      setShowCreate(false);
      setForm({ toolId: "", target: "", args: "", schedule: "*/15 * * * *", customSchedule: "", useCustom: false });
      invalidate();
    } catch {
      toast({ title: "Failed to create cron job", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this cron job?")) return;
    try {
      await deleteCronJob.mutateAsync({ id });
      toast({ title: "Cron job deleted", className: "bg-background border-border text-foreground" });
      invalidate();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  async function handleToggle(id: number, enabled: boolean) {
    try {
      await toggleCronJob.mutateAsync({ id, data: { enabled: !enabled } });
      toast({
        title: !enabled ? "Cron job enabled" : "Cron job disabled",
        className: "bg-background border-border text-foreground",
      });
      invalidate();
    } catch {
      toast({ title: "Failed to toggle", variant: "destructive" });
    }
  }

  async function handleRunNow(id: number) {
    try {
      const scan = await runNow.mutateAsync({ id });
      toast({
        title: "Job triggered",
        description: (
          <span>
            Scan #{scan.id} started —{" "}
            <Link href={`/scans/${scan.id}`} className="underline text-primary">
              view output
            </Link>
          </span>
        ) as unknown as string,
        className: "bg-background border-border text-foreground",
      });
    } catch {
      toast({ title: "Failed to run job", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="text-primary" size={22} />
            Scheduled Jobs
          </h2>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Automate tool execution on a cron schedule
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="gap-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-mono text-xs uppercase tracking-wider"
          variant="outline"
        >
          <Plus size={14} />
          New Job
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Jobs", value: jobs?.length ?? 0, color: "text-foreground" },
          { label: "Active", value: jobs?.filter((j) => j.enabled).length ?? 0, color: "text-primary" },
          { label: "Disabled", value: jobs?.filter((j) => !j.enabled).length ?? 0, color: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border/60">
            <CardContent className="p-4">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{s.label}</p>
              <p className={cn("text-2xl font-bold font-mono mt-1", s.color)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Jobs list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-border/60">
              <CardContent className="p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobs?.length === 0 ? (
        <Card className="bg-card border-border/60">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <Clock size={40} className="text-muted-foreground/30 mb-4" />
            <p className="text-sm font-mono text-muted-foreground">No scheduled jobs yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create one to automate tool execution</p>
            <Button
              onClick={() => setShowCreate(true)}
              variant="outline"
              className="mt-5 gap-2 text-xs font-mono uppercase tracking-wider border-primary/30 text-primary hover:bg-primary/10"
            >
              <Plus size={12} />
              Schedule a Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs?.map((job) => (
            <Card
              key={job.id}
              className={cn(
                "bg-card border transition-colors",
                job.enabled ? "border-border/60 hover:border-primary/30" : "border-border/30 opacity-70"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 border border-primary/20 p-2.5 rounded">
                    <Terminal size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-bold text-sm text-foreground">{job.toolName}</span>
                      <StatusBadge enabled={job.enabled} />
                      <Badge variant="outline" className="font-mono text-[10px] border-border/60 text-muted-foreground">
                        <Clock size={9} className="mr-1" />
                        {formatSchedule(job.schedule)}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground font-mono">
                      <span>
                        target: <span className="text-amber-400">{job.target}</span>
                      </span>
                      {job.args && (
                        <span>
                          args: <span className="text-cyan-400">{job.args}</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-4 text-[11px] text-muted-foreground/60 font-mono">
                      {job.lastRunAt ? (
                        <span>Last run: {new Date(job.lastRunAt).toLocaleString()}</span>
                      ) : (
                        <span>Never run</span>
                      )}
                      {job.lastScanId && (
                        <Link href={`/scans/${job.lastScanId}`} className="text-primary/70 hover:text-primary underline">
                          last result &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRunNow(job.id)}
                      className="gap-1.5 h-8 text-[11px] font-mono uppercase border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Play size={11} />
                      Run Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(job.id, job.enabled)}
                      className={cn(
                        "gap-1.5 h-8 text-[11px] font-mono uppercase",
                        job.enabled
                          ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          : "border-primary/30 text-primary hover:bg-primary/10"
                      )}
                    >
                      <Power size={11} />
                      {job.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(job.id)}
                      className="gap-1.5 h-8 text-[11px] font-mono uppercase border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={11} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} className="text-primary" />
              Schedule New Job
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Tool</Label>
              <Select value={form.toolId} onValueChange={(v) => setForm((f) => ({ ...f, toolId: v }))}>
                <SelectTrigger className="bg-background border-border font-mono text-sm">
                  <SelectValue placeholder="Select a tool..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {tools?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)} className="font-mono text-sm">
                      {t.name}
                      <span className="ml-2 text-xs text-muted-foreground">({t.category})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Target</Label>
              <Input
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                placeholder="e.g. 192.168.1.1 or example.com"
                className="bg-background border-border font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Additional Args (optional)</Label>
              <Input
                value={form.args}
                onChange={(e) => setForm((f) => ({ ...f, args: e.target.value }))}
                placeholder="e.g. -sV -p 80,443"
                className="bg-background border-border font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Schedule</Label>
              <Select
                value={form.useCustom ? "__custom__" : form.schedule}
                onValueChange={(v) => {
                  if (v === "__custom__") setForm((f) => ({ ...f, useCustom: true }));
                  else setForm((f) => ({ ...f, schedule: v, useCustom: false }));
                }}
              >
                <SelectTrigger className="bg-background border-border font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="font-mono text-sm">
                      {p.label}
                      <span className="ml-2 text-xs text-muted-foreground">{p.value}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__" className="font-mono text-sm">
                    Custom expression...
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.useCustom && (
                <Input
                  value={form.customSchedule}
                  onChange={(e) => setForm((f) => ({ ...f, customSchedule: e.target.value }))}
                  placeholder="* * * * * (min hour day month weekday)"
                  className="bg-background border-border font-mono text-sm mt-2"
                />
              )}
              <p className="text-[11px] text-muted-foreground/60 font-mono">
                Format: minute hour day month weekday
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              className="font-mono text-xs uppercase border-border text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createCronJob.isPending}
              className="font-mono text-xs uppercase bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
              variant="outline"
            >
              {createCronJob.isPending ? "Scheduling..." : "Schedule Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
