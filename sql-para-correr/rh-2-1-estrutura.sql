-- RH (01/10/2026) — PASSO 1 de 3: estrutura. Só ACRESCENTA colunas e tabelas; não altera nem apaga dados.
-- Recrutamento: vaga ligada a uma Função; análise do CV cruzada com a vaga; guião, respostas e relatório da entrevista;
-- decisão da direção. Avaliação de desempenho: biblioteca de critérios e perfis de atividade com pesos.

-- ── Recrutamento ────────────────────────────────────────────────────────────
ALTER TABLE public.rh_vagas      ADD COLUMN IF NOT EXISTS funcao_id   uuid REFERENCES public.rh_funcoes(id) ON DELETE SET NULL;
ALTER TABLE public.rh_vagas      ADD COLUMN IF NOT EXISTS competencias text;

ALTER TABLE public.rh_candidatos ADD COLUMN IF NOT EXISTS cv_path      text;         -- caminho no armazenamento privado «cvs»
ALTER TABLE public.rh_candidatos ADD COLUMN IF NOT EXISTS ia_analise   jsonb;        -- análise cruzada com a vaga
ALTER TABLE public.rh_candidatos ADD COLUMN IF NOT EXISTS ia_aderencia integer;      -- 0 a 100
ALTER TABLE public.rh_candidatos ADD COLUMN IF NOT EXISTS decisao      text;         -- contratar | reserva | nao_contratar
ALTER TABLE public.rh_candidatos ADD COLUMN IF NOT EXISTS decisao_nota text;
ALTER TABLE public.rh_candidatos ADD COLUMN IF NOT EXISTS decisao_por  text;
ALTER TABLE public.rh_candidatos ADD COLUMN IF NOT EXISTS decisao_em   timestamptz;

ALTER TABLE public.rh_entrevistas ADD COLUMN IF NOT EXISTS guiao         jsonb;      -- perguntas, o que procurar, notas 1/3/5, pesos
ALTER TABLE public.rh_entrevistas ADD COLUMN IF NOT EXISTS respostas     jsonb;      -- { id_pergunta: { resposta, nota } }
ALTER TABLE public.rh_entrevistas ADD COLUMN IF NOT EXISTS relatorio     jsonb;      -- resumo da entrevista feito pela IA
ALTER TABLE public.rh_entrevistas ADD COLUMN IF NOT EXISTS pontuacao_100 numeric(5,1);

-- ── Avaliação de desempenho ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rh_criterios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id    uuid NOT NULL REFERENCES public.empresa_grupos(id) ON DELETE CASCADE,
  codigo      text NOT NULL,
  nome        text NOT NULL,
  categoria   text NOT NULL DEFAULT 'comportamental',   -- comportamental | tecnica | qualidade | seguranca | gestao
  descricao   text,
  ancora_1    text,   -- o que é uma nota 1
  ancora_3    text,   -- o que é uma nota 3
  ancora_5    text,   -- o que é uma nota 5
  ordem       integer NOT NULL DEFAULT 0,
  ativo       boolean NOT NULL DEFAULT true,
  UNIQUE (grupo_id, codigo)
);

CREATE TABLE IF NOT EXISTS public.rh_aval_perfis (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id    uuid NOT NULL REFERENCES public.empresa_grupos(id) ON DELETE CASCADE,
  codigo      text NOT NULL,
  nome        text NOT NULL,
  descricao   text,
  criterios   jsonb NOT NULL DEFAULT '[]'::jsonb,       -- [{ "codigo": "retrabalho", "peso": 15 }, ...]
  ordem       integer NOT NULL DEFAULT 0,
  ativo       boolean NOT NULL DEFAULT true,
  UNIQUE (grupo_id, codigo)
);

ALTER TABLE public.rh_funcoes    ADD COLUMN IF NOT EXISTS perfil_avaliacao_id uuid REFERENCES public.rh_aval_perfis(id) ON DELETE SET NULL;
ALTER TABLE public.rh_avaliacoes ADD COLUMN IF NOT EXISTS perfil_id     uuid REFERENCES public.rh_aval_perfis(id) ON DELETE SET NULL;
ALTER TABLE public.rh_avaliacoes ADD COLUMN IF NOT EXISTS respostas     jsonb;   -- { codigo: { nota, evidencia } }
ALTER TABLE public.rh_avaliacoes ADD COLUMN IF NOT EXISTS pontuacao_100 numeric(5,1);

-- Acesso: o mesmo das Funções — quem tem acesso a uma empresa do grupo.
ALTER TABLE public.rh_criterios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_aval_perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rh_criterios_acesso ON public.rh_criterios;
CREATE POLICY rh_criterios_acesso ON public.rh_criterios FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM empresas e WHERE e.grupo_id = rh_criterios.grupo_id AND user_has_empresa_access(e.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM empresas e WHERE e.grupo_id = rh_criterios.grupo_id AND user_has_empresa_access(e.id)));

DROP POLICY IF EXISTS rh_aval_perfis_acesso ON public.rh_aval_perfis;
CREATE POLICY rh_aval_perfis_acesso ON public.rh_aval_perfis FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM empresas e WHERE e.grupo_id = rh_aval_perfis.grupo_id AND user_has_empresa_access(e.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM empresas e WHERE e.grupo_id = rh_aval_perfis.grupo_id AND user_has_empresa_access(e.id)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rh_criterios, public.rh_aval_perfis TO authenticated;

SELECT 'estrutura RH criada' AS resultado;
