-- ── 3. O motor de automações passa a servir os dois ─────────────────────────
ALTER TABLE public.quadro_automacoes
  ADD COLUMN IF NOT EXISTS contexto TEXT NOT NULL DEFAULT 'quadro';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quadro_automacoes_contexto_chk'
  ) THEN
    ALTER TABLE public.quadro_automacoes
      ADD CONSTRAINT quadro_automacoes_contexto_chk
      CHECK (contexto IN ('quadro', 'agency_job'));
  END IF;
END $$;

-- A regra antiga exigia quadro_id OU modelo_codigo. Uma automação de Job não
-- tem nenhum dos dois — é da empresa inteira. Passa a exigir-se coerência com
-- o contexto, em vez de assumir que tudo vem de um quadro.
ALTER TABLE public.quadro_automacoes DROP CONSTRAINT IF EXISTS quadro_automacoes_check;
ALTER TABLE public.quadro_automacoes DROP CONSTRAINT IF EXISTS quadro_automacoes_alvo_chk;
ALTER TABLE public.quadro_automacoes
  ADD CONSTRAINT quadro_automacoes_alvo_chk CHECK (
    (contexto = 'quadro'     AND (quadro_id IS NOT NULL OR modelo_codigo IS NOT NULL))
    OR
    (contexto = 'agency_job' AND quadro_id IS NULL AND modelo_codigo IS NULL)
  );

-- O registo de execuções tem de conseguir apontar para um job, não só para um
-- cartão. Sem isto, uma automação do Agency não deixava rasto identificável.
ALTER TABLE public.quadro_automacao_execucoes
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.ag_jobs(id) ON DELETE CASCADE;

-- ── 4. Validação do movimento, igual à dos Quadros ──────────────────────────
CREATE OR REPLACE FUNCTION public.ag_job_campos_em_falta(
  p_job_id UUID, p_etapa_destino UUID
) RETURNS TEXT[]
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req   JSONB;
  v_job   RECORD;
  v_falta TEXT[] := '{}';
  v_campo TEXT;
BEGIN
  SELECT campos_obrigatorios INTO v_req FROM ag_job_etapas WHERE id = p_etapa_destino;
  IF v_req IS NULL OR jsonb_array_length(v_req) = 0 THEN RETURN v_falta; END IF;

  SELECT * INTO v_job FROM ag_jobs WHERE id = p_job_id;
  IF v_job IS NULL THEN RETURN ARRAY['job_inexistente']; END IF;

  FOR v_campo IN SELECT jsonb_array_elements_text(v_req) LOOP
    IF (v_campo = 'responsavel_id'  AND v_job.responsavel_id  IS NULL)
    OR (v_campo = 'prazo'           AND v_job.prazo           IS NULL)
    OR (v_campo = 'horas_previstas' AND COALESCE(v_job.horas_previstas, 0) = 0)
    OR (v_campo = 'descricao'       AND COALESCE(v_job.descricao, '') = '')
    THEN
      v_falta := array_append(v_falta, v_campo);
    END IF;
  END LOOP;
  RETURN v_falta;
END $$;

-- ============================================================================
-- Fica igual ao dos Quadros de propósito: as mesmas regras, o mesmo registo,
-- o mesmo comportamento ao arrastar. Quem aprende um, sabe o outro.
-- ============================================================================
