export interface Worker {
  id: string;
  coach_id: string | null;
  nome: string;
  descricao: string | null;
  plataforma: 'n8n' | 'clariza';
  workflow_id: string | null;
  schedule: string | null;
  cron_expr: string | null;
  ativo: boolean;
  empresa_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface WorkerExecucao {
  id: string;
  worker_id: string;
  iniciado_em: string;
  concluido_em: string | null;
  status: 'a_correr' | 'ok' | 'aviso' | 'erro';
  resumo: string | null;
  dados: Record<string, unknown>;
  alertas_gerados: number;
  duracao_ms: number | null;
  n8n_exec_id: string | null;
}

export interface WorkerAlerta {
  id: string;
  worker_id: string;
  execucao_id: string | null;
  severidade: 'critico' | 'moderado' | 'informativo';
  mensagem: string;
  dados: Record<string, unknown>;
  resolvido: boolean;
  resolvido_em: string | null;
  created_at: string;
}
