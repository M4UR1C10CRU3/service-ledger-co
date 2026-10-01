-- ============================================================================
-- QUADROS — motor único de processos para todo o Clariza
-- ============================================================================
-- CONTEXTO. O Clariza tinha duas soluções a fazer o mesmo: os Workflows
-- (Comercial, Compras, Produção, Financeiro) e os Quadros. Os Workflows tinham
-- o processo pensado — colunas, estados, regras — mas ZERO colaboração: nem
-- comentar, nem anexar, nem atribuir. Os Quadros tinham tudo isso e nenhuma
-- ligação ao negócio. A equipa escolheu os Quadros e abandonou os Workflows.
--
-- CONSEQUÊNCIA. Como o cartão é texto livre, nada se pode automatizar: não se
-- envia uma encomenda a um fornecedor que o sistema não sabe quem é.
--
-- ESTA MIGRATION resolve as duas coisas de uma vez:
--   1. O quadro passa a ter TIPO, e as colunas passam a ter REGRAS —
--      exatamente as que estavam pensadas nos Workflows, aqui herdadas.
--   2. O cartão ganha ESTRUTURA (cliente, fornecedor, valor, responsável),
--      que é o que torna a automação possível.
--   3. Entra o motor de AUTOMAÇÕES: quando X acontece, faz Y.
--
-- PRINCÍPIO QUE NÃO SE NEGOCEIA: a estrutura é PROGRESSIVA. O cartão cria-se
-- com um título, como hoje. É a COLUNA que exige o que precisa, no momento em
-- que se tenta lá entrar. Foi a exigência à cabeça que matou os Workflows.
-- E um quadro do tipo 'livre' continua sempre a existir, sem regra nenhuma.
--
-- NÃO-DESTRUTIVO: só acrescenta. Os quadros e cartões atuais continuam a
-- funcionar exatamente como estão — passam a ser do tipo 'livre'.
-- ============================================================================

-- ── 1. O quadro ganha tipo ──────────────────────────────────────────────────
ALTER TABLE public.quadros
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'livre',
  ADD COLUMN IF NOT EXISTS modelo_codigo TEXT;

-- ── 2. As colunas ganham as regras que estavam nos Workflows ────────────────
ALTER TABLE public.quadro_listas
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS estado_codigo TEXT,
  ADD COLUMN IF NOT EXISTS campos_obrigatorios JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS final BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bloqueada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cor TEXT;

-- Backfill do empresa_id a partir do quadro (a tabela não o tinha; herdava
-- pela ligação, o que impede políticas de segurança diretas).
UPDATE public.quadro_listas l
SET empresa_id = q.empresa_id
FROM public.quadros q
WHERE l.quadro_id = q.id AND l.empresa_id IS NULL;

-- ── 3. O cartão ganha estrutura — é isto que destranca a automação ─────────
ALTER TABLE public.quadro_cartoes
  ADD COLUMN IF NOT EXISTS cliente_id       UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_id      UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsavel_id   UUID REFERENCES public.liberty_utilizadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsavel_nome TEXT,
  ADD COLUMN IF NOT EXISTS contacto_email   TEXT,
  -- Campos específicos de cada tipo, sem obrigar a uma tabela por tipo
  ADD COLUMN IF NOT EXISTS dados            JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Ligação a um documento real quando o cartão o representa
  ADD COLUMN IF NOT EXISTS doc_tipo         TEXT,
  ADD COLUMN IF NOT EXISTS doc_id           UUID,
  -- Rasto de movimento, para as automações de "parado há N dias"
  ADD COLUMN IF NOT EXISTS movido_em        TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS quadro_cartoes_doc_idx ON public.quadro_cartoes(doc_tipo, doc_id);
CREATE INDEX IF NOT EXISTS quadro_cartoes_movido_idx ON public.quadro_cartoes(movido_em);

-- Trigger: sempre que o cartão muda de coluna, marca a data do movimento.
CREATE OR REPLACE FUNCTION public.quadro_marca_movimento()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lista_id IS DISTINCT FROM OLD.lista_id THEN
    NEW.movido_em := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS quadro_cartoes_movimento ON public.quadro_cartoes;
CREATE TRIGGER quadro_cartoes_movimento
  BEFORE UPDATE ON public.quadro_cartoes
  FOR EACH ROW EXECUTE FUNCTION public.quadro_marca_movimento();

-- ── 4. Modelos de quadro ────────────────────────────────────────────────────
-- As colunas dos Workflows não eram arbitrárias — alguém pensou o processo.
-- Passam a ser modelos reutilizáveis, em vez de morrerem com o código.
CREATE TABLE IF NOT EXISTS public.quadro_modelos (
  codigo    TEXT PRIMARY KEY,
  nome      TEXT NOT NULL,
  tipo      TEXT NOT NULL,
  descricao TEXT,
  doc_tipo  TEXT,          -- documento que os cartões representam, se algum
  ordem     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.quadro_modelo_listas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_codigo  TEXT NOT NULL REFERENCES public.quadro_modelos(codigo) ON DELETE CASCADE,
  estado_codigo  TEXT NOT NULL,
  nome           TEXT NOT NULL,
  cor            TEXT,
  posicao        INTEGER NOT NULL,
  campos_obrigatorios JSONB NOT NULL DEFAULT '[]'::jsonb,
  final          BOOLEAN NOT NULL DEFAULT FALSE,
  bloqueada      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (modelo_codigo, estado_codigo)
);

ALTER TABLE public.quadro_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quadro_modelo_listas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quadro_modelos_leitura ON public.quadro_modelos;
CREATE POLICY quadro_modelos_leitura ON public.quadro_modelos
  FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS quadro_modelo_listas_leitura ON public.quadro_modelo_listas;
CREATE POLICY quadro_modelo_listas_leitura ON public.quadro_modelo_listas
  FOR SELECT TO authenticated USING (TRUE);

INSERT INTO public.quadro_modelos (codigo, nome, tipo, descricao, doc_tipo, ordem) VALUES
  ('livre',       'Quadro livre',            'livre',      'Sem processo nem regras — para ideias, tarefas internas e tudo o que não é um documento.', NULL, 0),
  ('compras',     'Compras / Encomendas',    'compras',    'Do pedido de cotação à fatura do fornecedor.', 'nota_encomenda', 1),
  ('comercial',   'Comercial',               'comercial',  'Do pedido do cliente à adjudicação.',          'oportunidade',   2),
  ('producao',    'Produção',                'producao',   'Da ordem de serviço à faturação.',             'ordem_servico',  3),
  ('cobrancas',   'Cobranças',               'financeiro', 'Do débito ao acordo ou liquidação.',           'debito',         4),
  ('recebimentos','Recebimentos',            'financeiro', 'Da fatura enviada ao recebimento.',            'receita',        5),
  ('pagamentos',  'Pagamentos a fornecedor', 'financeiro', 'Do pagamento pendente à confirmação.',         'conta_pagar',    6)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.quadro_modelo_listas
  (modelo_codigo, estado_codigo, nome, cor, posicao, campos_obrigatorios, final, bloqueada) VALUES

-- COMPRAS — herdado de ComprasKanban
('compras','rascunho',         'Rascunho',        '#94a3b8',0,'[]'::jsonb,                        FALSE,FALSE),
('compras','enviada',          'Cotação Pedida',  '#f59e0b',1,'["supplier_id","contacto_email"]'::jsonb, FALSE,FALSE),
('compras','cotacao_recebida', 'Cotação Recebida','#6366f1',2,'["valor"]'::jsonb,                 FALSE,FALSE),
('compras','aprovada',         'Aprovada',        '#06b6d4',3,'["responsavel_id"]'::jsonb,        FALSE,FALSE),
('compras','encomendada',      'NE Emitida',      '#f97316',4,'[]'::jsonb,                        FALSE,FALSE),
('compras','recebida',         'Entregue',        '#22c55e',5,'[]'::jsonb,                        FALSE,FALSE),
('compras','faturada',         'Faturada',        '#a855f7',6,'[]'::jsonb,                        TRUE, FALSE),
('compras','cancelada',        'Cancelada',       '#f43f5e',7,'[]'::jsonb,                        TRUE, TRUE),

-- COMERCIAL — herdado de FASES_CONFIG do Workflow Comercial
('comercial','po_recebido',        'PO Recebido',            '#6B7280',0,'["cliente_id"]'::jsonb, FALSE,FALSE),
('comercial','em_analise',         'Em Análise',             '#3B82F6',1,'[]'::jsonb,             FALSE,FALSE),
('comercial','proposta_elaboracao','Proposta em Elaboração', '#8B5CF6',2,'["responsavel_id"]'::jsonb, FALSE,FALSE),
('comercial','proposta_enviada',   'Proposta Enviada',       '#F97316',3,'["valor","contacto_email"]'::jsonb, FALSE,FALSE),
('comercial','em_negociacao',      'Em Negociação',          '#EAB308',4,'[]'::jsonb,             FALSE,FALSE),
('comercial','adjudicado',         'Adjudicado',             '#22C55E',5,'[]'::jsonb,             TRUE, FALSE),
('comercial','perdido',            'Perdido',                '#EF4444',6,'[]'::jsonb,             TRUE, FALSE),

-- PRODUÇÃO — herdado de OS_ESTADOS
('producao','nova',       'Nova',        '#3B82F6',0,'["cliente_id"]'::jsonb,     FALSE,FALSE),
('producao','aprovada',   'Aprovada',    '#6366F1',1,'[]'::jsonb,                 FALSE,FALSE),
('producao','em_execucao','Em Execução', '#F59E0B',2,'["responsavel_id"]'::jsonb, FALSE,FALSE),
('producao','concluida',  'Concluída',   '#22C55E',3,'[]'::jsonb,                 FALSE,FALSE),
('producao','faturada',   'Faturada',    '#A855F7',4,'["valor"]'::jsonb,          TRUE, FALSE),
('producao','cancelada',  'Cancelada',   '#9CA3AF',5,'[]'::jsonb,                 TRUE, TRUE),

-- COBRANÇAS — herdado da raia de cobranças do Workflow Financeiro
('cobrancas','em_debito',         'Em Débito',   '#ef4444',0,'["cliente_id","valor"]'::jsonb, FALSE,FALSE),
('cobrancas','primeira_cobranca', '1.ª Cobrança','#f97316',1,'["contacto_email"]'::jsonb,     FALSE,FALSE),
('cobrancas','segunda_cobranca',  '2.ª Cobrança','#f59e0b',2,'[]'::jsonb,                     FALSE,FALSE),
('cobrancas','em_acordo',         'Em Acordo',   '#6366f1',3,'[]'::jsonb,                     FALSE,FALSE),
('cobrancas','liquidado',         'Liquidado',   '#22c55e',4,'[]'::jsonb,                     TRUE, TRUE),

-- RECEBIMENTOS
('recebimentos','aguardando',     'Aguardando',       '#94a3b8',0,'["cliente_id","valor"]'::jsonb, FALSE,FALSE),
('recebimentos','fatura_enviada', 'Fatura Enviada',   '#f59e0b',1,'["contacto_email"]'::jsonb,     FALSE,FALSE),
('recebimentos','parcial',        'Pagamento Parcial','#6366f1',2,'[]'::jsonb,                     FALSE,FALSE),
('recebimentos','recebido',       'Recebido',         '#22c55e',3,'[]'::jsonb,                     TRUE, TRUE),

-- PAGAMENTOS
('pagamentos','pendente',             'Aguardando Pagamento','#f59e0b',0,'["supplier_id","valor"]'::jsonb, FALSE,FALSE),
('pagamentos','comprovativo_enviado', 'Comprovativo Enviado','#6366f1',1,'[]'::jsonb,                      FALSE,FALSE),
('pagamentos','confirmado',           'Confirmado',          '#22c55e',2,'[]'::jsonb,                      TRUE, TRUE)

ON CONFLICT (modelo_codigo, estado_codigo) DO NOTHING;

-- ── 5. Criar um quadro a partir de um modelo ────────────────────────────────
CREATE OR REPLACE FUNCTION public.quadro_criar_de_modelo(
  p_empresa_id UUID, p_modelo TEXT, p_nome TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quadro UUID;
  v_tipo   TEXT;
BEGIN
  IF NOT user_has_empresa_access(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem acesso a esta empresa.';
  END IF;
  SELECT tipo INTO v_tipo FROM quadro_modelos WHERE codigo = p_modelo;
  IF v_tipo IS NULL THEN RAISE EXCEPTION 'Modelo de quadro inexistente: %', p_modelo; END IF;

  INSERT INTO quadros (empresa_id, nome, tipo, modelo_codigo)
  VALUES (p_empresa_id, p_nome, v_tipo, p_modelo)
  RETURNING id INTO v_quadro;

  INSERT INTO quadro_listas
    (quadro_id, empresa_id, nome, posicao, estado_codigo, campos_obrigatorios, final, bloqueada, cor)
  SELECT v_quadro, p_empresa_id, ml.nome, ml.posicao, ml.estado_codigo,
         ml.campos_obrigatorios, ml.final, ml.bloqueada, ml.cor
  FROM quadro_modelo_listas ml
  WHERE ml.modelo_codigo = p_modelo
  ORDER BY ml.posicao;

  RETURN v_quadro;
END $$;

-- ── 6. Validação: o cartão tem o que a coluna exige? ────────────────────────
-- Devolve os campos em falta. Vazio = pode avançar.
-- A UI chama isto ANTES de mover, para explicar em vez de recusar em silêncio.
CREATE OR REPLACE FUNCTION public.quadro_campos_em_falta(
  p_cartao_id UUID, p_lista_destino UUID
) RETURNS TEXT[]
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req   JSONB;
  v_card  RECORD;
  v_falta TEXT[] := '{}';
  v_campo TEXT;
BEGIN
  SELECT campos_obrigatorios INTO v_req FROM quadro_listas WHERE id = p_lista_destino;
  IF v_req IS NULL OR jsonb_array_length(v_req) = 0 THEN RETURN v_falta; END IF;

  SELECT * INTO v_card FROM quadro_cartoes WHERE id = p_cartao_id;
  IF v_card IS NULL THEN RETURN ARRAY['cartao_inexistente']; END IF;

  FOR v_campo IN SELECT jsonb_array_elements_text(v_req) LOOP
    IF (v_campo = 'cliente_id'     AND v_card.cliente_id     IS NULL)
    OR (v_campo = 'supplier_id'    AND v_card.supplier_id    IS NULL)
    OR (v_campo = 'responsavel_id' AND v_card.responsavel_id IS NULL)
    OR (v_campo = 'contacto_email' AND COALESCE(v_card.contacto_email,'') = '')
    OR (v_campo = 'valor'          AND v_card.valor          IS NULL)
    OR (v_campo = 'data_limite'    AND v_card.data_limite    IS NULL)
    OR (v_campo = 'descricao'      AND COALESCE(v_card.descricao,'') = '')
    THEN
      v_falta := array_append(v_falta, v_campo);
    END IF;
  END LOOP;
  RETURN v_falta;
END $$;

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
