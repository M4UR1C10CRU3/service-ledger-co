-- ============================================================================
-- Clariza Agency — as etapas dos Jobs passam pelo MESMO motor dos Quadros
-- ----------------------------------------------------------------------------
-- O utilizador pediu que todos os verticais sigam o mesmo conceito. As etapas
-- de Job já eram um kanban; faltava-lhes o que as colunas dos Quadros ganharam:
-- declarar o que exigem para deixar entrar um trabalho, e disparar automações
-- quando ele entra.
--
-- Não se cria um segundo motor. A tabela de automações e o registo de execuções
-- são os mesmos — ganham apenas um contexto que diz de onde vem o evento.
-- ============================================================================

-- ── 1. As etapas ganham as regras ───────────────────────────────────────────
ALTER TABLE public.ag_job_etapas
  ADD COLUMN IF NOT EXISTS estado_codigo       TEXT,
  ADD COLUMN IF NOT EXISTS campos_obrigatorios JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bloqueada           BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.ag_job_etapas.estado_codigo IS
  'Estado de processo que a etapa representa. É por aqui que as automações casam.';
COMMENT ON COLUMN public.ag_job_etapas.campos_obrigatorios IS
  'O que o job tem de ter preenchido para poder ENTRAR nesta etapa.';

-- Etapas já criadas antes desta migration não têm código. Derivá-lo do nome
-- é seguro porque as etapas iniciais são sempre as seis do modelo.
UPDATE public.ag_job_etapas SET estado_codigo = CASE lower(nome)
    WHEN 'briefing'  THEN 'briefing'
    WHEN 'pesquisa'  THEN 'pesquisa'
    WHEN 'criação'   THEN 'criacao'
    WHEN 'criacao'   THEN 'criacao'
    WHEN 'revisão'   THEN 'revisao'
    WHEN 'revisao'   THEN 'revisao'
    WHEN 'aprovação' THEN 'aprovacao'
    WHEN 'aprovacao' THEN 'aprovacao'
    WHEN 'concluído' THEN 'concluido'
    WHEN 'concluido' THEN 'concluido'
    ELSE NULL
  END
WHERE estado_codigo IS NULL;

-- Regras razoáveis nas etapas do modelo, para quem já as semeou.
-- Deliberadamente modestas: só se exige quem faz e para quando, e só a partir
-- do momento em que alguém começa mesmo a criar.
UPDATE public.ag_job_etapas
   SET campos_obrigatorios = '["responsavel_id"]'::jsonb
 WHERE estado_codigo = 'pesquisa' AND campos_obrigatorios = '[]'::jsonb;

UPDATE public.ag_job_etapas
   SET campos_obrigatorios = '["responsavel_id","prazo"]'::jsonb
 WHERE estado_codigo = 'criacao' AND campos_obrigatorios = '[]'::jsonb;

-- ── 2. O job regista quando mudou de etapa ──────────────────────────────────
ALTER TABLE public.ag_jobs
  ADD COLUMN IF NOT EXISTS movido_em TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS ag_jobs_movido_idx ON public.ag_jobs(movido_em);

CREATE OR REPLACE FUNCTION public.ag_job_marca_movimento()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.etapa_id IS DISTINCT FROM OLD.etapa_id THEN
    NEW.movido_em := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ag_jobs_movimento ON public.ag_jobs;
CREATE TRIGGER ag_jobs_movimento
  BEFORE UPDATE ON public.ag_jobs
  FOR EACH ROW EXECUTE FUNCTION public.ag_job_marca_movimento();

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
