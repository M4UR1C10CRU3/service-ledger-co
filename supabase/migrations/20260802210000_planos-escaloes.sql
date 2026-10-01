-- ============================================================================
-- Planos: escalões, não verticais
-- ----------------------------------------------------------------------------
-- A migration anterior semeou um plano por vertical. A tabela de preços real
-- funciona ao contrário: são ESCALÕES por tamanho e profundidade, e a operação
-- completa (Comercial, Compras, Produção, Financeiro, RH, Administrativo,
-- Quadros) está em TODOS — é o argumento comercial da página de preços.
--
-- O vertical deixa de ser uma assinatura à parte e passa a ser uma
-- funcionalidade que entra no Business.
--
-- Seguro de correr: nenhuma assinatura existe ainda, logo nenhum plano está
-- em uso e a troca do catálogo não deixa ninguém sem nada.
-- ============================================================================

-- ── 1. O plano ganha o que a página de preços precisa ───────────────────────
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS publico_alvo    TEXT,
  ADD COLUMN IF NOT EXISTS funcionalidades JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sob_consulta    BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.planos.preco_anual IS
  'TOTAL cobrado por ano (mensal x 12 - 15%). A página mostra o equivalente mensal; guardar o total evita arredondamentos que não fecham com o Stripe.';
COMMENT ON COLUMN public.planos.funcionalidades IS
  'Códigos que o produto consulta via grupo_tem(). A operação completa NÃO está aqui — está em todos os planos por definição.';

-- A coluna `vertical` deixa de fazer sentido: o vertical é funcionalidade.
ALTER TABLE public.planos DROP COLUMN IF EXISTS vertical;

-- ── 2. O catálogo real ──────────────────────────────────────────────────────
DELETE FROM public.planos WHERE codigo IN ('nucleo', 'agency', 'school');

INSERT INTO public.planos
  (codigo, nome, publico_alvo, descricao, preco_mensal, preco_anual,
   limites, funcionalidades, sob_consulta, ativo, ordem) VALUES

  ('starter', 'Starter', 'Micro-empresas e arranque',
   'A operação completa incluída. Acesso via browser, sem instalação.',
   149.00, 1519.80,
   '{"utilizadores": 5, "empresas": 1}'::jsonb,
   '["quadros"]'::jsonb,
   FALSE, TRUE, 1),

  ('growth', 'Growth', 'PMEs em crescimento',
   'Tudo do Starter, mais o Dashboard Executivo e mais utilizadores.',
   299.00, 3049.80,
   '{"utilizadores": 15, "empresas": 1}'::jsonb,
   '["quadros","dashboard_executivo"]'::jsonb,
   FALSE, TRUE, 2),

  ('business', 'Business', 'Profundidade e multi-empresa',
   'Tudo do Growth, mais as funcionalidades estratégicas do setor e multi-empresa.',
   499.00, 5089.80,
   '{"utilizadores": 50, "empresas": null}'::jsonb,
   '["quadros","dashboard_executivo","vertical","multi_empresa"]'::jsonb,
   FALSE, TRUE, 3),

  ('enterprise', 'Enterprise', 'Grupo empresarial',
   'White-label, gestão de grupo, utilizadores ilimitados e SLA dedicado.',
   NULL, NULL,
   '{"utilizadores": null, "empresas": null}'::jsonb,
   '["quadros","dashboard_executivo","vertical","multi_empresa","white_label","gestao_grupo","sla"]'::jsonb,
   TRUE, TRUE, 4)

ON CONFLICT (codigo) DO UPDATE SET
  nome            = EXCLUDED.nome,
  publico_alvo    = EXCLUDED.publico_alvo,
  descricao       = EXCLUDED.descricao,
  preco_mensal    = EXCLUDED.preco_mensal,
  preco_anual     = EXCLUDED.preco_anual,
  limites         = EXCLUDED.limites,
  funcionalidades = EXCLUDED.funcionalidades,
  sob_consulta    = EXCLUDED.sob_consulta,
  ativo           = EXCLUDED.ativo,
  ordem           = EXCLUDED.ordem;

-- ── 3. Um grupo, uma assinatura ─────────────────────────────────────────────
-- Com escalões, ter linhas de vários planos para o mesmo grupo não significa
-- nada — significaria estar em dois escalões ao mesmo tempo. A regra passa a
-- ser uma assinatura por grupo, e mudar de plano é alterar a linha.
ALTER TABLE public.assinaturas DROP CONSTRAINT IF EXISTS assinaturas_grupo_id_plano_codigo_key;

CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_grupo_unica
  ON public.assinaturas(grupo_id);

-- ── 4. As perguntas que o produto faz ───────────────────────────────────────
-- A antiga perguntava "este grupo tem o plano X?". Com escalões a pergunta
-- certa é "este grupo tem a funcionalidade X?" — assim, mudar um plano de
-- escalão não obriga a mexer em ecrã nenhum.
DROP FUNCTION IF EXISTS public.grupo_pode_usar(UUID, TEXT);

/** Assinatura que conta: ativa, em demonstração ou em tolerância de pagamento. */
CREATE OR REPLACE FUNCTION public.grupo_assinatura_valida(p_grupo_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.plano_codigo
  FROM assinaturas a
  WHERE a.grupo_id = p_grupo_id
    AND (
      (a.estado = 'ativa'               AND (a.periodo_fim IS NULL OR a.periodo_fim > now()))
      OR (a.estado = 'demonstracao'     AND a.demo_fim    IS NOT NULL AND a.demo_fim    > now())
      -- Pagamento falhado ainda deixa trabalhar até ao fim do período pago: é
      -- para isso que serve a tolerância do cobrador. Cortar ao primeiro cartão
      -- recusado perde clientes que só precisavam de atualizar o cartão.
      OR (a.estado = 'pagamento_falhado' AND a.periodo_fim IS NOT NULL AND a.periodo_fim > now())
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.grupo_tem(p_grupo_id UUID, p_funcionalidade TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM planos p
    WHERE p.codigo = grupo_assinatura_valida(p_grupo_id)
      AND p.funcionalidades ? p_funcionalidade
  );
$$;

/** Teto do plano. NULL = sem limite. NULL também quando não há assinatura
    válida — quem chama tem de perguntar primeiro se há assinatura. */
CREATE OR REPLACE FUNCTION public.grupo_limite(p_grupo_id UUID, p_limite TEXT)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(p.limites ->> p_limite, 'null')::integer
  FROM planos p
  WHERE p.codigo = grupo_assinatura_valida(p_grupo_id);
$$;

-- ============================================================================
-- Nota sobre o limite de utilizadores: está guardado e consultável, mas ainda
-- NÃO é imposto em lado nenhum. Impor exige decidir o que acontece a quem já
-- passou do teto — bloquear o login de quem já trabalha lá seria a pior forma
-- possível de o fazer.
-- ============================================================================
