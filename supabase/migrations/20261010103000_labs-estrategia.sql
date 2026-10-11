-- ============================================================================
-- CLARIZA LABS · Estratégia & Negócios — Planos 48h
-- ----------------------------------------------------------------------------
-- A porta de entrada da Webtech é um funil curto:
--   Diagnóstico grátis (30 min) → Plano de digitalização em 48h → Proposta → Cliente
--
-- O Diagnóstico é uma oportunidade do Workflow Comercial (followup_oportunidades,
-- onde o site já grava os pedidos). A Proposta e o Cliente também já existem.
-- Falta só o meio: o PLANO 48H, com o seu relógio — começa quando o diagnóstico
-- é feito e tem de ser entregue em 48 horas. Cada plano é um projeto do núcleo
-- Estratégia (com os seus jobs e tarefas); esta tabela guarda o que o projeto
-- não sabe: de que oportunidade veio, quando começou, o prazo e quando foi
-- entregue. É daqui que saem o alerta de atraso e as taxas de conversão.
--
-- Regras do Agency mantidas: empresa_id NOT NULL, RLS com USING e WITH CHECK,
-- FK composta para o projeto, empresa_id imutável.
-- NÃO-DESTRUTIVO: só cria. Nenhum DROP, DELETE, TRUNCATE nem UPDATE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lb_planos48h (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  projeto_id       UUID NOT NULL,
  -- A oportunidade de onde veio o diagnóstico. Se a oportunidade for apagada,
  -- o plano fica (é trabalho feito), só perde a ligação.
  oportunidade_id  UUID REFERENCES public.followup_oportunidades(id) ON DELETE SET NULL,
  cliente_id       UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome     TEXT,
  inicio           TIMESTAMPTZ NOT NULL DEFAULT now(),
  prazo            TIMESTAMPTZ NOT NULL,
  entregue_em      TIMESTAMPTZ,
  notas            TEXT,
  criado_por       UUID,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, empresa_id),
  UNIQUE (projeto_id),
  FOREIGN KEY (projeto_id, empresa_id) REFERENCES public.ag_projetos (id, empresa_id) ON DELETE CASCADE,
  CHECK (prazo > inicio)
);

CREATE INDEX IF NOT EXISTS lb_planos48h_empresa_idx ON public.lb_planos48h (empresa_id, inicio DESC);
CREATE INDEX IF NOT EXISTS lb_planos48h_oport_idx   ON public.lb_planos48h (oportunidade_id) WHERE oportunidade_id IS NOT NULL;

ALTER TABLE public.lb_planos48h ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'lb_planos48h' AND policyname = 'lb_planos48h_empresa') THEN
    CREATE POLICY lb_planos48h_empresa ON public.lb_planos48h
      FOR ALL
      USING      ((SELECT user_has_empresa_access(empresa_id)))
      WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'lb_planos48h_tranca_empresa') THEN
    CREATE TRIGGER lb_planos48h_tranca_empresa
      BEFORE UPDATE ON public.lb_planos48h
      FOR EACH ROW EXECUTE FUNCTION public.ag_tranca_empresa_id();
  END IF;
END $$;

COMMENT ON TABLE public.lb_planos48h IS
  'Clariza Labs · Estratégia & Negócios: Planos de digitalização em 48h (projeto + oportunidade de origem + relógio de 48h).';

-- Verificação
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lb_planos48h' ORDER BY ordinal_position;
