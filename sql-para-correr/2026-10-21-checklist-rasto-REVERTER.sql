-- REVERTER o rasto da checklist (20261021120000_checklist-rasto-concluido.sql) — 21/10/2026
-- Tira o gatilho e a função. As colunas ficam (com o rasto já registado), para não se perder nada;
-- a aplicação não as lê, por isso podem ficar sem problema.
BEGIN;
DROP TRIGGER IF EXISTS trg_checklist_item_regista_concluido ON public.cartao_checklist_items;
DROP FUNCTION IF EXISTS public.checklist_item_regista_concluido();
COMMIT;

-- Só se quiser apagar também o rasto registado (irreversível):
-- ALTER TABLE public.cartao_checklist_items
--   DROP COLUMN IF EXISTS concluido_alterado_por,
--   DROP COLUMN IF EXISTS concluido_alterado_por_nome,
--   DROP COLUMN IF EXISTS concluido_alterado_em;
