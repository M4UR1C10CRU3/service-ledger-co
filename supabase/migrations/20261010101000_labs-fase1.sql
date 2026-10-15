-- ============================================================================
-- CLARIZA LABS · Fase 1 — os núcleos
-- ----------------------------------------------------------------------------
-- O Clariza Labs não precisa de coluna nova para existir: `empresas.vertical` é
-- texto livre (sem CHECK), por isso o valor 'labs' já é aceite. O motor de
-- Projetos/Jobs continua a ser o do Agency, ativado por `ag_empresas_vertical`,
-- que a Webtech Labs já tem.
--
-- O que esta fase cria é a única peça que o Agency não tem: os NÚCLEOS de
-- negócio. São por empresa (cada estúdio tem os seus) e semeiam-se aqui os seis
-- da Webtech, iguais aos do site (junta-te.html).
--
-- Regras do Agency mantidas: empresa_id NOT NULL, RLS com USING e WITH CHECK,
-- UNIQUE (id, empresa_id) para FKs compostas, empresa_id imutável.
--
-- NÃO-DESTRUTIVO: só cria. Nenhum DROP, DELETE, TRUNCATE nem UPDATE. Corre-se
-- duas vezes sem efeito na segunda.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lb_nucleos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo      TEXT NOT NULL,          -- estrategia, produto, growth, criativo, infra, techcare
  nome        TEXT NOT NULL,
  descricao   TEXT,
  ordem       INTEGER NOT NULL DEFAULT 0,
  -- Um núcleo nunca se apaga: desativa-se. Os registos antigos continuam a
  -- apontar para ele e os relatórios de anos passados não mudam.
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, empresa_id),
  UNIQUE (empresa_id, codigo)
);

ALTER TABLE public.lb_nucleos ENABLE ROW LEVEL SECURITY;

-- Política criada só se ainda não existir (sem DROP POLICY).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'lb_nucleos' AND policyname = 'lb_nucleos_empresa') THEN
    CREATE POLICY lb_nucleos_empresa ON public.lb_nucleos
      FOR ALL
      USING      ((SELECT user_has_empresa_access(empresa_id)))
      WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'lb_nucleos_tranca_empresa') THEN
    CREATE TRIGGER lb_nucleos_tranca_empresa
      BEFORE UPDATE ON public.lb_nucleos
      FOR EACH ROW EXECUTE FUNCTION public.ag_tranca_empresa_id();
  END IF;
END $$;

COMMENT ON TABLE public.lb_nucleos IS
  'Clariza Labs: núcleos de negócio da empresa. Dimensão transversal de projetos, propostas, avenças, oportunidades, OS, receitas e despesas.';

-- ── Os seis núcleos da Webtech Labs ─────────────────────────────────────────
INSERT INTO public.lb_nucleos (empresa_id, codigo, nome, descricao, ordem)
SELECT e.id, n.codigo, n.nome, n.descricao, n.ordem
FROM public.empresas e
CROSS JOIN (VALUES
  ('estrategia', 'Estratégia & Negócios',  'Empreendedorismo e consultoria para negócios', 1),
  ('produto',    'Produto Digital',        'Websites, e-commerce, software e plataformas à medida', 2),
  ('growth',     'Growth',                 'Gestão de tráfego, growth marketing e marketing digital', 3),
  ('criativo',   'Estúdio Criativo',       'Audiovisual e comunicação visual', 4),
  ('infra',      'Infraestrutura & Cloud', 'Fornecimento, instalação e configuração de redes, servidores físicos, cloud e VPS', 5),
  ('techcare',   'Tech Care',              'Loja de informática: vendas, assistência e consultoria em hardware e software', 6)
) AS n(codigo, nome, descricao, ordem)
WHERE e.slug = 'webtech-labs'
ON CONFLICT (empresa_id, codigo) DO NOTHING;

-- Verificação
SELECT codigo, nome, ordem FROM public.lb_nucleos
WHERE empresa_id = (SELECT id FROM public.empresas WHERE slug = 'webtech-labs')
ORDER BY ordem;
