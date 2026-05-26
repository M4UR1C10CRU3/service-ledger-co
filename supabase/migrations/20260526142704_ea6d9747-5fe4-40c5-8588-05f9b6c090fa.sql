
-- 1. Add PO link columns to existing followup_oportunidades
ALTER TABLE public.followup_oportunidades
  ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES public.pedidos_orcamento(id),
  ADD COLUMN IF NOT EXISTS numero_po TEXT;

-- 2. Migrate existing fase values to new workflow taxonomy
UPDATE public.followup_oportunidades SET fase = 'po_recebido' WHERE fase = 'contacto_inicial';
UPDATE public.followup_oportunidades SET fase = 'em_negociacao' WHERE fase = 'decisao_pendente';
UPDATE public.followup_oportunidades SET fase = 'perdido' WHERE fase = 'arquivado';

-- 3. New checklist table
CREATE TABLE IF NOT EXISTS public.workflow_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id UUID NOT NULL REFERENCES public.followup_oportunidades(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  ordem INTEGER NOT NULL DEFAULT 0,
  texto TEXT NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT FALSE,
  responsavel_id UUID,
  responsavel_nome TEXT,
  prazo DATE,
  prazo_hora TIME,
  fase_associada TEXT,
  concluido_por_nome TEXT,
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_checklist_items TO authenticated;
GRANT ALL ON public.workflow_checklist_items TO service_role;

ALTER TABLE public.workflow_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workflow checklist scoped to empresa membership - select"
  ON public.workflow_checklist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.liberty_utilizador_empresas lue
      JOIN public.liberty_utilizadores lu ON lu.id = lue.utilizador_id
      WHERE lu.auth_user_id = auth.uid()
        AND lue.empresa_id = workflow_checklist_items.empresa_id
    )
  );

CREATE POLICY "Workflow checklist scoped to empresa membership - insert"
  ON public.workflow_checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.liberty_utilizador_empresas lue
      JOIN public.liberty_utilizadores lu ON lu.id = lue.utilizador_id
      WHERE lu.auth_user_id = auth.uid()
        AND lue.empresa_id = workflow_checklist_items.empresa_id
    )
  );

CREATE POLICY "Workflow checklist scoped to empresa membership - update"
  ON public.workflow_checklist_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.liberty_utilizador_empresas lue
      JOIN public.liberty_utilizadores lu ON lu.id = lue.utilizador_id
      WHERE lu.auth_user_id = auth.uid()
        AND lue.empresa_id = workflow_checklist_items.empresa_id
    )
  );

CREATE POLICY "Workflow checklist scoped to empresa membership - delete"
  ON public.workflow_checklist_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.liberty_utilizador_empresas lue
      JOIN public.liberty_utilizadores lu ON lu.id = lue.utilizador_id
      WHERE lu.auth_user_id = auth.uid()
        AND lue.empresa_id = workflow_checklist_items.empresa_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_workflow_checklist_oportunidade ON public.workflow_checklist_items(oportunidade_id);
CREATE INDEX IF NOT EXISTS idx_workflow_checklist_empresa ON public.workflow_checklist_items(empresa_id);

CREATE TRIGGER trg_workflow_checklist_updated_at
  BEFORE UPDATE ON public.workflow_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
