-- DIAGNÓSTICO B — o que a sessão do Ricardo Pessoa vê na checklist do cartão — SÓ LEITURA. 21/10/2026
-- Simula a sessão do Ricardo só dentro desta execução (set_config(..., true) + SET LOCAL); nada é gravado.
-- A regra de cartao_checklist_items é FOR ALL: a MESMA condição vale para ler e para gravar.
-- Logo, se o Ricardo VÊ o item aqui (e o diagnóstico A não mostrar outras regras nem gatilhos),
-- um «marcar» feito por ele nesse item passa a RLS.
-- Confirmar na 1.ª coluna que diz «authenticated» (se disser «postgres», a simulação não pegou).
SELECT set_config('request.jwt.claims',
  json_build_object('sub', auth_user_id, 'role', 'authenticated')::text, true)
FROM public.liberty_utilizadores WHERE nome ILIKE '%Ricardo%Pessoa%' LIMIT 1;
SET LOCAL ROLE authenticated;
SELECT current_user AS papel, auth.uid() AS sessao_simulada, x.*
FROM (SELECT 1) AS um
LEFT JOIN LATERAL (
  SELECT left(c.id::text, 8) AS cartao, c.titulo, i.posicao, i.concluido, i.texto, i.responsavel_nome
  FROM public.quadro_cartoes c
  JOIN public.cartao_checklists cl ON cl.cartao_id = c.id
  JOIN public.cartao_checklist_items i ON i.checklist_id = cl.id
  WHERE c.titulo ILIKE '%Carvas%' AND cl.titulo ILIKE 'Orçamentação%'
) AS x ON true
ORDER BY x.cartao, x.posicao;
