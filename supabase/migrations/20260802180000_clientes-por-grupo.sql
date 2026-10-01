-- ============================================================================
-- Clientes ganham dono — ao nível do GRUPO
-- ----------------------------------------------------------------------------
-- A tabela `clientes` nunca guardou a que empresa cada cliente pertencia. Não
-- era segurança mal configurada: era informação que não existia. Enquanto só o
-- grupo usava o sistema isso não incomodava ninguém; com a Elo Giro a entrar,
-- passa a ser confidencialidade entre negócios que não têm nada a ver um com
-- o outro.
--
-- ATRIBUIÇÃO — apurada contra os dados reais em 2026-08-02:
--   153 clientes no total
--     5 com documentos, todos do Grupo Obrajusta / Tudo Casa
--   148 sem documento nenhum
--     0 usados por mais do que um grupo   ← o caso que obrigaria a duplicar
--   A ITC não usa esta tabela: os clientes dela vivem em school_clientes_corp.
--
-- Logo: tudo o que existe hoje é do grupo. Onde HÁ prova documental, é ela que
-- manda; o resto herda o grupo por ser a única origem possível.
--
-- REVERSÍVEL: isto acrescenta uma coluna e preenche-a. Não apaga nem move um
-- único registo. Um cliente atribuído ao grupo errado corrige-se com um UPDATE.
-- ============================================================================

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES public.empresa_grupos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS clientes_grupo_idx ON public.clientes(grupo_id);

COMMENT ON COLUMN public.clientes.grupo_id IS
  'Grupo a que o cliente pertence. Partilhado por todas as empresas do grupo — foi decisão explícita, não descuido.';

-- ── 1. Onde há prova documental, é ela que decide ───────────────────────────
WITH usos AS (
            SELECT cliente_id, empresa_id FROM propostas              WHERE cliente_id IS NOT NULL
  UNION ALL SELECT cliente_id, empresa_id FROM pedidos_orcamento      WHERE cliente_id IS NOT NULL
  UNION ALL SELECT cliente_id, empresa_id FROM ordens_servico         WHERE cliente_id IS NOT NULL
  UNION ALL SELECT cliente_id, empresa_id FROM followup_oportunidades WHERE cliente_id IS NOT NULL
  UNION ALL SELECT cliente_id, empresa_id FROM services               WHERE cliente_id IS NOT NULL
  UNION ALL SELECT cliente_id, empresa_id FROM school_contratos_corp  WHERE cliente_id IS NOT NULL
  UNION ALL SELECT cliente_id, empresa_id FROM ag_propostas           WHERE cliente_id IS NOT NULL
  UNION ALL SELECT cliente_id, empresa_id FROM quadro_cartoes         WHERE cliente_id IS NOT NULL
),
dono AS (
  SELECT u.cliente_id, MIN(e.grupo_id::text)::uuid AS grupo_id
  FROM usos u
  JOIN empresas e ON e.id = u.empresa_id
  WHERE e.grupo_id IS NOT NULL
  GROUP BY u.cliente_id
  HAVING COUNT(DISTINCT e.grupo_id) = 1   -- só quando não há ambiguidade
)
UPDATE public.clientes c
   SET grupo_id = d.grupo_id
  FROM dono d
 WHERE d.cliente_id = c.id
   AND c.grupo_id IS NULL;

-- ── 2. Os restantes herdam o grupo das cinco ────────────────────────────────
-- Verificado: são os únicos que usaram esta tabela até hoje.
UPDATE public.clientes c
   SET grupo_id = g.id
  FROM public.empresa_grupos g
 WHERE g.nome = 'Grupo Obrajusta / Tudo Casa'
   AND c.grupo_id IS NULL;

-- ── 3. Clientes novos nascem no grupo de quem os cria ───────────────────────
-- Sem isto, cada formulário da aplicação teria de se lembrar de preencher o
-- grupo — e bastava um esquecer-se para voltarmos a ter clientes órfãos.
CREATE OR REPLACE FUNCTION public.cliente_herda_grupo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grupo UUID;
BEGIN
  IF NEW.grupo_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT e.grupo_id INTO v_grupo
  FROM liberty_utilizador_empresas ue
  JOIN liberty_utilizadores u ON u.id = ue.utilizador_id
  JOIN empresas e ON e.id = ue.empresa_id
  WHERE u.auth_user_id = auth.uid()
    AND e.grupo_id IS NOT NULL
  LIMIT 1;

  NEW.grupo_id := v_grupo;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS clientes_herda_grupo ON public.clientes;
CREATE TRIGGER clientes_herda_grupo
  BEFORE INSERT ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.cliente_herda_grupo();

-- ============================================================================
-- Continua sem se mexer em políticas de segurança. O filtro passa primeiro
-- pela aplicação, que é onde se vê o efeito e se corrige depressa se algo
-- estiver mal atribuído. A política na base entra depois, quando os números
-- estiverem confirmados no ecrã.
-- ============================================================================
