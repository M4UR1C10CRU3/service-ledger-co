-- Bloco 5 de 6: Assistente Administrativo Financeiro.
INSERT INTO public.rh_funcoes
 (grupo_id, codigo, nome, departamento, nivel, cor, missao, reporta_a,
  local_trabalho, horario, ferramentas, requisitos, responsabilidades,
  nao_e_do_cargo, competencias, fluxos, indicadores, ordem)
SELECT g.id, 'assistente_admin_financeiro', 'Assistente Administrativo Financeiro',
 'Administrativo e Comercial', 'assistente', '#8a5a1a',
 'Que o dinheiro entre e saia no tempo certo, e que a papelada chegue à contabilidade pronta.',
 'Técnico Administrativo e Comercial, com articulação direta com a Diretora Financeira',
 'Loja Tudo Casa', '40h semanais, segunda a sábado',
 'Clariza, Office, email corporativo, homebanking (consulta)',
 jsonb_build_object(
   'obrigatorios', jsonb_build_array(
     '12.º ano completo; formação em Contabilidade ou Administração valorizada',
     'Experiência mínima de um ano em rotinas administrativas ou contabilísticas',
     'Excel em nível intermédio'),
   'valorizados', jsonb_build_array(
     'Noções de lançamentos fiscais e contabilísticos',
     'Experiência em cobranças')),
 jsonb_build_array(
   jsonb_build_object('area', 'Recebimentos', 'itens', jsonb_build_array(
     'Contactar o cliente para a primeira parcela logo após a adjudicação',
     'Acompanhar com a Diretora Financeira a confirmação de entrada dos pagamentos',
     'Contactar o cliente para a parcela final assim que a produção fecha o serviço')),
   jsonb_build_object('area', 'Pagamentos', 'itens', jsonb_build_array(
     'Encaminhar as faturas proforma recebidas de Compras para pagamento',
     'Devolver os comprovativos a Compras, para dar resposta ao fornecedor')),
   jsonb_build_object('area', 'Cobranças', 'itens', jsonb_build_array(
     'Cobranças periódicas a clientes em débito, com registo de cada comunicação',
     'Alertar o Técnico quando uma dívida ultrapassa o prazo aceitável')),
   jsonb_build_object('area', 'Documentação', 'itens', jsonb_build_array(
     'Lançamento semanal das faturas de despesa',
     'Preparar a documentação mensal para a contabilidade',
     'Emitir as faturas das empresas do grupo'))),
 jsonb_build_array(
   'Negociar condições de pagamento — são fixadas na proposta pelo Diretor Comercial',
   'Autorizar pagamentos a fornecedores — é da Diretora Financeira',
   'Decidir se um cliente em dívida continua a ser servido'),
 jsonb_build_object(
   'profissionais', jsonb_build_array(
     'Rigor com números e datas',
     'Método: o lançamento semanal não pode acumular para o fim do mês',
     'Registo escrito de cada contacto de cobrança'),
   'comportamentais', jsonb_build_array(
     'Firmeza cordial na cobrança — insistir sem hostilizar',
     'Discrição absoluta sobre valores e situações de clientes',
     'Sangue-frio em conversas difíceis')),
 jsonb_build_array(
   jsonb_build_object('titulo', 'O ciclo do dinheiro',
     'passos', jsonb_build_array(
       jsonb_build_object('titulo', 'Primeira parcela', 'descricao', 'Após adjudicação, contactar o cliente conforme as condições da proposta'),
       jsonb_build_object('titulo', 'Confirmação', 'descricao', 'Acompanhar com a Diretora Financeira a entrada efetiva, e avisar Compras'),
       jsonb_build_object('titulo', 'Fornecedor', 'descricao', 'Receber a proforma de Compras e encaminhar para pagamento'),
       jsonb_build_object('titulo', 'Comprovativo', 'descricao', 'Devolver o comprovativo a Compras para dar resposta ao fornecedor'),
       jsonb_build_object('titulo', 'Parcela final', 'descricao', 'Assim que a produção fecha o serviço, contactar o cliente'),
       jsonb_build_object('titulo', 'Cobrança', 'descricao', 'Se não entrar, cobrar periodicamente e registar cada contacto')),
     'nota', 'Cada contacto de cobrança fica registado. Sem registo não há forma de provar o que foi dito, nem de decidir quando escalar.')),
 jsonb_build_array(
   'Prazo médio de recebimento',
   'Valor em dívida há mais de 30 dias',
   'Faturas de despesa lançadas dentro da semana',
   'Documentação mensal entregue a tempo',
   'Contactos de cobrança registados'),
 4
FROM public.empresa_grupos g
WHERE g.nome = 'Grupo Obrajusta / Tudo Casa'
ON CONFLICT (grupo_id, codigo) DO NOTHING;

SELECT nome, jsonb_array_length(responsabilidades) AS areas FROM public.rh_funcoes
WHERE codigo = 'assistente_admin_financeiro';
