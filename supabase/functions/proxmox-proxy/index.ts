import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function proxmoxFetch(baseUrl: string, path: string, tokenId: string, tokenSecret: string, method = "GET", body?: unknown) {
  const url = `${baseUrl}/api2/json${path}`;
  console.log(`[proxmox-proxy] ${method} ${url}`);
  
  const headers: Record<string, string> = {
    Authorization: `PVEAPIToken=${tokenId}=${tokenSecret}`,
  };
  const opts: RequestInit & { client?: unknown } = { method, headers };
  
  if (body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    opts.body = new URLSearchParams(body as Record<string, string>).toString();
  }

  // Create an abort controller for timeout (15 seconds)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  opts.signal = controller.signal;

  try {
    // Use Deno's HttpClient to skip SSL verification for self-signed Proxmox certs
    const httpClient = Deno.createHttpClient({ 
      caCerts: [],
    });
    const res = await fetch(url, {
      ...opts,
      // @ts-ignore - Deno specific
      client: httpClient,
    });
    
    clearTimeout(timeout);
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`[proxmox-proxy] API error ${res.status}: ${text}`);
      throw new Error(`Proxmox API ${res.status}: ${text}`);
    }
    
    const j = await res.json();
    return j.data;
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      throw new Error("Timeout: servidor Proxmox não respondeu em 15s. Verifique a URL e se o servidor está acessível.");
    }
    console.error(`[proxmox-proxy] Fetch error: ${e.message}`);
    throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, config, ...params } = await req.json();
    const { serverUrl, tokenId, tokenSecret } = config || {};

    if (!serverUrl || !tokenId || !tokenSecret) {
      return json({ error: "Configuração do Proxmox ausente" }, 400);
    }

    console.log(`[proxmox-proxy] Action: ${action}, Server: ${serverUrl}`);

    const pf = (path: string, method = "GET", body?: unknown) =>
      proxmoxFetch(serverUrl, path, tokenId, tokenSecret, method, body);

    switch (action) {
      case "test_connection": {
        const data = await pf("/version");
        return json({ version: data.version });
      }

      case "get_nodes": {
        const data = await pf("/nodes");
        const nodes = (data || []).map((n: any) => n.node);
        return json({ nodes });
      }

      case "get_node_status": {
        const data = await pf(`/nodes/${params.node}/status`);
        return json({
          status: {
            cpu: data.cpu,
            memory: { used: data.memory.used, total: data.memory.total, free: data.memory.free },
            rootfs: { used: data.rootfs.used, total: data.rootfs.total, free: data.rootfs.free },
            uptime: data.uptime,
            pveversion: data.pveversion,
          },
        });
      }

      case "get_vms": {
        const data = await pf(`/nodes/${params.node}/qemu`);
        return json({ vms: data || [] });
      }

      case "get_storages": {
        const data = await pf(`/nodes/${params.node}/storage`);
        return json({ storages: data || [] });
      }

      case "export_vm": {
        const { node, vmid, storage, format } = params;
        const data = await pf(`/nodes/${node}/qemu/${vmid}/clone`, "POST", {
          newid: String(vmid + 9000),
          name: `export-${vmid}-${Date.now()}`,
          target: node,
          full: "1",
        });
        return json({ upid: data });
      }

      case "import_vm": {
        const { node, storage, filename, vmName, cores, memory } = params;
        const data = await pf(`/nodes/${node}/qemu`, "POST", {
          vmid: String(Math.floor(Math.random() * 9000) + 1000),
          name: vmName,
          cores: String(cores),
          memory: String(memory),
          storage: storage,
          archive: filename,
        });
        return json({ upid: data });
      }

      case "get_task_status": {
        const { node, upid } = params;
        const data = await pf(`/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`);
        return json({ task: data });
      }

      case "get_recent_tasks": {
        const data = await pf(`/nodes/${params.node}/tasks?limit=50`);
        return json({ tasks: data || [] });
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (e: any) {
    console.error(`[proxmox-proxy] Error: ${e.message}`);
    return json({ error: e.message || "Erro interno" }, 500);
  }
});
