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

