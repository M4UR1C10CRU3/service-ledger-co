
-- Table: followup_oportunidades
CREATE TABLE public.followup_oportunidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  cliente_id UUID REFERENCES public.clientes(id),
  cliente_nome TEXT,
  proposta_id UUID REFERENCES public.propostas(id),
  titulo TEXT NOT NULL,
  fase TEXT NOT NULL DEFAULT 'contacto_inicial',
  responsavel_id UUID,
  responsavel_nome TEXT,
  probabilidade INTEGER DEFAULT 25,
  valor_estimado DECIMAL(12,2),
  data_adjudicacao_esperada DATE,
  data_adjudicacao_real DATE,
  motivo_arquivo TEXT,
  sentimento_atual TEXT DEFAULT 'desconhecido',
  data_ultimo_contacto TIMESTAMPTZ,
  proximo_followup_data TIMESTAMPTZ,
  proximo_followup_tipo TEXT,
  proximo_followup_notas TEXT,
  notas_internas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: followup_contactos
CREATE TABLE public.followup_contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id UUID NOT NULL REFERENCES public.followup_oportunidades(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  data_contacto TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo_contacto TEXT NOT NULL,
  resultado TEXT,
  feedback_cliente TEXT,
  sentimento TEXT DEFAULT 'desconhecido',
  probabilidade_apos INTEGER,
  fase_anterior TEXT,
  fase_nova TEXT,
  proximo_followup_data TIMESTAMPTZ,
  proximo_followup_tipo TEXT,
  proximo_followup_notas TEXT,
  utilizador_id UUID,
  utilizador_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: followup_historico_fases
CREATE TABLE public.followup_historico_fases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id UUID NOT NULL REFERENCES public.followup_oportunidades(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  fase_anterior TEXT,
  fase_nova TEXT NOT NULL,
  data_transicao TIMESTAMPTZ DEFAULT now(),
  utilizador_id UUID,
  utilizador_nome TEXT,
  contacto_id UUID REFERENCES public.followup_contactos(id),
  notas TEXT
);

-- Indexes
CREATE INDEX idx_fo_empresa ON public.followup_oportunidades(empresa_id);
CREATE INDEX idx_fo_cliente ON public.followup_oportunidades(cliente_id);
CREATE INDEX idx_fo_fase ON public.followup_oportunidades(fase);
CREATE INDEX idx_fo_responsavel ON public.followup_oportunidades(responsavel_id);
CREATE INDEX idx_fo_proximo_followup ON public.followup_oportunidades(proximo_followup_data);
CREATE INDEX idx_fc_oportunidade ON public.followup_contactos(oportunidade_id);
CREATE INDEX idx_fc_data ON public.followup_contactos(data_contacto);
CREATE INDEX idx_fhf_oportunidade ON public.followup_historico_fases(oportunidade_id);

-- RLS
ALTER TABLE public.followup_oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_historico_fases ENABLE ROW LEVEL SECURITY;

-- RLS policies for followup_oportunidades
CREATE POLICY "Authenticated users can view followup_oportunidades" ON public.followup_oportunidades FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert followup_oportunidades" ON public.followup_oportunidades FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update followup_oportunidades" ON public.followup_oportunidades FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete followup_oportunidades" ON public.followup_oportunidades FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS policies for followup_contactos
CREATE POLICY "Authenticated users can view followup_contactos" ON public.followup_contactos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert followup_contactos" ON public.followup_contactos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update followup_contactos" ON public.followup_contactos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete followup_contactos" ON public.followup_contactos FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS policies for followup_historico_fases
CREATE POLICY "Authenticated users can view followup_historico_fases" ON public.followup_historico_fases FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert followup_historico_fases" ON public.followup_historico_fases FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update followup_historico_fases" ON public.followup_historico_fases FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete followup_historico_fases" ON public.followup_historico_fases FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER handle_followup_oportunidades_updated_at
  BEFORE UPDATE ON public.followup_oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
