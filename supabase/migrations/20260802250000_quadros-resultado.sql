-- ============================================================================
-- Colunas finais: ganho ou perda?
-- ----------------------------------------------------------------------------
-- Uma coluna sabia dizer que era FINAL, mas não que desfecho representava.
-- "Adjudicado" e "Perdido" são as duas finais do Comercial, e contá-las juntas
-- daria uma taxa de conversão de 100% sempre — inútil e enganadora.
--
-- É preciso para o cabeçalho de indicadores do quadro mostrar o mesmo que o
-- Workflow Comercial mostra hoje: adjudicados do mês e taxa de conversão.
-- ============================================================================

ALTER TABLE public.quadro_listas
  ADD COLUMN IF NOT EXISTS resultado TEXT
  CHECK (resultado IS NULL OR resultado IN ('ganho', 'perdido'));

ALTER TABLE public.quadro_modelo_listas
  ADD COLUMN IF NOT EXISTS resultado TEXT
  CHECK (resultado IS NULL OR resultado IN ('ganho', 'perdido'));

COMMENT ON COLUMN public.quadro_listas.resultado IS
  'Só em colunas finais: se o processo acabou bem ou mal. NULL nas colunas de percurso. Base da taxa de conversão.';

-- ── Os modelos ──────────────────────────────────────────────────────────────
UPDATE public.quadro_modelo_listas SET resultado = 'ganho'   WHERE (modelo_codigo, estado_codigo) IN
  (('compras','faturada'), ('comercial','adjudicado'), ('producao','faturada'),
   ('cobrancas','liquidado'), ('recebimentos','recebido'), ('pagamentos','confirmado'));

UPDATE public.quadro_modelo_listas SET resultado = 'perdido' WHERE (modelo_codigo, estado_codigo) IN
  (('compras','cancelada'), ('comercial','perdido'), ('producao','cancelada'));

-- ── Os quadros já criados a partir deles ────────────────────────────────────
-- Sem isto, quem já tivesse criado um quadro tipado ficava sem indicadores e
-- não perceberia porquê.
UPDATE public.quadro_listas l SET resultado = m.resultado
FROM public.quadros q, public.quadro_modelo_listas m
WHERE l.quadro_id = q.id
  AND q.modelo_codigo = m.modelo_codigo
  AND l.estado_codigo = m.estado_codigo
  AND m.resultado IS NOT NULL
  AND l.resultado IS NULL;
