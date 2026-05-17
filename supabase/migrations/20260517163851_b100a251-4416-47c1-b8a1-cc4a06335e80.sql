
-- Cards
CREATE TABLE public.planeamento_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  objetivo TEXT,
  problema_oportunidade TEXT,
  impacto_esperado TEXT,
  coluna TEXT NOT NULL DEFAULT 'ideia',
  area_negocio TEXT,
  areas_afetadas TEXT[] DEFAULT '{}',
  prioridade TEXT NOT NULL DEFAULT 'media',
  responsavel_id UUID,
  responsavel_nome TEXT,
  responsaveis_extra JSONB DEFAULT '[]'::jsonb,
  prazo_estimado DATE,
  data_inicio_real DATE,
  data_conclusao_prevista DATE,
  data_conclusao_real DATE,
  tags TEXT[] DEFAULT '{}',
  info_internas TEXT,
  referencias_externas TEXT,
  notas_pesquisa TEXT,
  criterios_validacao JSONB DEFAULT '[]'::jsonb,
  parecer TEXT,
  decisao_final TEXT,
  data_decisao DATE,
  decisao_observacoes TEXT,
  plano_implementacao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_by_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.planeamento_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth all planeamento_cards" ON public.planeamento_cards
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_planeamento_cards_empresa ON public.planeamento_cards(empresa_id);
CREATE INDEX idx_planeamento_cards_coluna ON public.planeamento_cards(empresa_id, coluna);

CREATE TRIGGER trg_planeamento_cards_updated_at
BEFORE UPDATE ON public.planeamento_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Consultas
CREATE TABLE public.planeamento_consultas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  card_id UUID NOT NULL,
  entidade TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'outra',
  data_consulta DATE,
  resumo TEXT,
  created_by UUID,
  created_by_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.planeamento_consultas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all planeamento_consultas" ON public.planeamento_consultas
FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_planeamento_consultas_card ON public.planeamento_consultas(card_id);

-- Anexos
CREATE TABLE public.planeamento_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  card_id UUID NOT NULL,
  consulta_id UUID,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  uploaded_by UUID,
  uploaded_by_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.planeamento_anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all planeamento_anexos" ON public.planeamento_anexos
FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_planeamento_anexos_card ON public.planeamento_anexos(card_id);

-- Checklist
CREATE TABLE public.planeamento_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  card_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  responsavel_nome TEXT,
  prazo DATE,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMP WITH TIME ZONE,
  concluido_por TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.planeamento_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all planeamento_checklist" ON public.planeamento_checklist
FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_planeamento_checklist_card ON public.planeamento_checklist(card_id);
CREATE TRIGGER trg_planeamento_checklist_updated_at
BEFORE UPDATE ON public.planeamento_checklist
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Histórico
CREATE TABLE public.planeamento_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  card_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  metadata JSONB,
  utilizador_id UUID,
  utilizador_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.planeamento_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all planeamento_historico" ON public.planeamento_historico
FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_planeamento_historico_card ON public.planeamento_historico(card_id, created_at DESC);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('planeamento-anexos', 'planeamento-anexos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read planeamento-anexos" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'planeamento-anexos');
CREATE POLICY "auth insert planeamento-anexos" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'planeamento-anexos');
CREATE POLICY "auth update planeamento-anexos" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'planeamento-anexos');
CREATE POLICY "auth delete planeamento-anexos" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'planeamento-anexos');
