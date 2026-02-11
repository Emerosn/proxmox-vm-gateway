import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { getStoredConfig, getNodes, getVMs, getStorages, exportVM, getTaskStatus, type VM, type StorageInfo } from "@/lib/proxmox-api";
import { AlertTriangle, Upload, Loader2, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function ExportPage() {
  const config = getStoredConfig();
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState("");
  const [vms, setVms] = useState<VM[]>([]);
  const [storages, setStorages] = useState<StorageInfo[]>([]);
  const [selectedVM, setSelectedVM] = useState("");
  const [selectedStorage, setSelectedStorage] = useState("");
  const [format, setFormat] = useState("qcow2");
  const [exporting, setExporting] = useState(false);
  const [taskUpid, setTaskUpid] = useState<string | null>(null);
  const [taskDone, setTaskDone] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    (async () => {
      try {
        const n = await getNodes();
        setNodes(n);
        if (n.length > 0) {
          setSelectedNode(n[0]);
          const [vmList, storageList] = await Promise.all([getVMs(n[0]), getStorages(n[0])]);
          setVms(vmList);
          setStorages(storageList);
        }
      } catch (e: any) {
        toast({ title: "Erro", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!taskUpid || !selectedNode) return;
    const interval = setInterval(async () => {
      try {
        const task = await getTaskStatus(selectedNode, taskUpid);
        if (task.status === "stopped") {
          clearInterval(interval);
          setExporting(false);
          setTaskDone(true);
          toast({ title: task.exitstatus === "OK" ? "Exportação concluída!" : `Exportação finalizada: ${task.exitstatus}` });
        }
      } catch { /* retry */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [taskUpid, selectedNode]);

  const handleExport = async () => {
    if (!selectedVM || !selectedStorage) {
      toast({ title: "Selecione a VM e o storage", variant: "destructive" });
      return;
    }
    setExporting(true);
    setTaskDone(false);
    try {
      const upid = await exportVM(selectedNode, parseInt(selectedVM), selectedStorage, format);
      setTaskUpid(upid);
      toast({ title: "Exportação iniciada" });
    } catch (e: any) {
      setExporting(false);
      toast({ title: "Erro ao exportar", description: e.message, variant: "destructive" });
    }
  };

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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Exportar VM</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configurar Exportação</CardTitle>
          <CardDescription>Selecione a VM, formato e storage de destino para criar o backup/exportação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Máquina Virtual</Label>
            <Select value={selectedVM} onValueChange={setSelectedVM}>
              <SelectTrigger><SelectValue placeholder="Selecione uma VM" /></SelectTrigger>
              <SelectContent>
                {vms.map((vm) => (
                  <SelectItem key={vm.vmid} value={String(vm.vmid)}>
                    <span className="flex items-center gap-2">
                      {vm.vmid} — {vm.name || `VM ${vm.vmid}`}
                      <StatusBadge status={vm.status} />
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Formato</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="qcow2">QCOW2</SelectItem>
                <SelectItem value="raw">Raw</SelectItem>
                <SelectItem value="vmdk">VMDK (OVA)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Storage de Destino</Label>
            <Select value={selectedStorage} onValueChange={setSelectedStorage}>
              <SelectTrigger><SelectValue placeholder="Selecione o storage" /></SelectTrigger>
              <SelectContent>
                {storages.map((s) => (
                  <SelectItem key={s.storage} value={s.storage}>
                    {s.storage} ({s.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {exporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando... aguarde
              </div>
              <Progress value={undefined} className="animate-pulse" />
            </div>
          )}

          {taskDone && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle className="h-4 w-4" />
              Exportação concluída com sucesso!
            </div>
          )}

          <Button onClick={handleExport} disabled={exporting}>
            <Upload className="h-4 w-4" />
            {exporting ? "Exportando..." : "Iniciar Exportação"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
