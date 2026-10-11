-- ============================================================================
-- CLARIZA LABS · Growth — contas de anúncios e resultados mensais
-- ----------------------------------------------------------------------------
-- No Growth há dois dinheiros que não se podem misturar:
--   · o FEE da Webtech (a avença: ag_contratos_avenca, núcleo Growth);
--   · o INVESTIMENTO em media do cliente (Meta, Google, TikTok…), que passa
--     pelas contas de anúncios e não é receita da Webtech.
-- Estas duas tabelas guardam o segundo e o que ele rendeu, mês a mês, para o
-- painel mostrar CPL (custo por lead) e ROAS (retorno do investimento) por
-- cliente, e para o relatório mensal ter os números.
--
-- SEGURANÇA: nunca se guardam acessos às contas. `acesso_onde` diz só onde
-- estão (ex.: Business Manager do cliente, cofre).
--
-- Regras do Agency mantidas: empresa_id NOT NULL, RLS com USING e WITH CHECK,
-- FKs compostas, empresa_id imutável.
-- NÃO-DESTRUTIVO: só cria. Nenhum DROP, DELETE, TRUNCATE nem UPDATE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lb_contas_anuncios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id        UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome      TEXT,
  avenca_id         UUID,                    -- a avença (fee) que cobre esta conta
  plataforma        TEXT NOT NULL CHECK (plataforma IN ('meta','google','tiktok','linkedin','youtube','outra')),
  nome              TEXT NOT NULL,           -- ex.: «Meta · Loja Tudo Casa»
  referencia        TEXT,                    -- ID da conta de anúncios
  acesso_onde       TEXT,                    -- ONDE estão os acessos (nunca a palavra-passe)
  orcamento_mensal  NUMERIC(12,2),           -- investimento previsto por mês (do cliente)
  moeda             TEXT NOT NULL DEFAULT 'EUR' CHECK (moeda IN ('EUR','BRL')),
  ativa             BOOLEAN NOT NULL DEFAULT TRUE,
  notas             TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, empresa_id),
  FOREIGN KEY (avenca_id, empresa_id) REFERENCES public.ag_contratos_avenca (id, empresa_id)
);

CREATE TABLE IF NOT EXISTS public.lb_growth_resultados (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conta_id      UUID NOT NULL,
  mes           DATE NOT NULL CHECK (EXTRACT(DAY FROM mes) = 1),   -- primeiro dia do mês
  investimento  NUMERIC(12,2) NOT NULL DEFAULT 0,
  impressoes    INTEGER,
  cliques       INTEGER,
  leads         INTEGER,
  conversoes    INTEGER,
  receita       NUMERIC(12,2),             -- receita que o cliente atribui às campanhas
  notas         TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conta_id, mes),
  FOREIGN KEY (conta_id, empresa_id) REFERENCES public.lb_contas_anuncios (id, empresa_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS lb_growth_resultados_mes_idx ON public.lb_growth_resultados (empresa_id, mes DESC);

ALTER TABLE public.lb_contas_anuncios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lb_growth_resultados ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lb_contas_anuncios','lb_growth_resultados'] LOOP
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

COMMENT ON TABLE public.lb_contas_anuncios   IS 'Clariza Labs · Growth: contas de anúncios dos clientes (investimento do cliente, separado do fee da Webtech). Nunca guarda acessos.';
COMMENT ON TABLE public.lb_growth_resultados IS 'Clariza Labs · Growth: resultados mensais por conta (investimento, leads, conversões, receita) para CPL e ROAS.';

-- Verificação
SELECT table_name, count(*) AS colunas FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('lb_contas_anuncios','lb_growth_resultados')
GROUP BY table_name;
