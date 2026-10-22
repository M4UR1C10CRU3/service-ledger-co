-- VERIFICAR o reforço de segurança — SÓ LEITURA. O papel e o utilizador simulados só valem dentro desta execução (SET LOCAL).
-- Correr ANTES e DEPOIS do reforço e comparar. Os números devem ser IGUAIS,
-- exceto liquidacoes e planeamento_* (passam a contar só as empresas do utilizador).
-- Trocar o id na linha marcada para testar outro utilizador:
--   ea257446-4084-4fde-a88f-5a24587b0241  Maurício Barreto (administrador, 5 empresas)
--   e2af4117-6543-4867-8e37-bcde3c5c43ef  Maurício Júnior (operacional, 5 empresas)
--   9cb4fdc8-2b56-4312-a936-da55bc4da16c  Cristiana Batista (administradora, 5 empresas)
SELECT set_config('request.jwt.claims',
  json_build_object('sub', auth_user_id, 'role', 'authenticated')::text, true)
FROM public.liberty_utilizadores
WHERE id = 'ea257446-4084-4fde-a88f-5a24587b0241';   -- <== utilizador a testar
SET LOCAL ROLE authenticated;
SELECT 'services' t, count(*) FROM public.services
UNION ALL SELECT 'accounts_payable', count(*) FROM public.accounts_payable
UNION ALL SELECT 'account_payments', count(*) FROM public.account_payments
UNION ALL SELECT 'cash_flows', count(*) FROM public.cash_flows
UNION ALL SELECT 'liquidacoes', count(*) FROM public.liquidacoes
UNION ALL SELECT 'clientes', count(*) FROM public.clientes
UNION ALL SELECT 'suppliers', count(*) FROM public.suppliers
UNION ALL SELECT 'employees', count(*) FROM public.employees
UNION ALL SELECT 'time_records', count(*) FROM public.time_records
UNION ALL SELECT 'propostas', count(*) FROM public.propostas
UNION ALL SELECT 'pedidos_orcamento', count(*) FROM public.pedidos_orcamento
UNION ALL SELECT 'ordens_servico', count(*) FROM public.ordens_servico
UNION ALL SELECT 'produtos', count(*) FROM public.produtos
UNION ALL SELECT 'stock_atual', count(*) FROM public.stock_atual
UNION ALL SELECT 'followup_oportunidades', count(*) FROM public.followup_oportunidades
UNION ALL SELECT 'quadro_cartoes', count(*) FROM public.quadro_cartoes
UNION ALL SELECT 'planeamento_cards', count(*) FROM public.planeamento_cards
UNION ALL SELECT 'ecommerce_produtos_monitorizados', count(*) FROM public.ecommerce_produtos_monitorizados
UNION ALL SELECT 'ecommerce_ajustes_preco', count(*) FROM public.ecommerce_ajustes_preco
UNION ALL SELECT 'liberty_utilizador_permissoes', count(*) FROM public.liberty_utilizador_permissoes
ORDER BY 1;
