-- ============================================================================
-- Descrições de função no RH — bloco 1 de 6: a estrutura
-- ----------------------------------------------------------------------------
-- Hoje um cargo é só um nome com uma descrição em texto livre. Isso não guarda
-- uma descrição de função a sério: responsabilidades por área, o que NÃO é do
-- cargo, fluxos com passos, indicadores, requisitos.
--
-- As secções ficam em JSONB porque cada função tem um conjunto diferente delas
-- — obrigar todas ao mesmo molde daria campos vazios em metade dos cargos. O
-- ecrã percorre o que existe e desenha; o que não existe não aparece.
--
-- ÂMBITO: o GRUPO. As cinco empresas partilham colaboradores, logo partilham
-- as descrições de função. Ver a decisão de âmbito de dados por grupo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rh_funcoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id      UUID REFERENCES public.empresa_grupos(id) ON DELETE CASCADE,
  codigo        TEXT NOT NULL,
  nome          TEXT NOT NULL,
  departamento  TEXT,
  nivel         TEXT NOT NULL DEFAULT 'assistente'
                CHECK (nivel IN ('direcao','tecnico','assistente','operacional')),
  cor           TEXT,                       -- identifica a função no ecrã
  missao        TEXT NOT NULL,
  reporta_a     TEXT,
  local_trabalho TEXT,
  horario       TEXT,
  ferramentas   TEXT,

  -- {obrigatorios: [], valorizados: []}
  requisitos    JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- [{area, itens: []}]
  responsabilidades JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [] — o que NÃO é do cargo. É o que evita a conversa do "pensei que fosses tu".
  nao_e_do_cargo JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- {profissionais: [], comportamentais: []}
  competencias  JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- [{titulo, passos: [{titulo, descricao}], nota}]
  fluxos        JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [] — como se avalia quem ocupa o cargo
  indicadores   JSONB NOT NULL DEFAULT '[]'::jsonb,

  revisao       DATE NOT NULL DEFAULT CURRENT_DATE,
  substitui     TEXT,
  ordem         INTEGER NOT NULL DEFAULT 0,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (grupo_id, codigo)
);

CREATE INDEX IF NOT EXISTS rh_funcoes_grupo_idx ON public.rh_funcoes(grupo_id, ordem);

-- ── As passagens entre funções ──────────────────────────────────────────────
-- Vivem à parte porque não pertencem a nenhuma função: pertencem às DUAS. É
-- exatamente por não terem dono declarado que o trabalho pára entre cadeiras.
CREATE TABLE IF NOT EXISTS public.rh_funcao_passagens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id    UUID NOT NULL REFERENCES public.empresa_grupos(id) ON DELETE CASCADE,
  momento     TEXT NOT NULL,
  entrega     TEXT NOT NULL,
  recebe      TEXT NOT NULL,
  leva_junto  TEXT,
  ordem       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS rh_passagens_grupo_idx ON public.rh_funcao_passagens(grupo_id, ordem);

-- ── Ligar a pessoa à função ─────────────────────────────────────────────────
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS funcao_id UUID REFERENCES public.rh_funcoes(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.employees.funcao_id IS
  'Descrição de função atribuída. O job_position continua a ser o título no contrato; isto é o que a pessoa faz.';

-- ── Segurança ───────────────────────────────────────────────────────────────
ALTER TABLE public.rh_funcoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_funcao_passagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rh_funcoes_acesso ON public.rh_funcoes;
CREATE POLICY rh_funcoes_acesso ON public.rh_funcoes
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM empresas e
                       WHERE e.grupo_id = rh_funcoes.grupo_id
                         AND user_has_empresa_access(e.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM empresas e
                       WHERE e.grupo_id = rh_funcoes.grupo_id
                         AND user_has_empresa_access(e.id)));

DROP POLICY IF EXISTS rh_passagens_acesso ON public.rh_funcao_passagens;
CREATE POLICY rh_passagens_acesso ON public.rh_funcao_passagens
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM empresas e
                       WHERE e.grupo_id = rh_funcao_passagens.grupo_id
                         AND user_has_empresa_access(e.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM empresas e
                       WHERE e.grupo_id = rh_funcao_passagens.grupo_id
                         AND user_has_empresa_access(e.id)));

SELECT 'estrutura criada' AS resultado;
