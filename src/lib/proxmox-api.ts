import { supabase } from "@/integrations/supabase/client";

export interface ProxmoxConfig {
  serverUrl: string;
  tokenId: string;
  tokenSecret: string;
}

export interface VM {
  vmid: number;
  name: string;
  status: string;
  cpu: number;
  maxcpu: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime: number;
  node: string;
  type: "qemu" | "lxc";
}

export interface NodeStatus {
  cpu: number;
  memory: { used: number; total: number; free: number };
  rootfs: { used: number; total: number; free: number };
  uptime: number;
  pveversion: string;
}

export interface StorageInfo {
  storage: string;
  type: string;
  used: number;
  total: number;
  avail: number;
  content: string;
}

export interface TaskStatus {
  upid: string;
  status: string;
  type: string;
  exitstatus?: string;
  pstart: number;
  starttime: number;
  endtime?: number;
}

async function callProxy(action: string, params: Record<string, unknown> = {}) {
  const config = getStoredConfig();
  if (!config) throw new Error("Proxmox não configurado");

  const { data, error } = await supabase.functions.invoke("proxmox-proxy", {
    body: { action, ...params, config },
  });

  if (error) throw new Error(error.message || "Erro na comunicação com o proxy");
  if (data?.error) throw new Error(data.error);
  return data;
}

export function getStoredConfig(): ProxmoxConfig | null {
  const raw = localStorage.getItem("proxmox_config");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveConfig(config: ProxmoxConfig) {
  localStorage.setItem("proxmox_config", JSON.stringify(config));
}

export function clearConfig() {
  localStorage.removeItem("proxmox_config");
}

export async function testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
  try {
    const data = await callProxy("test_connection");
    return { success: true, version: data.version };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getNodes(): Promise<string[]> {
  const data = await callProxy("get_nodes");
  return data.nodes || [];
}

export async function getNodeStatus(node: string): Promise<NodeStatus> {
  const data = await callProxy("get_node_status", { node });
  return data.status;
}

export async function getVMs(node: string): Promise<VM[]> {
  const data = await callProxy("get_vms", { node });
  return (data.vms || []).map((vm: any) => ({ ...vm, node }));
}

export async function getStorages(node: string): Promise<StorageInfo[]> {
  const data = await callProxy("get_storages", { node });
  return data.storages || [];
}

export async function exportVM(node: string, vmid: number, storage: string, format: string): Promise<string> {
  const data = await callProxy("export_vm", { node, vmid, storage, format });
  return data.upid;
}

export async function importVM(
  node: string,
  storage: string,
  filename: string,
  vmName: string,
  cores: number,
  memory: number
): Promise<string> {
  const data = await callProxy("import_vm", { node, storage, filename, vmName, cores, memory });
  return data.upid;
}

export async function getTaskStatus(node: string, upid: string): Promise<TaskStatus> {
  const data = await callProxy("get_task_status", { node, upid });
  return data.task;
}

export async function getRecentTasks(node: string): Promise<TaskStatus[]> {
  const data = await callProxy("get_recent_tasks", { node });
  return data.tasks || [];
}
