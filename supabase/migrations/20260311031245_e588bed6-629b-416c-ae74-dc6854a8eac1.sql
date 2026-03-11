
-- ============================
-- RH Module: Recrutamento + Avaliações
-- ============================

-- Storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO NOTHING;

-- Table: rh_vagas
CREATE TABLE public.rh_vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  cargo TEXT NOT NULL,
  area TEXT,
  num_vagas INTEGER DEFAULT 1,
  tipo_contrato TEXT,
  regime TEXT,
  salario_base DECIMAL(10,2),
  descricao TEXT,
  requisitos_obrig TEXT,
  requisitos_pref TEXT,
  data_abertura DATE DEFAULT CURRENT_DATE,
  data_limite DATE,
  estado TEXT DEFAULT 'aberta',
  motivo_encerr TEXT,
  criado_por UUID,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.rh_vagas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rh_vagas" ON public.rh_vagas FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert rh_vagas" ON public.rh_vagas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update rh_vagas" ON public.rh_vagas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete rh_vagas" ON public.rh_vagas FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Table: rh_candidatos
CREATE TABLE public.rh_candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  vaga_id UUID REFERENCES public.rh_vagas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  data_nascimento DATE,
  localidade TEXT,
  fonte TEXT,
  cv_url TEXT,
  estado TEXT DEFAULT 'recebido',
  notas_iniciais TEXT,
  ia_resumo_perfil TEXT,
  ia_experiencia JSONB,
  ia_competencias_tec JSONB,
  ia_competencias_trans JSONB,
  ia_formacao TEXT,
  ia_pontos_fortes JSONB,
  ia_pontos_atencao JSONB,
  ia_adequacao_vaga TEXT,
  ia_justificacao TEXT,
  ia_anos_experiencia INTEGER,
  ia_idiomas JSONB,
  ia_processado_em TIMESTAMP WITH TIME ZONE,
  ia_erro TEXT,
  pontuacao_media_entrev DECIMAL(5,2),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.rh_candidatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rh_candidatos" ON public.rh_candidatos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert rh_candidatos" ON public.rh_candidatos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update rh_candidatos" ON public.rh_candidatos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete rh_candidatos" ON public.rh_candidatos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Table: rh_entrevistas
CREATE TABLE public.rh_entrevistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  vaga_id UUID REFERENCES public.rh_vagas(id) ON DELETE CASCADE,
  candidato_id UUID REFERENCES public.rh_candidatos(id) ON DELETE CASCADE,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo TEXT,
  local_link TEXT,
  duracao_min INTEGER,
  entrevistador_id UUID,
  entrevistador_nome TEXT,
  estado TEXT DEFAULT 'agendada',
  p_experiencia DECIMAL(4,2),
  p_conhecimento DECIMAL(4,2),
  p_lideranca DECIMAL(4,2),
  p_comunicacao DECIMAL(4,2),
  p_resolucao DECIMAL(4,2),
  p_apresentacao DECIMAL(4,2),
  p_disponibilidade DECIMAL(4,2),
  p_referencias DECIMAL(4,2),
  p_informatica DECIMAL(4,2),
  p_organizacao DECIMAL(4,2),
  p_adaptabilidade DECIMAL(4,2),
  p_seguranca DECIMAL(4,2),
  pontuacao_final DECIMAL(5,2),
  classificacao TEXT,
  notas TEXT,
  recomendacao TEXT,
  proxima_fase TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.rh_entrevistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rh_entrevistas" ON public.rh_entrevistas FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert rh_entrevistas" ON public.rh_entrevistas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update rh_entrevistas" ON public.rh_entrevistas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete rh_entrevistas" ON public.rh_entrevistas FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Table: rh_avaliacoes
CREATE TABLE public.rh_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  colaborador_id UUID NOT NULL REFERENCES public.employees(id),
  colaborador_nome TEXT,
  avaliador_id UUID,
  avaliador_nome TEXT,
  tipo_avaliacao TEXT NOT NULL,
  periodo_inicio DATE,
  periodo_fim DATE,
  data_avaliacao DATE DEFAULT CURRENT_DATE,
  data_prevista DATE,
  estado TEXT DEFAULT 'pendente',
  qa_qualidade INTEGER,
  qa_produtividade INTEGER,
  qa_conhecimento INTEGER,
  qa_resolucao INTEGER,
  qb_pontualidade INTEGER,
  qb_postura INTEGER,
  qb_relacionamento INTEGER,
  qb_comunicacao INTEGER,
  qc_proatividade INTEGER,
  qc_aprendizagem INTEGER,
  qc_adaptacao INTEGER,
  qd_seguranca INTEGER,
  qd_cuidado_equip INTEGER,
  media_grupo_a DECIMAL(3,2),
  media_grupo_b DECIMAL(3,2),
  media_grupo_c DECIMAL(3,2),
  media_grupo_d DECIMAL(3,2),
  pontuacao_final DECIMAL(3,2),
  classificacao TEXT,
  pontos_fortes TEXT,
  areas_melhoria TEXT,
  objetivos_proximo TEXT,
  plano_desenvolvimento TEXT,
  observacoes TEXT,
  recomendacao TEXT,
  novo_cargo TEXT,
  nova_remuneracao DECIMAL(10,2),
  data_efetivacao DATE,
  obj_melhoria TEXT,
  prazo_revisao DATE,
  responsavel_acomp TEXT,
  motivo_desligamento TEXT,
  avaliador_confirmou BOOLEAN DEFAULT false,
  colaborador_notificado BOOLEAN DEFAULT false,
  data_comunicacao DATE,
  obs_colaborador TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.rh_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rh_avaliacoes" ON public.rh_avaliacoes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert rh_avaliacoes" ON public.rh_avaliacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update rh_avaliacoes" ON public.rh_avaliacoes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete rh_avaliacoes" ON public.rh_avaliacoes FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Storage RLS for CVs bucket
CREATE POLICY "Authenticated users can upload CVs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cvs' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view CVs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'cvs' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete CVs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cvs' AND auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX idx_vagas_empresa ON public.rh_vagas(empresa_id);
CREATE INDEX idx_vagas_estado ON public.rh_vagas(estado);
CREATE INDEX idx_candidatos_vaga ON public.rh_candidatos(vaga_id);
CREATE INDEX idx_candidatos_estado ON public.rh_candidatos(estado);
CREATE INDEX idx_entrevistas_vaga ON public.rh_entrevistas(vaga_id);
CREATE INDEX idx_entrevistas_candidato ON public.rh_entrevistas(candidato_id);
CREATE INDEX idx_avaliacoes_colaborador ON public.rh_avaliacoes(colaborador_id);
CREATE INDEX idx_avaliacoes_data_prevista ON public.rh_avaliacoes(data_prevista);
CREATE INDEX idx_avaliacoes_estado ON public.rh_avaliacoes(estado);
