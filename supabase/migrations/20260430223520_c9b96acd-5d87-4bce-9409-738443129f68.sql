-- ============================================
-- MÓDULO MARKETING — FASE 1
-- ============================================

-- 1) Tabela principal de tarefas do Kanban
CREATE TABLE public.marketing_tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo_conteudo TEXT, -- post, story, reels, anuncio, video, blog, email, outro
  canal TEXT, -- instagram, facebook, linkedin, tiktok, site, email, outro
  status TEXT NOT NULL DEFAULT 'ideias', -- ideias, em_producao, em_revisao, agendado, publicado, arquivado
  prioridade TEXT NOT NULL DEFAULT 'media', -- baixa, media, alta, urgente
  responsavel_id UUID, -- liberty_utilizadores.id (delegado)
  responsavel_nome TEXT, -- snapshot
  delegado_por_id UUID,
  delegado_por_nome TEXT,
  data_prevista DATE,
  data_publicacao DATE,
  hora_publicacao TIME,
  hashtags TEXT,
  copy_legenda TEXT,
  link_externo TEXT,
  briefing TEXT,
  observacoes TEXT,
  ordem_kanban INTEGER NOT NULL DEFAULT 0,
  arquivado BOOLEAN NOT NULL DEFAULT FALSE,
  arquivado_em TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_tarefas_empresa ON public.marketing_tarefas(empresa_id);
CREATE INDEX idx_marketing_tarefas_status ON public.marketing_tarefas(empresa_id, status);
CREATE INDEX idx_marketing_tarefas_data ON public.marketing_tarefas(empresa_id, data_prevista);

-- 2) Anexos / entregas (suporta upload OU link externo)
CREATE TABLE public.marketing_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID NOT NULL REFERENCES public.marketing_tarefas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'upload', -- upload, link
  nome TEXT NOT NULL,
  url TEXT NOT NULL, -- storage path OR external URL
  mime_type TEXT,
  tamanho_bytes BIGINT,
  uploaded_by UUID,
  uploaded_by_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_anexos_tarefa ON public.marketing_anexos(tarefa_id);

-- 3) Comentários / histórico
CREATE TABLE public.marketing_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID NOT NULL REFERENCES public.marketing_tarefas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  autor_id UUID,
  autor_nome TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'comentario', -- comentario, mudanca_status, sistema
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_comentarios_tarefa ON public.marketing_comentarios(tarefa_id);

-- 4) Trigger updated_at
CREATE TRIGGER trg_marketing_tarefas_updated
BEFORE UPDATE ON public.marketing_tarefas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) RLS
ALTER TABLE public.marketing_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_comentarios ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para utilizadores autenticados (segue padrão de outros módulos do projeto)
CREATE POLICY "Authenticated can view marketing_tarefas"
  ON public.marketing_tarefas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert marketing_tarefas"
  ON public.marketing_tarefas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update marketing_tarefas"
  ON public.marketing_tarefas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete marketing_tarefas"
  ON public.marketing_tarefas FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can view marketing_anexos"
  ON public.marketing_anexos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert marketing_anexos"
  ON public.marketing_anexos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete marketing_anexos"
  ON public.marketing_anexos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can view marketing_comentarios"
  ON public.marketing_comentarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert marketing_comentarios"
  ON public.marketing_comentarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete marketing_comentarios"
  ON public.marketing_comentarios FOR DELETE TO authenticated USING (true);

-- 6) Storage bucket para entregas de marketing (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-entregas', 'marketing-entregas', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas do bucket
CREATE POLICY "Authenticated can view marketing files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'marketing-entregas');

CREATE POLICY "Authenticated can upload marketing files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketing-entregas');

CREATE POLICY "Authenticated can delete marketing files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketing-entregas');