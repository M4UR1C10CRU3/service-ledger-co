
-- Add workflow fields to marketing_tarefas
ALTER TABLE public.marketing_tarefas
  ADD COLUMN IF NOT EXISTS etapa_atual text NOT NULL DEFAULT 'briefing',
  ADD COLUMN IF NOT EXISTS aprovador_id uuid,
  ADD COLUMN IF NOT EXISTS aprovador_nome text,
  ADD COLUMN IF NOT EXISTS solicitante_id uuid,
  ADD COLUMN IF NOT EXISTS solicitante_nome text,
  ADD COLUMN IF NOT EXISTS prazo_briefing date,
  ADD COLUMN IF NOT EXISTS prazo_criacao date,
  ADD COLUMN IF NOT EXISTS prazo_revisao date,
  ADD COLUMN IF NOT EXISTS prazo_aprovacao date;

-- Multiple responsibles per task
CREATE TABLE IF NOT EXISTS public.marketing_tarefa_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  utilizador_id uuid,
  utilizador_nome text NOT NULL,
  funcao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mtr_tarefa ON public.marketing_tarefa_responsaveis(tarefa_id);
ALTER TABLE public.marketing_tarefa_responsaveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all mtr" ON public.marketing_tarefa_responsaveis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Free-form checklist items per task/etapa
CREATE TABLE IF NOT EXISTS public.marketing_tarefa_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  etapa text NOT NULL DEFAULT 'briefing',
  titulo text NOT NULL,
  responsavel_id uuid,
  responsavel_nome text,
  prazo date,
  concluido boolean NOT NULL DEFAULT false,
  concluido_em timestamptz,
  concluido_por uuid,
  ordem integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mtc_tarefa ON public.marketing_tarefa_checklist(tarefa_id);
ALTER TABLE public.marketing_tarefa_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all mtc" ON public.marketing_tarefa_checklist FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_mtc_updated BEFORE UPDATE ON public.marketing_tarefa_checklist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- History of stage transitions
CREATE TABLE IF NOT EXISTS public.marketing_tarefa_etapa_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  etapa_anterior text,
  etapa_nova text NOT NULL,
  utilizador_id uuid,
  utilizador_nome text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mteh_tarefa ON public.marketing_tarefa_etapa_historico(tarefa_id);
ALTER TABLE public.marketing_tarefa_etapa_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all mteh" ON public.marketing_tarefa_etapa_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notifications
CREATE TABLE IF NOT EXISTS public.marketing_tarefa_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  destinatario_id uuid,
  destinatario_nome text,
  tipo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  lida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mtn_tarefa ON public.marketing_tarefa_notificacoes(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_mtn_dest ON public.marketing_tarefa_notificacoes(destinatario_id, lida);
ALTER TABLE public.marketing_tarefa_notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all mtn" ON public.marketing_tarefa_notificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
