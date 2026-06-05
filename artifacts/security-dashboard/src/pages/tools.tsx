import React, { useState } from "react";
import { Link } from "wouter";
import { Terminal, Plus, Search, Shield, Info, Edit, Trash2 } from "lucide-react";
import { useListTools, useDeleteTool } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Tools() {
  const { data: tools, isLoading, refetch } = useListTools();
  const deleteTool = useDeleteTool();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const filteredTools = tools?.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this tool?")) return;
    
    try {
      await deleteTool.mutateAsync({ id });
      toast({ title: "Tool deleted successfully", className: "bg-background border-border text-foreground" });
      refetch();
    } catch (err) {
      toast({ title: "Failed to delete tool", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Terminal className="text-primary" /> Arsenal
          </h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">Manage and execute security utilities</p>
        </div>
        <Button className="font-mono text-sm gap-2">
          <Plus size={16} /> NEW TOOL
        </Button>
      </div>

      <div className="flex items-center gap-4 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder="Search tools..." 
            className="pl-9 font-mono bg-card/50 border-border/50 focus-visible:ring-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/50">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-1/2 bg-secondary/50" />
                <Skeleton className="h-4 w-full bg-secondary/50" />
                <Skeleton className="h-8 w-full bg-secondary/50" />
              </CardContent>
            </Card>
          ))
        ) : filteredTools && filteredTools.length > 0 ? (
          filteredTools.map(tool => (
            <Link key={tool.id} href={`/tools/${tool.id}`} className="block group">
              <Card className="border-border/50 bg-card/50 hover:bg-secondary/20 hover:border-primary/30 transition-all duration-200 h-full cursor-pointer flex flex-col backdrop-blur">
                <CardContent className="p-5 flex-1 flex flex-col relative">
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!tool.isBuiltin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => handleDelete(tool.id, e)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-start justify-between mb-4 pr-8">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className={tool.isBuiltin ? "text-primary" : "text-chart-3"} />
                      <h3 className="font-bold font-mono tracking-tight text-lg">{tool.name}</h3>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-6 flex-1">{tool.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <Badge variant="outline" className="font-mono text-[10px] bg-background">
                      {tool.category.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground px-2 py-1 rounded bg-secondary/50 border border-border/50">
                      {tool.isBuiltin ? 'SYSTEM' : 'CUSTOM'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-12 text-center border border-dashed border-border/50 rounded-lg bg-card/20">
            <Terminal className="mx-auto text-muted-foreground mb-4 opacity-50" size={32} />
            <p className="text-muted-foreground font-mono">NO TOOLS FOUND</p>
          </div>
        )}
      </div>
    </div>
  );
}