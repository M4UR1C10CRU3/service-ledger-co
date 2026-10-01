-- Bloco 4 de 6: Assistente de Compras.
INSERT INTO public.rh_funcoes
 (grupo_id, codigo, nome, departamento, nivel, cor, missao, reporta_a,
  local_trabalho, horario, ferramentas, requisitos, responsabilidades,
  nao_e_do_cargo, competencias, fluxos, indicadores, ordem)
SELECT g.id, 'assistente_compras', 'Assistente de Compras',
 'Administrativo e Comercial', 'assistente', '#1c6b5a',
 'Garantir que o material certo chega a tempo e ao melhor custo — e que o stock no sistema diz a verdade.',
 'Técnico Administrativo e Comercial',
 'Loja Tudo Casa', '40h semanais, segunda a sábado',
 'Clariza, Office, email corporativo, WhatsApp',
 jsonb_build_object(
   'obrigatorios', jsonb_build_array(
     '12.º ano completo',
     'Experiência mínima de um ano em compras, logística ou armazém',
     'Excel em nível intermédio para mapas comparativos'),
   'valorizados', jsonb_build_array(
     'Experiência em controlo de stock e inventário',
     'Conhecimento de materiais de construção e canalização')),
 jsonb_build_array(
   jsonb_build_object('area', 'Cotações', 'itens', jsonb_build_array(
     'Pedidos de cotação a fornecedores habituais e novos — aos novos, enviar primeiro a apresentação da empresa',
     'Confirmar por telefone que o pedido chegou e esclarecer dúvidas',
     'Elaborar o mapa comparativo: preço, condições de pagamento, prazo de entrega e portes')),
   jsonb_build_object('area', 'Encomendas', 'itens', jsonb_build_array(
     'Emitir a encomenda depois da adjudicação e pedir a fatura proforma',
     'Acompanhar a chegada e conferir o material contra a fatura — características, medidas, cor, quantidades, estado',
     'Abrir reclamação ao fornecedor de imediato em caso de não conformidade',
     'Cadastrar artigos e lançar a fatura de compra')),
   jsonb_build_object('area', 'Stock', 'itens', jsonb_build_array(
     'Inventário periódico por secção — pinturas, ferragens, tubagens PVC e PPR',
     'Etiquetagem, atualização de preços e controlo de validades',
     'Registar entradas e saídas sempre que material sai para uma obra')),
   jsonb_build_object('area', 'Apoio à produção', 'itens', jsonb_build_array(
     'Separar o material da obra em palete identificada com a nota de encomenda',
     'Enviar fotografia da palete à equipa de produção'))),
 jsonb_build_array(
   'Escolher o fornecedor — apresenta o mapa e o parecer, decide o Diretor',
   'Pagar ou autorizar pagamentos',
   'Negociar prazos de obra com o cliente'),
 jsonb_build_object(
   'profissionais', jsonb_build_array(
     'Rigor na conferência — é aqui que se apanham os erros caros',
     'Capacidade de comparar propostas para lá do preço',
     'Método no inventário: contar sempre da mesma forma'),
   'comportamentais', jsonb_build_array(
     'Persistência com fornecedores que não respondem',
     'Firmeza ao levantar uma não conformidade',
     'Honestidade absoluta nas contagens de stock')),
 jsonb_build_array(
   jsonb_build_object('titulo', 'Da cotação à receção',
     'passos', jsonb_build_array(
       jsonb_build_object('titulo', 'Pedido de cotação', 'descricao', 'Enviar aos fornecedores. A novos, enviar primeiro a apresentação da empresa'),
       jsonb_build_object('titulo', 'Confirmação', 'descricao', 'Ligar para confirmar que chegou e esclarecer dúvidas — evita esperar dias por nada'),
       jsonb_build_object('titulo', 'Mapa comparativo', 'descricao', 'Comparar preço, condições, prazo e portes. O mais barato nem sempre é o melhor'),
       jsonb_build_object('titulo', 'Parecer', 'descricao', 'Entregar mapa e parecer ao Técnico, que leva ao Diretor'),
       jsonb_build_object('titulo', 'Encomenda', 'descricao', 'Após adjudicação e confirmação da primeira parcela, emitir e pedir proforma'),
       jsonb_build_object('titulo', 'Pagamento', 'descricao', 'Enviar a proforma ao Financeiro e devolver o comprovativo ao fornecedor'),
       jsonb_build_object('titulo', 'Receção', 'descricao', 'Conferir contra a fatura: características, medidas, cor, quantidades e estado'),
       jsonb_build_object('titulo', 'Fecho', 'descricao', 'Cadastrar artigos, lançar a fatura, arquivar e avisar o Comercial')),
     'nota', 'Havendo divergência entre o pedido e o recebido, abrir a reclamação no próprio dia. Esperar para ver só torna a resolução mais difícil.')),
 jsonb_build_array(
   'Dias entre pedido e cotação recebida',
   'Divergência entre stock físico e sistema',
   'Não conformidades por encomenda',
   'Poupança obtida no mapa comparativo',
   'Ruturas de material essencial'),
 3
FROM public.empresa_grupos g
WHERE g.nome = 'Grupo Obrajusta / Tudo Casa'
ON CONFLICT (grupo_id, codigo) DO NOTHING;

SELECT nome, jsonb_array_length(responsabilidades) AS areas FROM public.rh_funcoes
WHERE codigo = 'assistente_compras';
