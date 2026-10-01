-- ── 7. Automações ───────────────────────────────────────────────────────────
-- Quando [gatilho] e se [condição] → então [ação].
-- As ações simples (email a partir dos modelos que já existem, notificação
-- interna) correm dentro do Clariza; o que for externo delega no n8n por
-- webhook, que já corre no servidor e já faz trabalho pesado todas as noites.
CREATE TABLE IF NOT EXISTS public.quadro_automacoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  -- Aplica-se a um quadro concreto, ou a todos os quadros de um modelo
  quadro_id     UUID REFERENCES public.quadros(id) ON DELETE CASCADE,
  modelo_codigo TEXT REFERENCES public.quadro_modelos(codigo) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,

  gatilho       TEXT NOT NULL CHECK (gatilho IN
                ('entra_lista','sai_lista','sem_movimento','data_limite','campo_alterado')),
  gatilho_estado_codigo TEXT,   -- para entra_lista / sai_lista
  gatilho_dias  INTEGER,        -- para sem_movimento / data_limite
  gatilho_campo TEXT,           -- para campo_alterado

  condicao      JSONB NOT NULL DEFAULT '{}'::jsonb,

  accao         TEXT NOT NULL CHECK (accao IN
                ('email','notificacao_interna','criar_documento','webhook')),
  accao_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- email:               {modelo, destinatario: cliente|fornecedor|responsavel|fixo, para}
  -- notificacao_interna: {perfil_destino, titulo, mensagem}
  -- criar_documento:     {doc_tipo}
  -- webhook:             {url}   ← n8n

  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (quadro_id IS NOT NULL OR modelo_codigo IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS quadro_automacoes_emp_idx ON public.quadro_automacoes(empresa_id, ativo);

ALTER TABLE public.quadro_automacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quadro_automacoes_empresa ON public.quadro_automacoes;
CREATE POLICY quadro_automacoes_empresa ON public.quadro_automacoes
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

-- Registo de execuções: sem isto, uma automação que falha falha em silêncio —
-- e o utilizador fica a achar que o email foi enviado.
CREATE TABLE IF NOT EXISTS public.quadro_automacao_execucoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  automacao_id  UUID REFERENCES public.quadro_automacoes(id) ON DELETE SET NULL,
  cartao_id     UUID REFERENCES public.quadro_cartoes(id) ON DELETE CASCADE,
  estado        TEXT NOT NULL CHECK (estado IN ('sucesso','falha','ignorada')),
  detalhe       TEXT,
  executado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quadro_aut_exec_idx ON public.quadro_automacao_execucoes(empresa_id, executado_em DESC);

ALTER TABLE public.quadro_automacao_execucoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quadro_automacao_execucoes_empresa ON public.quadro_automacao_execucoes;
CREATE POLICY quadro_automacao_execucoes_empresa ON public.quadro_automacao_execucoes
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

-- ── 8. Segurança das listas ─────────────────────────────────────────────────
-- quadro_listas não tinha empresa_id, pelo que não podia ter política própria.
-- Agora tem — mas só se aplica depois do backfill acima ter corrido.
ALTER TABLE public.quadro_listas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quadro_listas_empresa ON public.quadro_listas;
CREATE POLICY quadro_listas_empresa ON public.quadro_listas
  FOR ALL
  USING      (empresa_id IS NULL OR (SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK (empresa_id IS NULL OR (SELECT user_has_empresa_access(empresa_id)));

-- ============================================================================
-- NOTA DE APLICAÇÃO
-- ============================================================================
-- Nada muda para quem usa os Quadros hoje: todos passam a ser do tipo 'livre',
-- sem colunas obrigatórias e sem automações. Os processos só aparecem quando
-- alguém criar um quadro a partir de um modelo:
--
--   SELECT quadro_criar_de_modelo('<uuid-empresa>', 'compras', 'Compras 2026');
--
-- Os Workflows antigos ficam intactos por agora — só se reformam depois de o
-- motor novo estar testado com uso real.
-- ============================================================================
