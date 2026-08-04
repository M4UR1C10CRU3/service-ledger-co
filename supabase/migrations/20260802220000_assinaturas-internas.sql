-- ============================================================================
-- Assinaturas dos grupos que já cá estavam
-- ----------------------------------------------------------------------------
-- Assim que o produto começar a perguntar "este grupo tem direito a isto?", um
-- grupo sem assinatura passa a não ter direito a nada. Os três que já usam o
-- Clariza — o Grupo Obrajusta / Tudo Casa, a Elo Giro e a ITC — perderiam
-- funcionalidades que usam hoje.
--
-- Esta migration dá-lhes assinatura ANTES de existir qualquer bloqueio. É a
-- ordem certa: primeiro garantir que ninguém fica sem nada, só depois fechar
-- a porta.
--
-- ESTADO 'interna': não é cliente pagante e não deve ser contado como tal.
-- Marcar isto agora evita que daqui a um ano os pilotos apareçam nas contas
-- como receita e ninguém perceba porquê.
-- ============================================================================

ALTER TABLE public.assinaturas DROP CONSTRAINT IF EXISTS assinaturas_estado_check;
ALTER TABLE public.assinaturas
  ADD CONSTRAINT assinaturas_estado_check
  CHECK (estado IN ('demonstracao','ativa','pagamento_falhado','suspensa','cancelada','interna'));

COMMENT ON COLUMN public.assinaturas.estado IS
  '''interna'' = piloto ou uso próprio: acesso completo, sem cobrança e fora de qualquer contagem de receita.';

-- ── Os três grupos existentes ───────────────────────────────────────────────
-- O plano escolhido é o que cobre o que cada um JÁ USA hoje — não é uma venda,
-- é não tirar nada a ninguém.

--   Grupo Obrajusta / Tudo Casa: cinco empresas e gestão de grupo → Enterprise
INSERT INTO public.assinaturas (grupo_id, plano_codigo, estado, cobrador)
SELECT g.id, 'enterprise', 'interna', 'manual'
FROM public.empresa_grupos g
WHERE g.nome = 'Grupo Obrajusta / Tudo Casa'
ON CONFLICT (grupo_id) DO NOTHING;

--   Elo Giro: piloto do vertical de Agência → Business (tem 'vertical')
INSERT INTO public.assinaturas (grupo_id, plano_codigo, estado, cobrador)
SELECT g.id, 'business', 'interna', 'manual'
FROM public.empresa_grupos g
WHERE g.nome = 'Elo Giro'
ON CONFLICT (grupo_id) DO NOTHING;

--   ITC: vertical de Formação → Business
INSERT INTO public.assinaturas (grupo_id, plano_codigo, estado, cobrador)
SELECT g.id, 'business', 'interna', 'manual'
FROM public.empresa_grupos g
WHERE g.nome = 'ITC'
ON CONFLICT (grupo_id) DO NOTHING;

-- ── 'interna' conta como assinatura válida ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.grupo_assinatura_valida(p_grupo_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.plano_codigo
  FROM assinaturas a
  WHERE a.grupo_id = p_grupo_id
    AND (
      a.estado = 'interna'   -- piloto e uso próprio: nunca expira
      OR (a.estado = 'ativa'             AND (a.periodo_fim IS NULL OR a.periodo_fim > now()))
      OR (a.estado = 'demonstracao'      AND a.demo_fim    IS NOT NULL AND a.demo_fim    > now())
      -- Pagamento falhado ainda deixa trabalhar até ao fim do período pago: é
      -- para isso que serve a tolerância do cobrador. Cortar ao primeiro cartão
      -- recusado perde clientes que só precisavam de atualizar o cartão.
      OR (a.estado = 'pagamento_falhado' AND a.periodo_fim IS NOT NULL AND a.periodo_fim > now())
    )
  LIMIT 1;
$$;
