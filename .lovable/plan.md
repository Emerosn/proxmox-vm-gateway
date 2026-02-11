

## Proxmox VM Manager — Painel de Importação/Exportação

### Visão Geral
Painel completo para gerenciar importação e exportação de máquinas virtuais Proxmox (OVA/QCOW2) via API, com interface moderna e intuitiva para uso pessoal.

---

### 1. Configuração do Servidor Proxmox
- Tela de configuração onde você informa a **URL do servidor** e o **Token de API** do Proxmox
- Validação de conexão com feedback visual (conectado/desconectado)
- Armazenamento seguro do token via secrets do backend

### 2. Dashboard Principal
- **Status do servidor**: CPU, memória, storage disponível
- **Lista de VMs** com status (rodando, parada, template)
- **Gráficos** de uso de recursos (CPU, RAM, disco) usando Recharts
- Indicadores visuais de saúde do ambiente

### 3. Exportação de VMs
- Selecionar VM da lista para exportar
- Escolher formato de exportação (OVA, QCOW2, raw)
- Selecionar storage de destino
- Acompanhar progresso da exportação em tempo real
- Histórico de exportações realizadas

### 4. Importação de VMs
- Formulário para importar VM a partir de arquivo/URL
- Configurar parâmetros: nome, CPU, memória, storage destino
- Escolher node de destino no cluster
- Acompanhar progresso da importação
- Histórico de importações realizadas

### 5. Logs e Histórico
- Log de todas as operações realizadas (importar, exportar)
- Filtros por data, tipo de operação e status
- Detalhes de cada operação (duração, erros, VM envolvida)

### 6. Backend (Edge Functions)
- Proxy para a API do Proxmox (evitar CORS)
- Endpoints para: listar VMs, iniciar exportação, iniciar importação, consultar status de tarefas, obter métricas do servidor

### Arquitetura
- **Frontend**: React + Tailwind + Recharts (gráficos)
- **Backend**: Edge Functions no Lovable Cloud como proxy para a API Proxmox
- **Segurança**: Token da API armazenado como secret no backend

