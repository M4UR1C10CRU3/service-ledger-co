-- ============================================================================
-- Assinaturas — o estado, não o motor
-- ----------------------------------------------------------------------------
-- Decisão (2026-08-02): a cobrança recorrente fica no Stripe, o MB WAY num
-- Ifthenpay/Easypay ao lado, e a fatura sai de um emissor certificado pela AT
-- (InvoiceXpress ou equivalente) chamado pelo n8n que já corre no VPS.
--
-- O Clariza NÃO replica nada disso. Guarda só o estado: que plano, se está
-- pago, até quando, e os identificadores do outro lado. As funcionalidades
-- ligam e desligam a partir daqui. Trocar de cobrador um dia passa a ser
-- trocar quem escreve nestas tabelas — o resto do sistema nem dá por isso.
--
-- O INQUILINO É O GRUPO, não a empresa. Um grupo é um cliente do Clariza:
-- o Grupo Obrajusta / Tudo Casa paga uma assinatura para as cinco empresas.
-- ============================================================================

-- ── Planos ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planos (
  codigo        TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  vertical      TEXT,                              -- 'agency', 'school', NULL = núcleo
  descricao     TEXT,
  preco_mensal  NUMERIC(10,2),                     -- por definir: preço é decisão do negócio
  preco_anual   NUMERIC(10,2),
  moeda         TEXT NOT NULL DEFAULT 'EUR',
  -- Limites e funcionalidades. Ex.: {"empresas": 1, "utilizadores": 5}
  limites       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo         BOOLEAN NOT NULL DEFAULT FALSE,    -- só aparece ao público quando o ligarem
  ordem         INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.planos IS
  'Catálogo de planos. Os preços ficam por preencher de propósito — é decisão do negócio, não do código.';

-- Esqueleto: um plano por vertical, sem preço e desligado. Preencher e ativar
-- quando a tabela de preços estiver decidida.
-- NOTA: substituído pelos escalões reais em 20260802210000_planos-escaloes.sql.
INSERT INTO public.planos (codigo, nome, vertical, descricao, limites, ordem) VALUES
  ('nucleo',  'Clariza',         NULL,     'Comercial, compras, produção, financeiro e quadros.', '{"empresas": 1}'::jsonb, 1),
  ('agency',  'Clariza Agency',  'agency', 'Vertical de agência de marketing.',                    '{"empresas": 1}'::jsonb, 2),
  ('school',  'Clariza School',  'school', 'Vertical de formação.',                                '{"empresas": 1}'::jsonb, 3)
ON CONFLICT (codigo) DO NOTHING;

-- ── Assinatura de um grupo ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       UUID NOT NULL REFERENCES public.empresa_grupos(id) ON DELETE CASCADE,
  plano_codigo   TEXT NOT NULL REFERENCES public.planos(codigo),
  estado         TEXT NOT NULL DEFAULT 'demonstracao'
                 CHECK (estado IN ('demonstracao','ativa','pagamento_falhado','suspensa','cancelada')),
  -- Até quando está pago. É isto que o sistema consulta, não a data de hoje.
  periodo_fim    TIMESTAMPTZ,
  demo_fim       TIMESTAMPTZ,
  -- O outro lado. Deliberadamente TEXT e sem restrições: serve Stripe hoje e
  -- outro cobrador amanhã sem alterar o esquema.
  cobrador       TEXT,                    -- 'stripe', 'ifthenpay', 'easypay', 'manual'
  cobrador_cliente_id     TEXT,
  cobrador_assinatura_id  TEXT,
  emissor        TEXT,                    -- 'invoicexpress', 'moloni', 'vendus'
  emissor_cliente_id      TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, plano_codigo)
);

CREATE INDEX IF NOT EXISTS assinaturas_grupo_idx ON public.assinaturas(grupo_id);
CREATE INDEX IF NOT EXISTS assinaturas_cobrador_idx ON public.assinaturas(cobrador_assinatura_id);

-- ── Faturas emitidas ────────────────────────────────────────────────────────
-- Não é a fatura: é o rasto dela. O documento legal vive no emissor
-- certificado, e aqui guarda-se para onde apontar quando o cliente a pedir.
CREATE TABLE IF NOT EXISTS public.assinatura_faturas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id   UUID NOT NULL REFERENCES public.assinaturas(id) ON DELETE CASCADE,
  grupo_id        UUID NOT NULL REFERENCES public.empresa_grupos(id) ON DELETE CASCADE,
  cobrador_fatura_id  TEXT,
  emissor_documento_id TEXT,
  numero          TEXT,
  url_pdf         TEXT,
  valor           NUMERIC(10,2),
  moeda           TEXT NOT NULL DEFAULT 'EUR',
  estado          TEXT NOT NULL DEFAULT 'emitida'
                  CHECK (estado IN ('emitida','paga','anulada','falhada')),
  emitida_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assinatura_faturas_grupo_idx
  ON public.assinatura_faturas(grupo_id, emitida_em DESC);

-- ── Segurança ───────────────────────────────────────────────────────────────
-- Ponto que não é detalhe: o cliente LÊ a sua assinatura e NÃO a escreve.
-- Sem isto, um utilizador com a chave da API muda o próprio estado para 'ativa'
-- e passa a usar o produto de graça. Quem escreve é o n8n, com a chave de
-- serviço, a mando do webhook do cobrador.
ALTER TABLE public.planos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinatura_faturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planos_leitura ON public.planos;
CREATE POLICY planos_leitura ON public.planos
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS assinaturas_leitura ON public.assinaturas;
CREATE POLICY assinaturas_leitura ON public.assinaturas
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM empresas e
    WHERE e.grupo_id = assinaturas.grupo_id
      AND user_has_empresa_access(e.id)
  ));

DROP POLICY IF EXISTS assinatura_faturas_leitura ON public.assinatura_faturas;
CREATE POLICY assinatura_faturas_leitura ON public.assinatura_faturas
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM empresas e
    WHERE e.grupo_id = assinatura_faturas.grupo_id
      AND user_has_empresa_access(e.id)
  ));
-- Sem políticas de INSERT/UPDATE/DELETE: nenhuma conta de utilizador escreve
-- aqui. A chave de serviço ignora RLS, que é como o n8n atualiza o estado.

-- ── Consulta única para o produto ───────────────────────────────────────────
-- Toda a aplicação faz esta pergunta e mais nenhuma: "este grupo pode usar
-- isto agora?". Concentrar a resposta num sítio evita que cada ecrã invente
-- a sua própria regra e que uma delas fique esquecida.
CREATE OR REPLACE FUNCTION public.grupo_pode_usar(p_grupo_id UUID, p_plano TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM assinaturas a
    WHERE a.grupo_id = p_grupo_id
      AND a.plano_codigo = p_plano
      AND (
        (a.estado = 'ativa'             AND (a.periodo_fim IS NULL OR a.periodo_fim > now()))
        OR (a.estado = 'demonstracao'   AND a.demo_fim IS NOT NULL AND a.demo_fim > now())
        -- Pagamento falhado ainda deixa trabalhar: é para isso que serve o
        -- período de tolerância do cobrador. Cortar ao primeiro cartão
        -- recusado perde clientes que só precisavam de atualizar o cartão.
        OR (a.estado = 'pagamento_falhado' AND a.periodo_fim IS NOT NULL AND a.periodo_fim > now())
      )
  );
$$;

-- ============================================================================
-- CONTRATO COM O n8n (a implementar quando as contas estiverem abertas):
--   Stripe  customer.subscription.updated  → estado + periodo_fim
--   Stripe  invoice.paid                   → cria fatura no emissor certificado,
--                                            grava em assinatura_faturas
--   Stripe  invoice.payment_failed         → estado = 'pagamento_falhado'
--   Stripe  customer.subscription.deleted  → estado = 'cancelada'
-- Escreve sempre com a chave de SERVIÇO. Nunca com a chave pública.
-- ============================================================================
