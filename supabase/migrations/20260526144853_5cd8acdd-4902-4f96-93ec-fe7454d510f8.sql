
-- Trigger: auto-create Workflow Comercial opportunity when a PO is inserted
CREATE OR REPLACE FUNCTION public.fn_po_auto_create_oportunidade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opp_id uuid;
BEGIN
  -- Skip if an opportunity already exists for this PO
  IF EXISTS (SELECT 1 FROM public.followup_oportunidades WHERE po_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.followup_oportunidades (
    empresa_id, cliente_id, cliente_nome, titulo, fase,
    responsavel_nome, probabilidade, po_id, numero_po
  ) VALUES (
    NEW.empresa_id, NEW.cliente_id, NEW.cliente_nome,
    COALESCE(NEW.titulo, 'PO ' || NEW.numero_po),
    'po_recebido', NEW.vendedor_nome, 25, NEW.id, NEW.numero_po
  ) RETURNING id INTO v_opp_id;

  INSERT INTO public.followup_historico_fases (oportunidade_id, empresa_id, fase_nova, notas)
  VALUES (v_opp_id, NEW.empresa_id, 'po_recebido', 'Criada automaticamente a partir do PO');

  INSERT INTO public.workflow_checklist_items (oportunidade_id, empresa_id, ordem, texto, fase_associada)
  VALUES
    (v_opp_id, NEW.empresa_id, 0, 'Registar e analisar o PO recebido', 'po_recebido'),
    (v_opp_id, NEW.empresa_id, 1, 'Confirmar contacto com o cliente', 'po_recebido'),
    (v_opp_id, NEW.empresa_id, 2, 'Avaliar viabilidade do pedido', 'po_recebido'),
    (v_opp_id, NEW.empresa_id, 3, 'Atribuir responsável pela orçamentação', 'po_recebido');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_po_auto_create_oportunidade ON public.pedidos_orcamento;
CREATE TRIGGER trg_po_auto_create_oportunidade
AFTER INSERT ON public.pedidos_orcamento
FOR EACH ROW EXECUTE FUNCTION public.fn_po_auto_create_oportunidade();

-- Backfill: create opportunities for existing POs that have none
DO $$
DECLARE
  r RECORD;
  v_opp_id uuid;
BEGIN
  FOR r IN
    SELECT p.* FROM public.pedidos_orcamento p
    LEFT JOIN public.followup_oportunidades o ON o.po_id = p.id
    WHERE o.id IS NULL
  LOOP
    INSERT INTO public.followup_oportunidades (
      empresa_id, cliente_id, cliente_nome, titulo, fase,
      responsavel_nome, probabilidade, po_id, numero_po
    ) VALUES (
      r.empresa_id, r.cliente_id, r.cliente_nome,
      COALESCE(r.titulo, 'PO ' || r.numero_po),
      'po_recebido', r.vendedor_nome, 25, r.id, r.numero_po
    ) RETURNING id INTO v_opp_id;

    INSERT INTO public.followup_historico_fases (oportunidade_id, empresa_id, fase_nova, notas)
    VALUES (v_opp_id, r.empresa_id, 'po_recebido', 'Backfill: criada a partir do PO existente');

    INSERT INTO public.workflow_checklist_items (oportunidade_id, empresa_id, ordem, texto, fase_associada)
    VALUES
      (v_opp_id, r.empresa_id, 0, 'Registar e analisar o PO recebido', 'po_recebido'),
      (v_opp_id, r.empresa_id, 1, 'Confirmar contacto com o cliente', 'po_recebido'),
      (v_opp_id, r.empresa_id, 2, 'Avaliar viabilidade do pedido', 'po_recebido'),
      (v_opp_id, r.empresa_id, 3, 'Atribuir responsável pela orçamentação', 'po_recebido');
  END LOOP;
END $$;
