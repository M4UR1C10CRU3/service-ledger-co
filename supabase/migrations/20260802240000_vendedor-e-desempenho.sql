-- ============================================================================
-- Quem fez a venda — e o indicador que sai daí
-- ----------------------------------------------------------------------------
-- `vendedor_id` existia nas propostas e nos pedidos de orçamento e NUNCA foi
-- gravado: o formulário escolhia o colaborador de uma lista, guardava o nome
-- e deitava fora o identificador.
--
-- Enquanto o vendedor é só um nome impresso no PDF isso não incomoda. A partir
-- do momento em que serve de indicador de desempenho e base de comissão, um
-- nome em texto não chega: "M. Barreto" e "Maurício Barreto" contam como duas
-- pessoas, quem mudar de apelido perde o histórico, e ninguém consegue somar
-- comissões com confiança.
--
-- A coluna era um UUID solto, sem destino declarado. Passa a apontar ao
-- colaborador — que é o registo onde vivem o vínculo e o salário, e portanto
-- o único sítio onde uma comissão faz sentido.
-- ============================================================================

-- ── 1. Recuperar o que der do histórico ─────────────────────────────────────
-- Só onde o nome identifica UMA pessoa sem margem para dúvida. Um nome ambíguo
-- fica por atribuir de propósito: melhor um vendedor em falta do que uma venda
-- creditada à pessoa errada — sobretudo se disso sair uma comissão.
UPDATE public.propostas p
   SET vendedor_id = e.id
  FROM public.employees e
 WHERE p.vendedor_id IS NULL
   AND p.vendedor_nome IS NOT NULL
   AND e.empresa_id = p.empresa_id
   AND e.full_name  = p.vendedor_nome
   AND (SELECT COUNT(*) FROM public.employees e2
         WHERE e2.empresa_id = p.empresa_id AND e2.full_name = p.vendedor_nome) = 1;

UPDATE public.pedidos_orcamento po
   SET vendedor_id = e.id
  FROM public.employees e
 WHERE po.vendedor_id IS NULL
   AND po.vendedor_nome IS NOT NULL
   AND e.empresa_id = po.empresa_id
   AND e.full_name  = po.vendedor_nome
   AND (SELECT COUNT(*) FROM public.employees e2
         WHERE e2.empresa_id = po.empresa_id AND e2.full_name = po.vendedor_nome) = 1;

-- ── 2. Dar destino à coluna ─────────────────────────────────────────────────
-- ON DELETE SET NULL: apagar um colaborador não pode apagar a proposta dele.
-- O nome fica gravado à parte, por isso o documento continua legível.
ALTER TABLE public.propostas DROP CONSTRAINT IF EXISTS propostas_vendedor_fk;
ALTER TABLE public.propostas
  ADD CONSTRAINT propostas_vendedor_fk
  FOREIGN KEY (vendedor_id) REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.pedidos_orcamento DROP CONSTRAINT IF EXISTS po_vendedor_fk;
ALTER TABLE public.pedidos_orcamento
  ADD CONSTRAINT po_vendedor_fk
  FOREIGN KEY (vendedor_id) REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS propostas_vendedor_idx
  ON public.propostas(empresa_id, vendedor_id, ano);
CREATE INDEX IF NOT EXISTS pedidos_orcamento_vendedor_idx
  ON public.pedidos_orcamento(empresa_id, vendedor_id, ano);

COMMENT ON COLUMN public.propostas.vendedor_id IS
  'Colaborador que fez a venda. Base do indicador de desempenho e da comissão — o nome em texto serve só para imprimir.';

-- ── 3. O indicador ──────────────────────────────────────────────────────────
-- Quem propõe, quem fecha, quanto vale e a que ritmo converte.
--
-- security_invoker: a vista respeita as regras de quem a consulta. Sem isto,
-- corria com os privilégios de quem a criou e mostrava o desempenho de todas
-- as empresas a toda a gente.
CREATE OR REPLACE VIEW public.v_desempenho_comercial
WITH (security_invoker = on) AS
SELECT
  p.empresa_id,
  p.ano,
  p.vendedor_id,
  COALESCE(e.full_name, p.vendedor_nome, 'Por atribuir')       AS vendedor,
  COUNT(*)                                                     AS propostas,
  COUNT(*) FILTER (WHERE p.estado = 'aceite')                  AS aceites,
  COUNT(*) FILTER (WHERE p.estado = 'recusada')                AS recusadas,
  COUNT(*) FILTER (WHERE p.estado IN ('enviada','expirada'))   AS em_aberto,
  COALESCE(SUM(p.total_com_iva), 0)                            AS valor_proposto,
  COALESCE(SUM(p.total_com_iva) FILTER (WHERE p.estado = 'aceite'), 0) AS valor_ganho,
  -- Taxa sobre o que já teve desfecho. Incluir propostas ainda em aberto no
  -- denominador faz um bom vendedor parecer mau só por ter trabalho a decorrer.
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE p.estado = 'aceite')
    / NULLIF(COUNT(*) FILTER (WHERE p.estado IN ('aceite','recusada')), 0)
  , 1)                                                         AS taxa_conversao
FROM public.propostas p
LEFT JOIN public.employees e ON e.id = p.vendedor_id
WHERE p.estado <> 'rascunho'          -- rascunho não é trabalho apresentado
GROUP BY p.empresa_id, p.ano, p.vendedor_id,
         COALESCE(e.full_name, p.vendedor_nome, 'Por atribuir');

COMMENT ON VIEW public.v_desempenho_comercial IS
  'Desempenho comercial por vendedor e ano. Rascunhos excluídos; a taxa de conversão só conta propostas já decididas.';
