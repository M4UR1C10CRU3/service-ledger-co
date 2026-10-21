-- Rasto de quem marcou/desmarcou cada tarefa da checklist dos Quadros — 21/10/2026
-- Porquê: uma tarefa do Diretor «voltou desmarcada» e não havia forma de saber
-- quem a marcou ou desmarcou, nem quando. As colunas guardam a ÚLTIMA mudança de
-- «concluido» (o valor atual diz se foi marcar ou desmarcar); o histórico
-- completo fica no feed do cartão, escrito pela aplicação.
-- O gatilho preenche-as sempre a partir da sessão (auth.uid()): ninguém as
-- escreve à mão, nem a aplicação. Não altera nenhum dado existente.
-- Reverter: sql-para-correr/2026-10-21-checklist-rasto-REVERTER.sql
BEGIN;

ALTER TABLE public.cartao_checklist_items
  ADD COLUMN IF NOT EXISTS concluido_alterado_por      uuid,
  ADD COLUMN IF NOT EXISTS concluido_alterado_por_nome text,
  ADD COLUMN IF NOT EXISTS concluido_alterado_em       timestamptz;

CREATE OR REPLACE FUNCTION public.checklist_item_regista_concluido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.concluido)
     OR (TG_OP = 'UPDATE' AND NEW.concluido IS DISTINCT FROM OLD.concluido) THEN
    NEW.concluido_alterado_por      := auth.uid();
    NEW.concluido_alterado_por_nome := (SELECT lu.nome FROM public.liberty_utilizadores lu
                                        WHERE lu.auth_user_id = auth.uid() LIMIT 1);
    NEW.concluido_alterado_em       := now();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.concluido_alterado_por      := OLD.concluido_alterado_por;
    NEW.concluido_alterado_por_nome := OLD.concluido_alterado_por_nome;
    NEW.concluido_alterado_em       := OLD.concluido_alterado_em;
  ELSE
    NEW.concluido_alterado_por      := NULL;
    NEW.concluido_alterado_por_nome := NULL;
    NEW.concluido_alterado_em       := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checklist_item_regista_concluido ON public.cartao_checklist_items;
CREATE TRIGGER trg_checklist_item_regista_concluido
  BEFORE INSERT OR UPDATE ON public.cartao_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.checklist_item_regista_concluido();

COMMIT;
