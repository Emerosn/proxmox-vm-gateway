import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getStoredConfig, saveConfig, clearConfig, testConnection } from "@/lib/proxmox-api";
import { CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const existing = getStoredConfig();
  const [serverUrl, setServerUrl] = useState(existing?.serverUrl || "");
  const [tokenId, setTokenId] = useState(existing?.tokenId || "");
  const [tokenSecret, setTokenSecret] = useState(existing?.tokenSecret || "");
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [version, setVersion] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!serverUrl || !tokenId || !tokenSecret) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    saveConfig({ serverUrl: serverUrl.replace(/\/$/, ""), tokenId, tokenSecret });
    setTesting(true);
    setStatus("idle");
    const result = await testConnection();
    setTesting(false);
    if (result.success) {
      setStatus("success");
      setVersion(result.version || null);
      toast({ title: "Conexão estabelecida com sucesso!" });
    } else {
      setStatus("error");
      toast({ title: "Falha na conexão", description: result.error, variant: "destructive" });
    }
  };

  const handleClear = () => {
    clearConfig();
    setServerUrl("");
    setTokenId("");
    setTokenSecret("");
    setStatus("idle");
    setVersion(null);
    toast({ title: "Configuração removida" });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Servidor Proxmox</CardTitle>
          <CardDescription>
            Configure a URL do servidor e as credenciais de API.
            O token pode ser criado no Proxmox em Datacenter → Permissions → API Tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">URL do Servidor</Label>
            <Input
              id="serverUrl"
              placeholder="https://proxmox.exemplo.com:8006"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tokenId">Token ID</Label>
            <Input
              id="tokenId"
              placeholder="user@pam!token-name"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tokenSecret">Token Secret</Label>
            <Input
              id="tokenSecret"
              type="password"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={tokenSecret}
              onChange={(e) => setTokenSecret(e.target.value)}
            />
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Conectado{version && ` — Proxmox VE ${version}`}</span>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <XCircle className="h-4 w-4" />
              <span>Falha na conexão. Verifique as credenciais.</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={testing}>
              {testing && <Loader2 className="h-4 w-4 animate-spin" />}
              {testing ? "Testando..." : "Salvar e Testar"}
            </Button>
            {existing && (
              <Button variant="outline" onClick={handleClear}>
                <Trash2 className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
