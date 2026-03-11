
-- Create liberty_atividades table
CREATE TABLE public.liberty_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  utilizador_id UUID NOT NULL,
  utilizador_nome TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  entidade_tipo TEXT,
  entidade_id UUID,
  entidade_ref TEXT,
  metadata JSONB,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.liberty_atividades ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can insert liberty_atividades"
  ON public.liberty_atividades FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view liberty_atividades"
  ON public.liberty_atividades FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete liberty_atividades"
  ON public.liberty_atividades FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_la_empresa_user_data
  ON public.liberty_atividades(empresa_id, utilizador_id, data_hora DESC);

CREATE INDEX idx_la_empresa_data
  ON public.liberty_atividades(empresa_id, data_hora DESC);

CREATE INDEX idx_la_modulo
  ON public.liberty_atividades(empresa_id, modulo, data_hora DESC);

CREATE INDEX idx_la_semana
  ON public.liberty_atividades(utilizador_id, data_hora)
  WHERE data_hora IS NOT NULL;

-- Add utilizador_id to employees (nullable, doesn't affect existing records)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS utilizador_id UUID;
