-- ============================================================================
-- CLARIZA AGENCY — o resto do modelo do Operand
-- ============================================================================
-- Continuação de 20260801120000 (Projetos · Jobs · Tarefas · Apontamentos).
-- Aqui entra tudo o resto: catálogo, textos, briefings, propostas de agência,
-- avenças, produção com cotação comparativa, meios, e os padrões transversais.
--
-- Mantém as MESMAS regras da fundação:
--   · empresa_id NOT NULL em todas as tabelas, incluindo filhas
--   · política RLS com USING **e** WITH CHECK
--   · FKs compostas (id, empresa_id) para impedir referências entre empresas
--   · nada específico de um país hardcoded — campos BR ficam no modelo e são
--     escondidos pela interface conforme ag_empresas_vertical.pais
--
-- NÃO-DESTRUTIVO: só cria objetos novos com prefixo ag_.
-- ============================================================================

-- Atalho para não repetir a política em 20 tabelas.
CREATE OR REPLACE FUNCTION public.ag_aplica_rls(p_tabela TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_tabela);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_tabela || '_empresa', p_tabela);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR ALL
       USING ((SELECT user_has_empresa_access(empresa_id)))
       WITH CHECK ((SELECT user_has_empresa_access(empresa_id)))',
    p_tabela || '_empresa', p_tabela);
END $$;

-- ============================================================================
-- 1. CONTACTOS DO CLIENTE  (o card "Próximos aniversários" do Operand)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ag_cliente_contactos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id       UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  cargo            TEXT,
  email            TEXT,
  telefone         TEXT,
  data_aniversario DATE,
  principal        BOOLEAN NOT NULL DEFAULT FALSE,
  notas            TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, empresa_id)
);
CREATE INDEX IF NOT EXISTS ag_cliente_contactos_cli_idx ON public.ag_cliente_contactos(cliente_id);
SELECT public.ag_aplica_rls('ag_cliente_contactos');

-- ============================================================================
-- 2. CATÁLOGO DE PEÇAS E SERVIÇOS
-- ============================================================================
-- Alimenta as linhas da proposta. NÃO é `produtos` (catálogo de bens físicos,
-- ligado a stock) nem `services` (que apesar do nome é o ledger de faturação).
-- horas_previstas_padrao é o que torna possível "lançar itens na pauta de jobs".

CREATE TABLE IF NOT EXISTS public.ag_item_categorias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  ordem      INTEGER NOT NULL DEFAULT 0,
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_item_categorias');

CREATE TABLE IF NOT EXISTS public.ag_itens_catalogo (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria_id          UUID,
  codigo                TEXT,
  designacao            TEXT NOT NULL,
  descricao             TEXT,
  unidade               TEXT NOT NULL DEFAULT 'und',
  preco_unitario        NUMERIC(12,2),
  horas_previstas_padrao NUMERIC(6,2),
  ativo                 BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (categoria_id, empresa_id)
    REFERENCES public.ag_item_categorias(id, empresa_id) ON DELETE SET NULL,
  UNIQUE (id, empresa_id)
);
CREATE INDEX IF NOT EXISTS ag_itens_catalogo_emp_idx ON public.ag_itens_catalogo(empresa_id, ativo);
SELECT public.ag_aplica_rls('ag_itens_catalogo');

-- ============================================================================
-- 3. TEXTOS REUTILIZÁVEIS  (introdução, considerações, condições, observações)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ag_textos_padrao (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL CHECK (tipo IN
             ('introducao','consideracoes','condicoes_pagamento','obs_cliente','obs_fornecedor','validade')),
  nome       TEXT NOT NULL,
  conteudo   TEXT NOT NULL,
  padrao     BOOLEAN NOT NULL DEFAULT FALSE,
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (id, empresa_id)
);
CREATE INDEX IF NOT EXISTS ag_textos_padrao_tipo_idx ON public.ag_textos_padrao(empresa_id, tipo);
SELECT public.ag_aplica_rls('ag_textos_padrao');

-- ============================================================================
-- 4. BRIEFINGS  (o modelo de 16 pontos do Operand, reutilizável)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ag_briefing_modelos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  perguntas  JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{chave,pergunta,tipo,obrigatorio}]
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_briefing_modelos');

CREATE TABLE IF NOT EXISTS public.ag_briefings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  modelo_id      UUID,
  -- Briefing genérico: pode pendurar-se em projeto, job, proposta, produção…
  entidade_tipo  TEXT NOT NULL CHECK (entidade_tipo IN ('projeto','job','proposta','producao','midia')),
  entidade_id    UUID NOT NULL,
  respostas      JSONB NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por UUID,
  FOREIGN KEY (modelo_id, empresa_id)
    REFERENCES public.ag_briefing_modelos(id, empresa_id) ON DELETE SET NULL,
  UNIQUE (empresa_id, entidade_tipo, entidade_id)
);
SELECT public.ag_aplica_rls('ag_briefings');

-- ============================================================================
-- 5. PROPOSTA COMERCIAL DE AGÊNCIA
-- ============================================================================
-- Tabela PRÓPRIA, não extensão de `propostas`. Motivo: `propostas` está em
-- produção a servir Obrajusta/Resiserv/Tudo Casa; acrescentar-lhe dez colunas
-- de agência arriscava regressão em clientes reais. O vertical fica
-- independente, e o exportador PDF já existente é reaproveitado por composição.

CREATE TABLE IF NOT EXISTS public.ag_propostas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  projeto_id        UUID,
  sequencial        INTEGER NOT NULL,      -- o ".2" de "7.2"
  numero_documento  TEXT,                  -- numeração legal (EGEC 2026/12)
  cliente_id        UUID REFERENCES public.clientes(id) ON DELETE RESTRICT,
  cliente_nome      TEXT,
  titulo            TEXT,
  estado            TEXT NOT NULL DEFAULT 'rascunho' CHECK (estado IN
                    ('rascunho','aprovacao_interna','aprovacao_cliente','aprovada','recusada','expirada')),
  data_emissao      DATE NOT NULL DEFAULT CURRENT_DATE,
  validade_dias     INTEGER NOT NULL DEFAULT 30,
  responsavel_id    UUID REFERENCES public.liberty_utilizadores(id),
  responsavel_nome  TEXT,
  introducao        TEXT,
  consideracoes     TEXT,
  condicoes_pagamento TEXT,
  observacoes       TEXT,
  -- Fiscal: o regime vem de ag_regimes_fiscais, que já é bi-regional
  regime_fiscal_id  UUID REFERENCES public.ag_regimes_fiscais(id),
  taxa_imposto      NUMERIC(6,3),
  -- Receita da agência sobre custos externos (comissão/fee)
  comissao_pct      NUMERIC(5,2),
  total_sem_imposto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_imposto     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_com_imposto NUMERIC(12,2) NOT NULL DEFAULT 0,
  jobs_lancados     BOOLEAN NOT NULL DEFAULT FALSE,  -- já converteu em jobs?
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (projeto_id, empresa_id)
    REFERENCES public.ag_projetos(id, empresa_id) ON DELETE CASCADE,
  UNIQUE (id, empresa_id)
);
CREATE INDEX IF NOT EXISTS ag_propostas_projeto_idx ON public.ag_propostas(projeto_id);
CREATE INDEX IF NOT EXISTS ag_propostas_estado_idx  ON public.ag_propostas(empresa_id, estado);
SELECT public.ag_aplica_rls('ag_propostas');

CREATE TABLE IF NOT EXISTS public.ag_proposta_linhas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  proposta_id     UUID NOT NULL,
  ordem           INTEGER NOT NULL DEFAULT 0,
  tipo_linha      TEXT NOT NULL DEFAULT 'artigo' CHECK (tipo_linha IN ('artigo','seccao','texto','subtotal')),
  item_catalogo_id UUID,
  referencia      TEXT,
  designacao      TEXT,
  quantidade      NUMERIC(12,3) NOT NULL DEFAULT 1,
  unidade         TEXT NOT NULL DEFAULT 'und',
  preco_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_linha     NUMERIC(12,2) NOT NULL DEFAULT 0,
  horas_previstas NUMERIC(8,2),            -- vira job ao lançar na pauta
  externo         BOOLEAN NOT NULL DEFAULT FALSE,  -- custo de terceiros
  FOREIGN KEY (proposta_id, empresa_id)
    REFERENCES public.ag_propostas(id, empresa_id) ON DELETE CASCADE,
  FOREIGN KEY (item_catalogo_id, empresa_id)
    REFERENCES public.ag_itens_catalogo(id, empresa_id) ON DELETE SET NULL,
  UNIQUE (id, empresa_id)
);
CREATE INDEX IF NOT EXISTS ag_proposta_linhas_prop_idx ON public.ag_proposta_linhas(proposta_id, ordem);
SELECT public.ag_aplica_rls('ag_proposta_linhas');

-- Parcelas de faturação ("Receber de X") — a ponte para o Financeiro
CREATE TABLE IF NOT EXISTS public.ag_proposta_parcelas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  proposta_id   UUID NOT NULL,
  numero        INTEGER NOT NULL,
  total         INTEGER NOT NULL,          -- "2 de 3"
  descricao     TEXT,
  valor         NUMERIC(12,2) NOT NULL,
  data_vencimento DATE,
  forma_pagamento TEXT,
  estado        TEXT NOT NULL DEFAULT 'previsto' CHECK (estado IN ('previsto','faturado','recebido','anulado')),
  documento_ref TEXT,                      -- nº da fatura emitida fora do sistema
  FOREIGN KEY (proposta_id, empresa_id)
    REFERENCES public.ag_propostas(id, empresa_id) ON DELETE CASCADE,
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_proposta_parcelas');

-- ============================================================================
-- 6. CONTRATOS DE AVENÇA  (o "Contrato de Fee" — modelo dominante em PT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ag_contratos_avenca (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id        UUID REFERENCES public.clientes(id) ON DELETE RESTRICT,
  cliente_nome      TEXT,
  designacao        TEXT NOT NULL,
  valor_mensal      NUMERIC(12,2) NOT NULL,
  horas_contratadas NUMERIC(8,2),            -- por período
  periodicidade     TEXT NOT NULL DEFAULT 'mensal'
                    CHECK (periodicidade IN ('mensal','trimestral','semestral','anual')),
  data_inicio       DATE NOT NULL,
  data_fim          DATE,
  meses_duracao     INTEGER,                 -- o "12" de "3/12"
  estado            TEXT NOT NULL DEFAULT 'ativo'
                    CHECK (estado IN ('ativo','suspenso','terminado')),
  observacoes       TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_contratos_avenca');

CREATE TABLE IF NOT EXISTS public.ag_avenca_periodos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  contrato_id   UUID NOT NULL,
  numero        INTEGER NOT NULL,            -- o "3" de "3/12"
  periodo_inicio DATE NOT NULL,
  periodo_fim   DATE NOT NULL,
  valor         NUMERIC(12,2) NOT NULL,
  horas_contratadas NUMERIC(8,2),
  estado        TEXT NOT NULL DEFAULT 'previsto'
                CHECK (estado IN ('previsto','faturado','recebido')),
  FOREIGN KEY (contrato_id, empresa_id)
    REFERENCES public.ag_contratos_avenca(id, empresa_id) ON DELETE CASCADE,
  UNIQUE (contrato_id, numero),
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_avenca_periodos');

-- Ligação projeto ↔ avença (um projeto pode correr dentro de uma avença)
ALTER TABLE public.ag_projetos
  ADD COLUMN IF NOT EXISTS contrato_avenca_id UUID REFERENCES public.ag_contratos_avenca(id) ON DELETE SET NULL;

-- ============================================================================
-- 7. PRODUÇÃO  (cotação comparativa: item × quantidade × fornecedor)
-- ============================================================================
-- Três níveis, não uma tabela achatada — é o que permite cotar o mesmo item
-- em várias quantidades a vários fornecedores e comparar em grelha.

CREATE TABLE IF NOT EXISTS public.ag_producoes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  projeto_id       UUID NOT NULL,
  sequencial       INTEGER NOT NULL,
  titulo           TEXT NOT NULL,
  descricao        TEXT,
  estado           TEXT NOT NULL DEFAULT 'cotacao' CHECK (estado IN
                   ('cotacao','aprovacao_interna','aprovada','pedido_emitido','concluida','cancelada')),
  responsavel_id   UUID REFERENCES public.liberty_utilizadores(id),
  comissao_pct     NUMERIC(5,2),
  data_necessidade DATE,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (projeto_id, empresa_id)
    REFERENCES public.ag_projetos(id, empresa_id) ON DELETE CASCADE,
  UNIQUE (projeto_id, sequencial),
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_producoes');

CREATE TABLE IF NOT EXISTS public.ag_producao_itens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  producao_id   UUID NOT NULL,
  ordem         INTEGER NOT NULL DEFAULT 0,
  designacao    TEXT NOT NULL,
  especificacao TEXT,
  comissao_pct  NUMERIC(5,2),
  FOREIGN KEY (producao_id, empresa_id)
    REFERENCES public.ag_producoes(id, empresa_id) ON DELETE CASCADE,
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_producao_itens');

CREATE TABLE IF NOT EXISTS public.ag_producao_quantidades (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  item_id    UUID NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL,
  unidade    TEXT NOT NULL DEFAULT 'und',
  FOREIGN KEY (item_id, empresa_id)
    REFERENCES public.ag_producao_itens(id, empresa_id) ON DELETE CASCADE,
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_producao_quantidades');

CREATE TABLE IF NOT EXISTS public.ag_producao_cotacoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  item_id           UUID NOT NULL,
  supplier_id       UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  fornecedor_nome   TEXT,
  numero_orcamento  TEXT,
  entra_estimativa  BOOLEAN NOT NULL DEFAULT TRUE,
  prazo_dias        INTEGER,
  observacoes       TEXT,
  FOREIGN KEY (item_id, empresa_id)
    REFERENCES public.ag_producao_itens(id, empresa_id) ON DELETE CASCADE,
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_producao_cotacoes');

CREATE TABLE IF NOT EXISTS public.ag_producao_cotacao_valores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cotacao_id     UUID NOT NULL,
  quantidade_id  UUID NOT NULL,
  valor          NUMERIC(12,2) NOT NULL,
  aprovado       BOOLEAN NOT NULL DEFAULT FALSE,
  aprovado_em    TIMESTAMPTZ,
  aprovado_por   UUID,
  FOREIGN KEY (cotacao_id, empresa_id)
    REFERENCES public.ag_producao_cotacoes(id, empresa_id) ON DELETE CASCADE,
  FOREIGN KEY (quantidade_id, empresa_id)
    REFERENCES public.ag_producao_quantidades(id, empresa_id) ON DELETE CASCADE,
  UNIQUE (cotacao_id, quantidade_id),
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_producao_cotacao_valores');

-- Avaliação do fornecedor (a nota 4.25 / 5.00 na grelha de cotação do Operand).
-- Tabela própria e não uma coluna em suppliers: guarda histórico e motivo.
CREATE TABLE IF NOT EXISTS public.ag_fornecedor_avaliacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  producao_id UUID,
  nota        NUMERIC(3,2) NOT NULL CHECK (nota >= 0 AND nota <= 5),
  criterio    TEXT CHECK (criterio IN ('prazo','qualidade','preco','geral')),
  comentario  TEXT,
  avaliado_por UUID,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (producao_id, empresa_id)
    REFERENCES public.ag_producoes(id, empresa_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ag_forn_aval_sup_idx ON public.ag_fornecedor_avaliacoes(supplier_id);
SELECT public.ag_aplica_rls('ag_fornecedor_avaliacoes');

-- ============================================================================
-- 8. MEIOS / MÍDIA  (campos brasileiros preservados, escondidos pela UI em PT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ag_veiculos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  tipo_meio           TEXT CHECK (tipo_meio IN
                      ('tv','radio','jornal','revista','exterior','internet','cinema','outro')),
  supplier_id         UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  comissao_padrao_pct NUMERIC(5,2),
  -- Só usados no Brasil (ag_paises_config.usa_rede_afiliadas)
  rede                TEXT,
  tipo_rede           TEXT,
  ativo               BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_veiculos');

CREATE TABLE IF NOT EXISTS public.ag_midias (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  projeto_id     UUID NOT NULL,
  sequencial     INTEGER NOT NULL,
  veiculo_id     UUID,
  titulo         TEXT NOT NULL,
  periodo_inicio DATE,
  periodo_fim    DATE,
  comissao_pct   NUMERIC(5,2),
  valor_bruto    NUMERIC(12,2),
  estado         TEXT NOT NULL DEFAULT 'planeamento' CHECK (estado IN
                 ('planeamento','aprovacao_interna','aprovado','pedido_emitido','veiculado','cancelado')),
  -- Só usados no Brasil (praça, bonificação de volume)
  praca          TEXT,
  bonificacao_pct NUMERIC(5,2),
  observacoes    TEXT,
  FOREIGN KEY (projeto_id, empresa_id)
    REFERENCES public.ag_projetos(id, empresa_id) ON DELETE CASCADE,
  FOREIGN KEY (veiculo_id, empresa_id)
    REFERENCES public.ag_veiculos(id, empresa_id) ON DELETE SET NULL,
  UNIQUE (projeto_id, sequencial),
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_midias');

CREATE TABLE IF NOT EXISTS public.ag_midia_insercoes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  midia_id     UUID NOT NULL,
  peca         TEXT,
  formato      TEXT,
  data_inicio  DATE,
  data_fim     DATE,
  quantidade   INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(12,2),
  -- Só no Brasil: bi-semana de OOH
  bisemanas    INTEGER,
  FOREIGN KEY (midia_id, empresa_id)
    REFERENCES public.ag_midias(id, empresa_id) ON DELETE CASCADE,
  UNIQUE (id, empresa_id)
);
SELECT public.ag_aplica_rls('ag_midia_insercoes');

-- ============================================================================
-- 9. PADRÕES TRANSVERSAIS  (o "ADN" do Operand: envolvidos, comentários, anexos)
-- ============================================================================
-- Polimórficos por desenho: o Clariza tem hoje um par de tabelas por módulo
-- (cartao_*, marketing_*), o que multiplica o trabalho a cada documento novo.

CREATE TABLE IF NOT EXISTS public.ag_envolvidos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  entidade_tipo TEXT NOT NULL CHECK (entidade_tipo IN
                ('projeto','job','tarefa','proposta','producao','midia','avenca')),
  entidade_id   UUID NOT NULL,
  utilizador_id UUID REFERENCES public.liberty_utilizadores(id) ON DELETE CASCADE,
  utilizador_nome TEXT,
  papel         TEXT NOT NULL DEFAULT 'envolvido'
                CHECK (papel IN ('responsavel','envolvido','observador')),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, entidade_tipo, entidade_id, utilizador_id)
);
CREATE INDEX IF NOT EXISTS ag_envolvidos_ent_idx ON public.ag_envolvidos(entidade_tipo, entidade_id);
SELECT public.ag_aplica_rls('ag_envolvidos');

CREATE TABLE IF NOT EXISTS public.ag_comentarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  entidade_tipo TEXT NOT NULL CHECK (entidade_tipo IN
                ('projeto','job','tarefa','proposta','producao','midia','avenca')),
  entidade_id   UUID NOT NULL,
  autor_id      UUID REFERENCES public.liberty_utilizadores(id),
  autor_nome    TEXT,
  texto         TEXT NOT NULL,
  mencoes       JSONB NOT NULL DEFAULT '[]'::jsonb,  -- @menções
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ag_comentarios_ent_idx ON public.ag_comentarios(entidade_tipo, entidade_id, criado_em);
SELECT public.ag_aplica_rls('ag_comentarios');

CREATE TABLE IF NOT EXISTS public.ag_anexos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  entidade_tipo TEXT NOT NULL CHECK (entidade_tipo IN
                ('projeto','job','tarefa','proposta','producao','midia','avenca')),
  entidade_id   UUID NOT NULL,
  nome          TEXT NOT NULL,
  path          TEXT NOT NULL,        -- caminho no Storage privado, não URL público
  tamanho       BIGINT,
  mime          TEXT,
  carregado_por UUID,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ag_anexos_ent_idx ON public.ag_anexos(entidade_tipo, entidade_id);
SELECT public.ag_aplica_rls('ag_anexos');

-- ============================================================================
-- 10. VISTAS
-- ============================================================================

-- Rentabilidade do projeto, agora com receita (propostas aprovadas) e
-- custo externo (produção aprovada) — não só o custo das horas.
CREATE OR REPLACE VIEW public.ag_v_projeto_margem
WITH (security_invoker = on) AS
SELECT
  p.id                                   AS projeto_id,
  p.empresa_id,
  p.numero, p.nome, p.cliente_nome, p.estado, p.budget,
  COALESCE(h.custo_horas, 0)             AS custo_horas,
  COALESCE(h.horas, 0)                   AS horas_apontadas,
  COALESCE(r.receita, 0)                 AS receita_aprovada,
  COALESCE(x.custo_externo, 0)           AS custo_externo,
  COALESCE(r.receita, 0) - COALESCE(h.custo_horas, 0) - COALESCE(x.custo_externo, 0) AS margem
FROM public.ag_projetos p
LEFT JOIN (
  SELECT projeto_id,
         SUM(minutos)/60.0                                        AS horas,
         SUM((minutos/60.0) * COALESCE(custo_hora_snap,0))        AS custo_horas
  FROM public.ag_apontamentos GROUP BY projeto_id
) h ON h.projeto_id = p.id
LEFT JOIN (
  SELECT projeto_id, SUM(total_sem_imposto) AS receita
  FROM public.ag_propostas WHERE estado = 'aprovada' GROUP BY projeto_id
) r ON r.projeto_id = p.id
LEFT JOIN (
  SELECT pr.projeto_id, SUM(v.valor) AS custo_externo
  FROM public.ag_producoes pr
  JOIN public.ag_producao_itens i        ON i.producao_id = pr.id
  JOIN public.ag_producao_cotacoes c     ON c.item_id = i.id
  JOIN public.ag_producao_cotacao_valores v ON v.cotacao_id = c.id AND v.aprovado
  GROUP BY pr.projeto_id
) x ON x.projeto_id = p.id;

-- Horas contratadas vs consumidas por avença — o relatório que evita a avença
-- que consome o dobro do contratado sem ninguém dar por isso.
CREATE OR REPLACE VIEW public.ag_v_avenca_consumo
WITH (security_invoker = on) AS
SELECT
  c.id                       AS contrato_id,
  c.empresa_id,
  c.designacao,
  c.cliente_nome,
  c.valor_mensal,
  c.horas_contratadas,
  COALESCE(SUM(a.minutos)/60.0, 0)                       AS horas_consumidas,
  c.horas_contratadas - COALESCE(SUM(a.minutos)/60.0, 0) AS horas_saldo
FROM public.ag_contratos_avenca c
LEFT JOIN public.ag_projetos p   ON p.contrato_avenca_id = c.id
LEFT JOIN public.ag_apontamentos a ON a.projeto_id = p.id
GROUP BY c.id, c.empresa_id, c.designacao, c.cliente_nome, c.valor_mensal, c.horas_contratadas;

-- ============================================================================
-- NOTA DE APLICAÇÃO
-- ============================================================================
-- Correr DEPOIS de 20260801120000_clariza-agency-fundacao.sql.
-- Não requer nenhuma ação de seguimento: as tabelas nascem vazias e só ficam
-- visíveis às empresas marcadas em ag_empresas_vertical.
-- ============================================================================
