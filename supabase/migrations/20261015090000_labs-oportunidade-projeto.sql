-- Clariza Labs: ligação oportunidade (Workflow Comercial) → projeto (Workflow de Produção). 15/10/2026
-- Ao adjudicar uma oportunidade abre-se o projeto na produção; esta coluna liga-os e impede
-- que a mesma oportunidade abra dois projetos.
ALTER TABLE public.ag_projetos
  ADD COLUMN IF NOT EXISTS oportunidade_id UUID REFERENCES public.followup_oportunidades(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ag_projetos_oportunidade_uidx
  ON public.ag_projetos (oportunidade_id) WHERE oportunidade_id IS NOT NULL;
