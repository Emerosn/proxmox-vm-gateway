import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { getStoredConfig, getNodes, getStorages, importVM, getTaskStatus, type StorageInfo } from "@/lib/proxmox-api";
import { AlertTriangle, Download, Loader2, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function ImportPage() {
  const config = getStoredConfig();
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState("");
  const [storages, setStorages] = useState<StorageInfo[]>([]);
  const [selectedStorage, setSelectedStorage] = useState("");
  const [filename, setFilename] = useState("");
  const [vmName, setVmName] = useState("");
  const [cores, setCores] = useState("2");
  const [memory, setMemory] = useState("2048");
  const [importing, setImporting] = useState(false);
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
          const storageList = await getStorages(n[0]);
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
          setImporting(false);
          setTaskDone(true);
          toast({ title: task.exitstatus === "OK" ? "Importação concluída!" : `Importação finalizada: ${task.exitstatus}` });
        }
      } catch { /* retry */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [taskUpid, selectedNode]);

  const handleImport = async () => {
    if (!filename || !selectedStorage || !vmName) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    setImporting(true);
    setTaskDone(false);
    try {
      const upid = await importVM(selectedNode, selectedStorage, filename, vmName, parseInt(cores), parseInt(memory));
      setTaskUpid(upid);
      toast({ title: "Importação iniciada" });
    } catch (e: any) {
      setImporting(false);
      toast({ title: "Erro ao importar", description: e.message, variant: "destructive" });
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
      <h1 className="text-2xl font-bold">Importar VM</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configurar Importação</CardTitle>
          <CardDescription>Informe o caminho/URL do arquivo e os parâmetros da nova VM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Node de Destino</Label>
            <Select value={selectedNode} onValueChange={setSelectedNode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {nodes.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Caminho/URL do Arquivo</Label>
            <Input placeholder="/var/lib/vz/dump/vm-100.qcow2 ou URL" value={filename} onChange={(e) => setFilename(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Nome da VM</Label>
            <Input placeholder="minha-vm" value={vmName} onChange={(e) => setVmName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>vCPUs</Label>
              <Input type="number" min={1} max={64} value={cores} onChange={(e) => setCores(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Memória (MB)</Label>
              <Input type="number" min={256} step={256} value={memory} onChange={(e) => setMemory(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Storage de Destino</Label>
            <Select value={selectedStorage} onValueChange={setSelectedStorage}>
              <SelectTrigger><SelectValue placeholder="Selecione o storage" /></SelectTrigger>
              <SelectContent>
                {storages.map((s) => (
                  <SelectItem key={s.storage} value={s.storage}>{s.storage} ({s.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando... aguarde
              </div>
              <Progress value={undefined} className="animate-pulse" />
            </div>
          )}

          {taskDone && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle className="h-4 w-4" />
              Importação concluída com sucesso!
            </div>
          )}

          <Button onClick={handleImport} disabled={importing}>
            <Download className="h-4 w-4" />
            {importing ? "Importando..." : "Iniciar Importação"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
