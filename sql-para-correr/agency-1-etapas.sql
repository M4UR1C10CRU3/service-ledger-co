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

