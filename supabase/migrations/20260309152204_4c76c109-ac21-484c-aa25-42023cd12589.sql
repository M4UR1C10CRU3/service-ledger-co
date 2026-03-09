
-- Delete erroneous stock movements for produto_ref '100208' (Palete - not a coded article)
DELETE FROM stock_movimentos WHERE produto_ref = '100208' AND empresa_id = '71bf4313-33ef-4cf0-991c-022cdde3f88a';

-- Delete erroneous stock_atual record for produto_ref '100208'
DELETE FROM stock_atual WHERE id = '173e717b-db54-4f81-87aa-105d1597ca23';
