import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getStoredConfig, getNodes, getRecentTasks, type TaskStatus } from "@/lib/proxmox-api";
import { AlertTriangle, ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString("pt-BR");
}

function formatDuration(start: number, end?: number) {
  const diff = (end || Date.now() / 1000) - start;
  const m = Math.floor(diff / 60);
  const s = Math.floor(diff % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function LogsPage() {
  const config = getStoredConfig();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskStatus[]>([]);

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    (async () => {
      try {
        const nodes = await getNodes();
        if (nodes.length > 0) {
          const t = await getRecentTasks(nodes[0]);
          setTasks(t);
        }
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
        <AlertTriangle className="h-12 w-12 text-warning" />
        <h2 className="text-xl font-semibold">Proxmox não configurado</h2>
        <Button asChild><Link to="/settings">Ir para Configurações</Link></Button>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Logs & Histórico</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tarefas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma tarefa encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4">Início</th>
                    <th className="pb-2 pr-4">Duração</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.upid} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs">{task.type}</td>
                      <td className="py-3 pr-4 text-xs">{formatDate(task.starttime)}</td>
                      <td className="py-3 pr-4 text-xs">{formatDuration(task.starttime, task.endtime)}</td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            task.status === "stopped" && task.exitstatus === "OK"
                              ? "border-success text-success"
                              : task.status === "running"
                                ? "border-primary text-primary"
                                : "border-destructive text-destructive"
                          }
                        >
                          {task.status === "stopped" ? task.exitstatus || "done" : task.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
