-- Bloco 3 de 6: Assistente Comercial.
INSERT INTO public.rh_funcoes
 (grupo_id, codigo, nome, departamento, nivel, cor, missao, reporta_a,
  local_trabalho, horario, ferramentas, requisitos, responsabilidades,
  nao_e_do_cargo, competencias, fluxos, indicadores, ordem)
SELECT g.id, 'assistente_comercial', 'Assistente Comercial',
 'Administrativo e Comercial', 'assistente', '#8a3b6b',
 'Ser a cara da empresa para quem compra, do primeiro contacto até depois da obra entregue.',
 'Técnico Administrativo e Comercial',
 'Loja Tudo Casa', '40h semanais, segunda a sábado',
 'Clariza, Office, email corporativo, WhatsApp',
 jsonb_build_object(
   'obrigatorios', jsonb_build_array(
     '12.º ano completo',
     'Experiência mínima de um ano em atendimento ou rotinas comerciais',
     'Office em nível intermédio'),
   'valorizados', jsonb_build_array(
     'Experiência em venda de materiais de construção ou casa de banho',
     'Formação em técnicas de venda ou atendimento')),
 jsonb_build_array(
   jsonb_build_object('area', 'Atendimento', 'itens', jsonb_build_array(
     'Atendimento inicial e identificação da necessidade real do cliente',
     'Abrir a ficha de cliente e o processo no sistema')),
   jsonb_build_object('area', 'Proposta', 'itens', jsonb_build_array(
     'Elaborar a proposta comercial e prepará-la para validação',
     'Trabalhos a mais: elaborar a proposta adicional e obter aprovação por escrito do cliente')),
   jsonb_build_object('area', 'Acompanhamento', 'itens', jsonb_build_array(
     'Follow-up no prazo acordado, sem esperar que o cliente ligue primeiro',
     'Registar o motivo sempre que um cliente desiste — é isto que ensina a melhorar',
     'Confirmar com o cliente a data de execução antes de a produção arrancar')),
   jsonb_build_object('area', 'Pós-venda', 'itens', jsonb_build_array(
     'Acompanhamento após a entrega e tratamento de reclamações'))),
 jsonb_build_array(
   'Pedir cotações a fornecedores — é do Assistente de Compras',
   'Cobrar pagamentos — é do Assistente Administrativo Financeiro',
   'Enviar uma proposta sem validação do Diretor Comercial'),
 jsonb_build_object(
   'profissionais', jsonb_build_array(
     'Escuta ativa: perceber o que o cliente precisa, não só o que pediu',
     'Escrita clara em propostas e emails',
     'Organização do próprio follow-up sem depender de quem lembre'),
   'comportamentais', jsonb_build_array(
     'Paciência e cordialidade, sobretudo em reclamações',
     'Honestidade sobre prazos — prometer menos e cumprir',
     'Trabalho em equipa com Compras e Produção')),
 jsonb_build_array(
   jsonb_build_object('titulo', 'Do primeiro contacto à adjudicação',
     'passos', jsonb_build_array(
       jsonb_build_object('titulo', 'Atendimento inicial', 'descricao', 'Receber o cliente, identificar a necessidade e abrir o processo no sistema'),
       jsonb_build_object('titulo', 'Material a comprar', 'descricao', 'Se a obra exigir compra, passar a Compras a especificação, quantidades e prazo desejado'),
       jsonb_build_object('titulo', 'Proposta', 'descricao', 'Elaborar a proposta e entregá-la ao Técnico para revisão'),
       jsonb_build_object('titulo', 'Validação', 'descricao', 'Aguardar a validação do Diretor Comercial. Só depois se envia ao cliente'),
       jsonb_build_object('titulo', 'Follow-up', 'descricao', 'Contactar no prazo acordado e registar a resposta — incluindo o motivo, se for não'),
       jsonb_build_object('titulo', 'Adjudicação', 'descricao', 'Avisar Financeiro (primeira parcela) e Compras (encomenda) no mesmo dia'),
       jsonb_build_object('titulo', 'Agenda', 'descricao', 'Confirmar a data com o cliente antes de a produção arrancar')),
     'nota', 'O registo do motivo de perda não é burocracia: é a única forma de perceber se se perde por preço, por prazo ou por atendimento.')),
 jsonb_build_array(
   'Propostas emitidas',
   'Taxa de conversão',
   'Tempo até ao primeiro follow-up',
   'Motivos de perda registados',
   'Reclamações resolvidas sem escalar'),
 2
FROM public.empresa_grupos g
WHERE g.nome = 'Grupo Obrajusta / Tudo Casa'
ON CONFLICT (grupo_id, codigo) DO NOTHING;

SELECT nome, jsonb_array_length(responsabilidades) AS areas FROM public.rh_funcoes
WHERE codigo = 'assistente_comercial';
