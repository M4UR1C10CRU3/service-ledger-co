-- ============================================================================
-- CLARIZA LABS · Infraestrutura & Cloud — contratos com SLA e pedidos de suporte
-- ----------------------------------------------------------------------------
-- A Infra vende duas coisas que se medem de forma diferente:
--   · instalações (projetos com material + mão de obra) — já cobertas pelos
--     Projetos, Produtos, Stocks e Notas de Encomenda;
--   · manutenção contínua — um CONTRATO com tempo de resposta garantido, e os
--     PEDIDOS DE SUPORTE que chegam ao longo do mês.
--
--   lb_contratos_sla    — o compromisso: em quantas horas respondemos e
--                         resolvemos, em que horário, quantas horas incluídas.
--                         Pendura-se (se houver) na avença que o fatura.
--   lb_pedidos_suporte  — cada pedido, com prioridade, estado e os três
--                         momentos que contam: aberto, 1.ª resposta, resolvido.
--                         O ativo do cliente afetado liga-se a lb_ativos.
--
-- O cumprimento do SLA calcula-se no ecrã a partir destes momentos; não se
-- guarda (não fica desatualizado).
--
-- Regras do Agency mantidas: empresa_id NOT NULL, RLS com USING e WITH CHECK,
-- FKs compostas, empresa_id imutável.
-- NÃO-DESTRUTIVO: só cria. Nenhum DROP, DELETE, TRUNCATE nem UPDATE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lb_contratos_sla (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id         UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome       TEXT,
  avenca_id          UUID,                       -- a avença que fatura este contrato
  nome               TEXT NOT NULL,              -- ex.: «Manutenção informática · Escritório X»
  resposta_horas     NUMERIC(6,2) NOT NULL DEFAULT 8,    -- 1.ª resposta em N horas
  resolucao_horas    NUMERIC(6,2),                       -- resolução em N horas (opcional)
  critico_resposta_horas NUMERIC(6,2),                   -- resposta para prioridade crítica
  horario            TEXT NOT NULL DEFAULT 'uteis' CHECK (horario IN ('uteis','alargado','24x7')),
  horas_incluidas    NUMERIC(8,2),                       -- por mês
  inclui_deslocacao  BOOLEAN NOT NULL DEFAULT FALSE,
  inicio             DATE NOT NULL DEFAULT CURRENT_DATE,
  fim                DATE,
  ativo              BOOLEAN NOT NULL DEFAULT TRUE,
  notas              TEXT,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, empresa_id),
  FOREIGN KEY (avenca_id, empresa_id) REFERENCES public.ag_contratos_avenca (id, empresa_id)
);

CREATE TABLE IF NOT EXISTS public.lb_pedidos_suporte (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero                INTEGER NOT NULL,
  ano                   INTEGER NOT NULL,
  cliente_id            UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome          TEXT,
  contrato_id           UUID,
  ativo_id              UUID,
  titulo                TEXT NOT NULL,
  descricao             TEXT,
  prioridade            TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa','normal','alta','critica')),
  estado                TEXT NOT NULL DEFAULT 'aberto' CHECK (estado IN ('aberto','em_curso','aguarda_cliente','resolvido','fechado')),
  canal                 TEXT CHECK (canal IS NULL OR canal IN ('email','telefone','whatsapp','site','presencial','monitorizacao')),
  responsavel_nome      TEXT,
  aberto_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  primeira_resposta_em  TIMESTAMPTZ,
  resolvido_em          TIMESTAMPTZ,
  horas_gastas          NUMERIC(8,2),
  solucao               TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, empresa_id),
  UNIQUE (empresa_id, ano, numero),
  FOREIGN KEY (contrato_id, empresa_id) REFERENCES public.lb_contratos_sla (id, empresa_id),
  FOREIGN KEY (ativo_id, empresa_id)    REFERENCES public.lb_ativos (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS lb_pedidos_suporte_abertos_idx
  ON public.lb_pedidos_suporte (empresa_id, aberto_em DESC) WHERE estado NOT IN ('resolvido','fechado');

ALTER TABLE public.lb_contratos_sla   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lb_pedidos_suporte ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lb_contratos_sla','lb_pedidos_suporte'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_empresa') THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL
           USING ((SELECT user_has_empresa_access(empresa_id)))
           WITH CHECK ((SELECT user_has_empresa_access(empresa_id)))', t || '_empresa', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = t || '_tranca_empresa') THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ag_tranca_empresa_id()',
                     t || '_tranca_empresa', t);
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE public.lb_contratos_sla   IS 'Clariza Labs · Infra: contratos de manutenção com tempos de resposta/resolução (SLA).';
COMMENT ON TABLE public.lb_pedidos_suporte IS 'Clariza Labs · Infra: pedidos de suporte e incidentes, medidos contra o SLA do contrato.';

-- Verificação
SELECT table_name, count(*) AS colunas FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('lb_contratos_sla','lb_pedidos_suporte')
GROUP BY table_name;
