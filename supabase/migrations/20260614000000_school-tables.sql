-- ============================================================
-- Clariza School — tabelas pedagógicas do ITC
-- Migração ADITIVA: apenas CREATE TABLE IF NOT EXISTS
-- Nunca DROP, nunca DELETE, nunca TRUNCATE
-- ============================================================

-- ── Cursos ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_cursos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL,
  nome                  TEXT NOT NULL,
  categoria             TEXT,
  descricao             TEXT,
  carga_horaria         INTEGER,
  sigla_certificado     TEXT,
  validade_meses        INTEGER,
  horas_teoricas        INTEGER,
  horas_praticas        INTEGER,
  conteudo_programatico JSONB DEFAULT '[]'::jsonb,
  objetivo              TEXT,
  metodologia           TEXT,
  reconhecimento        TEXT,
  aprovacao_minima      INTEGER DEFAULT 70,
  url_site              TEXT,
  ativo                 BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Docentes (Instrutores) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_docentes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL,
  nome                TEXT NOT NULL,
  email               TEXT,
  telefone            TEXT,
  foto_url            TEXT,
  formacao            TEXT,
  especializacao      TEXT,
  tempo_experiencia   TEXT,
  resumo_ia           TEXT,
  cursos_ids          UUID[] DEFAULT '{}',
  ativo               BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documentos dos docentes (diplomas, CVs, certificados de classe)
CREATE TABLE IF NOT EXISTS public.school_docentes_documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL,
  docente_id      UUID NOT NULL REFERENCES public.school_docentes(id) ON DELETE CASCADE,
  tipo_documento  TEXT NOT NULL, -- diploma | cv | certificado | pos_graduacao | outros
  nome_ficheiro   TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  tamanho_bytes   BIGINT,
  mime_type       TEXT,
  validade        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Alunos ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_alunos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL,
  nome             TEXT NOT NULL,
  email            TEXT,
  cpf              TEXT,
  telefone         TEXT,
  data_nascimento  DATE,
  status           TEXT NOT NULL DEFAULT 'ativo', -- ativo | egresso | inativo
  empresa_trabalho TEXT,
  foto_url         TEXT,
  ativo            BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Turmas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_turmas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL,
  titulo      TEXT NOT NULL,
  curso_id    UUID REFERENCES public.school_cursos(id),
  docente_id  UUID REFERENCES public.school_docentes(id),
  status      TEXT NOT NULL DEFAULT 'aberta', -- aberta | em_andamento | concluida | cancelada
  modalidade  TEXT DEFAULT 'presencial',
  inicio      DATE,
  fim         DATE,
  vagas       INTEGER,
  local       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Matrículas ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_matriculas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL,
  aluno_id       UUID NOT NULL REFERENCES public.school_alunos(id),
  turma_id       UUID NOT NULL REFERENCES public.school_turmas(id),
  status         TEXT NOT NULL DEFAULT 'confirmada', -- confirmada | em_andamento | concluida | cancelada | reprovada
  data_matricula DATE NOT NULL DEFAULT CURRENT_DATE,
  nota_final     NUMERIC(5,2),
  observacoes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(aluno_id, turma_id)
);

-- ── Certificados ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_certificados (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL,
  aluno_id    UUID NOT NULL REFERENCES public.school_alunos(id),
  turma_id    UUID NOT NULL REFERENCES public.school_turmas(id),
  docente_id  UUID REFERENCES public.school_docentes(id),
  codigo      TEXT NOT NULL UNIQUE,
  emitido_em  DATE NOT NULL DEFAULT CURRENT_DATE,
  validade_em DATE,
  url_pdf     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Clientes Corporativos ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_clientes_corp (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL,
  nome             TEXT NOT NULL,
  cnpj             TEXT,
  contato_nome     TEXT,
  contato_email    TEXT,
  contato_telefone TEXT,
  contrato_inicio  DATE,
  contrato_fim     DATE,
  nrs              TEXT[] DEFAULT '{}',
  observacoes      TEXT,
  ativo            BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.school_cursos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_docentes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_docentes_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_alunos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_turmas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_matriculas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_certificados       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_clientes_corp      ENABLE ROW LEVEL SECURITY;

-- Função de helper: usa empresa_padrao do utilizador
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT empresa_padrao FROM public.liberty_utilizadores
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Policies por tabela (DROP IF EXISTS para ser idempotente)
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'school_cursos','school_docentes','school_docentes_documentos',
    'school_alunos','school_turmas','school_matriculas',
    'school_certificados','school_clientes_corp'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "school_%s_empresa" ON public.%s', t, t);
    EXECUTE format(
      'CREATE POLICY "school_%s_empresa" ON public.%s
       USING (empresa_id = public.get_user_empresa_id())
       WITH CHECK (empresa_id = public.get_user_empresa_id())',
      t, t
    );
  END LOOP;
END $$;

-- ── Índices de performance ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_school_cursos_empresa     ON public.school_cursos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_school_docentes_empresa   ON public.school_docentes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_school_docentes_docs      ON public.school_docentes_documentos(docente_id);
CREATE INDEX IF NOT EXISTS idx_school_alunos_empresa     ON public.school_alunos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_school_turmas_empresa     ON public.school_turmas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_school_turmas_curso       ON public.school_turmas(curso_id);
CREATE INDEX IF NOT EXISTS idx_school_matriculas_empresa ON public.school_matriculas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_school_matriculas_aluno   ON public.school_matriculas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_school_matriculas_turma   ON public.school_matriculas(turma_id);
CREATE INDEX IF NOT EXISTS idx_school_certs_empresa      ON public.school_certificados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_school_certs_aluno        ON public.school_certificados(aluno_id);
CREATE INDEX IF NOT EXISTS idx_school_corp_empresa       ON public.school_clientes_corp(empresa_id);
