-- ============================================================================
-- CLARIZA LABS · Tech Care — assistência técnica sobre as Ordens de Serviço
-- ----------------------------------------------------------------------------
-- O Tech Care NÃO cria um segundo sistema de ordens: cada assistência É uma
-- Ordem de Serviço (ordens_servico, a mesma do módulo que já existe, com o seu
-- número, estado, cliente e valores). Esta tabela acrescenta, 1 para 1, o que
-- é próprio de uma loja de informática e que a OS genérica não tem:
--
--   · a ENTRADA do equipamento: tipo, marca, modelo, n.º de série, acessórios
--     entregues, avaria relatada pelo cliente, estado visual à chegada;
--   · o ORÇAMENTO: valor proposto e quando/como o cliente o aprovou (ou recusou);
--   · o percurso na bancada: receção → diagnóstico → orçamento → aprovado →
--     em reparação → pronto → entregue (ou recusado);
--   · o AVISO ao cliente, o LEVANTAMENTO e a GARANTIA da reparação.
--
-- SEGURANÇA: não se guardam códigos de desbloqueio nem palavras-passe dos
-- equipamentos dos clientes. Se forem precisos, pedem-se na hora e não se
-- escrevem aqui.
--
-- `ordens_servico` é partilhada com outras empresas e não tem UNIQUE
-- (id, empresa_id); em vez de a alterar, um trigger confirma que a OS é da
-- mesma empresa — o mesmo efeito da FK composta.
--
-- NÃO-DESTRUTIVO: só cria. Nenhum DROP, DELETE, TRUNCATE nem UPDATE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lb_assistencias (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  os_id                UUID NOT NULL UNIQUE REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  fase                 TEXT NOT NULL DEFAULT 'rececao' CHECK (fase IN (
                         'rececao','diagnostico','orcamento','aprovado','em_reparacao','pronto','entregue','recusado')),
  -- Entrada do equipamento
  equipamento_tipo     TEXT CHECK (equipamento_tipo IS NULL OR equipamento_tipo IN (
                         'portatil','desktop','telemovel','tablet','impressora','monitor','consola','rede','outro')),
  marca                TEXT,
  modelo               TEXT,
  numero_serie         TEXT,
  acessorios           TEXT,          -- ex.: carregador, mala, cabo
  avaria_relatada      TEXT,          -- nas palavras do cliente
  estado_visual        TEXT,          -- riscos, ecrã partido, falta de teclas…
  cliente_telefone     TEXT,
  -- Diagnóstico e orçamento
  diagnostico          TEXT,
  orcamento_valor      NUMERIC(12,2),
  orcamento_enviado_em TIMESTAMPTZ,
  decisao_em           TIMESTAMPTZ,   -- quando o cliente aprovou ou recusou
  decisao_canal        TEXT,          -- ex.: telefone, WhatsApp, presencial
  -- Reparação, aviso, levantamento e garantia
  reparacao_feita      TEXT,
  avisado_em           TIMESTAMPTZ,
  entregue_em          TIMESTAMPTZ,
  garantia_dias        INTEGER NOT NULL DEFAULT 90 CHECK (garantia_dias >= 0),
  garantia_ate         DATE,
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lb_assistencias_fase_idx ON public.lb_assistencias (empresa_id, fase);
CREATE INDEX IF NOT EXISTS lb_assistencias_serie_idx ON public.lb_assistencias (empresa_id, numero_serie) WHERE numero_serie IS NOT NULL;

CREATE OR REPLACE FUNCTION public.lb_confere_empresa_os()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ordens_servico WHERE id = NEW.os_id AND empresa_id = NEW.empresa_id) THEN
    RAISE EXCEPTION 'A ordem de serviço não pertence a esta empresa.';
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.lb_assistencias ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'lb_assistencias' AND policyname = 'lb_assistencias_empresa') THEN
    CREATE POLICY lb_assistencias_empresa ON public.lb_assistencias
      FOR ALL
      USING      ((SELECT user_has_empresa_access(empresa_id)))
      WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'lb_assistencias_tranca_empresa') THEN
    CREATE TRIGGER lb_assistencias_tranca_empresa
      BEFORE UPDATE ON public.lb_assistencias
      FOR EACH ROW EXECUTE FUNCTION public.ag_tranca_empresa_id();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'lb_assistencias_confere_os') THEN
    CREATE TRIGGER lb_assistencias_confere_os
      BEFORE INSERT OR UPDATE ON public.lb_assistencias
      FOR EACH ROW EXECUTE FUNCTION public.lb_confere_empresa_os();
  END IF;
END $$;

COMMENT ON TABLE public.lb_assistencias IS
  'Clariza Labs · Tech Care: dados de assistência técnica (equipamento, orçamento, garantia) de uma Ordem de Serviço, 1 para 1. Nunca guarda códigos de desbloqueio.';

-- Verificação
SELECT count(*) AS colunas FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lb_assistencias';
