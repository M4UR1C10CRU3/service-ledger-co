-- VERIFICAR o rasto da checklist — SÓ LEITURA. 21/10/2026
-- Depois de aplicar a migração, marcar/desmarcar uma tarefa na app e correr isto:
-- a tarefa deve aparecer no topo com o seu nome e a hora.
SELECT (i.concluido_alterado_em AT TIME ZONE 'Europe/Lisbon') AS quando,
       i.concluido_alterado_por_nome AS quem,
       CASE WHEN i.concluido THEN 'marcou' ELSE 'desmarcou' END AS o_que,
       i.texto AS tarefa,
       c.titulo AS cartao
FROM public.cartao_checklist_items i
JOIN public.cartao_checklists cl ON cl.id = i.checklist_id
JOIN public.quadro_cartoes c ON c.id = cl.cartao_id
WHERE i.concluido_alterado_em IS NOT NULL
ORDER BY i.concluido_alterado_em DESC
LIMIT 20;
