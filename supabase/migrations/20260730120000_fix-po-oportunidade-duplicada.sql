-- Corrige duplicação de oportunidades do Workflow Comercial ao criar um PDP.
--
-- Antes: o trigger fn_po_auto_create_oportunidade (20260526144853) criava a
-- oportunidade para QUALQUER pedido inserido, sem olhar para tipo_pedido
-- (coluna que na altura ainda não existia). O código cliente também criava
-- a sua própria oportunidade para tipo_pedido != 'intervencao_imediata'.
-- Resultado: pedidos de 'orcamentacao' geravam 2 oportunidades; pedidos de
-- 'intervencao_imediata' geravam 1 (quando a intenção era gerar 0).
--
-- Esta migration corrige o trigger para respeitar tipo_pedido, tornando-o a
-- ÚNICA fonte de criação da oportunidade. O código cliente correspondente
-- (usePedidosOrcamento.ts) já foi atualizado para deixar de inserir
-- manualmente em followup_oportunidades.
CREATE OR REPLACE FUNCTION public.fn_po_auto_create_oportunidade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opp_id uuid;
BEGIN
  -- Não criar oportunidade para intervenção imediata.
  IF NEW.tipo_pedido = 'intervencao_imediata' THEN
    RETURN NEW;
  END IF;

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

-- Backfill: remove duplicados já criados para o mesmo PO, mantendo o mais antigo.
-- (Não corre automaticamente aqui — ver instruções de aplicação junto ao utilizador.)
