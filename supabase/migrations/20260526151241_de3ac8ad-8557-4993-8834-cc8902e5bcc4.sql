UPDATE public.pedidos_orcamento SET numero_po = REPLACE(numero_po, 'OJMIECPO', 'OJMIIECPO') WHERE numero_po LIKE 'OJMIECPO%';
UPDATE public.followup_oportunidades SET numero_po = REPLACE(numero_po, 'OJMIECPO', 'OJMIIECPO') WHERE numero_po LIKE 'OJMIECPO%';
UPDATE public.propostas SET numero_po = REPLACE(numero_po, 'OJMIECPO', 'OJMIIECPO') WHERE numero_po LIKE 'OJMIECPO%';