import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { getStoredConfig, getNodes, getNodeStatus, getVMs, type VM, type NodeStatus } from "@/lib/proxmox-api";
import { Cpu, HardDrive, MemoryStick, Activity, Server, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [nodeStatus, setNodeStatus] = useState<NodeStatus | null>(null);
  const [vms, setVms] = useState<VM[]>([]);
  const [error, setError] = useState<string | null>(null);
  const config = getStoredConfig();

  useEffect(() => {
    if (!config) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const nodes = await getNodes();
        if (nodes.length === 0) throw new Error("Nenhum node encontrado");
        const status = await getNodeStatus(nodes[0]);
        const vmList = await getVMs(nodes[0]);
        setNodeStatus(status);
        setVms(vmList);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
        <AlertTriangle className="h-12 w-12 text-warning" />
        <h2 className="text-xl font-semibold">Proxmox não configurado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Configure a URL do servidor e token de API para começar.
        </p>
        <Button asChild>
          <Link to="/settings">Ir para Configurações</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Erro ao conectar</h2>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <Button asChild variant="outline">
          <Link to="/settings">Verificar Configurações</Link>
        </Button>
      </div>
    );
  }

  const cpuPercent = nodeStatus ? Math.round(nodeStatus.cpu * 100) : 0;
  const memPercent = nodeStatus ? Math.round((nodeStatus.memory.used / nodeStatus.memory.total) * 100) : 0;
  const diskPercent = nodeStatus ? Math.round((nodeStatus.rootfs.used / nodeStatus.rootfs.total) * 100) : 0;
  const runningCount = vms.filter((v) => v.status === "running").length;
  const stoppedCount = vms.filter((v) => v.status === "stopped").length;

  const chartConfig = {
    used: { label: "Usado", color: "hsl(var(--primary))" },
    free: { label: "Livre", color: "hsl(var(--muted))" },
  };

  const makeDonut = (percent: number) => [
    { name: "used", value: percent },
    { name: "free", value: 100 - percent },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {nodeStatus?.pveversion && `Proxmox VE ${nodeStatus.pveversion}`}
            {nodeStatus?.uptime && ` • Uptime: ${formatUptime(nodeStatus.uptime)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-success" />
          <span className="text-sm text-success font-medium">Conectado</span>
        </div>
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "CPU", percent: cpuPercent, icon: Cpu, detail: `${cpuPercent}% utilizado` },
          { label: "Memória", percent: memPercent, icon: MemoryStick, detail: nodeStatus ? `${formatBytes(nodeStatus.memory.used)} / ${formatBytes(nodeStatus.memory.total)}` : "" },
          { label: "Disco", percent: diskPercent, icon: HardDrive, detail: nodeStatus ? `${formatBytes(nodeStatus.rootfs.used)} / ${formatBytes(nodeStatus.rootfs.total)}` : "" },
        ].map((res) => (
          <Card key={res.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <ChartContainer config={chartConfig} className="h-20 w-20">
                <PieChart>
                  <Pie
                    data={makeDonut(res.percent)}
                    dataKey="value"
                    innerRadius="65%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2}
                  >
                    <Cell fill="hsl(var(--primary))" />
                    <Cell fill="hsl(var(--muted))" />
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <res.icon className="h-4 w-4 text-muted-foreground" />
                  {res.label}
                </div>
                <p className="text-2xl font-bold">{res.percent}%</p>
                <p className="text-xs text-muted-foreground">{res.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* VM Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Server className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{vms.length}</p>
            <p className="text-xs text-muted-foreground">Total VMs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-6 w-6 mx-auto text-success mb-1" />
            <p className="text-2xl font-bold">{runningCount}</p>
            <p className="text-xs text-muted-foreground">Rodando</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Server className="h-6 w-6 mx-auto text-destructive mb-1" />
            <p className="text-2xl font-bold">{stoppedCount}</p>
            <p className="text-xs text-muted-foreground">Paradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Server className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{vms.length - runningCount - stoppedCount}</p>
            <p className="text-xs text-muted-foreground">Outros</p>
          </CardContent>
        </Card>
      </div>

      {/* VM List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Máquinas Virtuais</CardTitle>
        </CardHeader>
        <CardContent>
          {vms.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma VM encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">ID</th>
                    <th className="pb-2 pr-4">Nome</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">CPU</th>
                    <th className="pb-2 pr-4">Memória</th>
                    <th className="pb-2">Disco</th>
                  </tr>
                </thead>
                <tbody>
                  {vms.map((vm) => (
                    <tr key={vm.vmid} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs">{vm.vmid}</td>
                      <td className="py-3 pr-4 font-medium">{vm.name || `VM ${vm.vmid}`}</td>
                      <td className="py-3 pr-4"><StatusBadge status={vm.status} /></td>
                      <td className="py-3 pr-4">{vm.maxcpu} vCPU</td>
                      <td className="py-3 pr-4">{formatBytes(vm.maxmem)}</td>
                      <td className="py-3">{formatBytes(vm.maxdisk)}</td>
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
