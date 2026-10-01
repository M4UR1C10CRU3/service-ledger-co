-- Bloco 6 de 6: as passagens entre funções.
--
-- Não pertencem a nenhuma função: pertencem às DUAS. É por não terem dono
-- declarado que o trabalho pára entre cadeiras à espera de que alguém repare.
DELETE FROM public.rh_funcao_passagens
WHERE grupo_id = (SELECT id FROM empresa_grupos WHERE nome = 'Grupo Obrajusta / Tudo Casa');

INSERT INTO public.rh_funcao_passagens (grupo_id, momento, entrega, recebe, leva_junto, ordem)
SELECT g.id, v.momento, v.entrega, v.recebe, v.leva_junto, v.ordem
FROM public.empresa_grupos g,
(VALUES
  ('Cliente pede algo que exige compra', 'Comercial', 'Compras',
   'Especificação, quantidades e prazo desejado', 1),
  ('Cotações reunidas', 'Compras', 'Técnico, depois Diretor',
   'Mapa comparativo e parecer', 2),
  ('Proposta adjudicada', 'Comercial', 'Financeiro e Compras',
   'Condições de pagamento e lista de material', 3),
  ('Primeira parcela recebida', 'Financeiro', 'Compras',
   'Confirmação para emitir a encomenda', 4),
  ('Material conferido e em palete', 'Compras', 'Produção',
   'Fotografia da palete e cópia da nota de encomenda', 5),
  ('Serviço concluído', 'Produção', 'Financeiro',
   'Confirmação de fecho para a parcela final', 6),
  ('Material extra usado na obra', 'Produção', 'Compras',
   'Registo na ficha do serviço, no próprio dia', 7)
) AS v(momento, entrega, recebe, leva_junto, ordem)
WHERE g.nome = 'Grupo Obrajusta / Tudo Casa';

-- Confirmação final dos seis blocos.
SELECT
  (SELECT count(*) FROM rh_funcoes
    WHERE grupo_id = (SELECT id FROM empresa_grupos WHERE nome = 'Grupo Obrajusta / Tudo Casa')) AS funcoes,
  (SELECT count(*) FROM rh_funcao_passagens
    WHERE grupo_id = (SELECT id FROM empresa_grupos WHERE nome = 'Grupo Obrajusta / Tudo Casa')) AS passagens;
