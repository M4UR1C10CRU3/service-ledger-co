-- Bloco 2 de 6: Técnico Administrativo e Comercial.
INSERT INTO public.rh_funcoes
 (grupo_id, codigo, nome, departamento, nivel, cor, missao, reporta_a,
  local_trabalho, horario, ferramentas, requisitos, responsabilidades,
  nao_e_do_cargo, competencias, fluxos, indicadores, substitui, ordem)
SELECT g.id, 'tecnico_admin_comercial', 'Técnico Administrativo e Comercial',
 'Administrativo e Comercial', 'tecnico', '#1f4e79',
 'Garantir que o processo comercial corre de ponta a ponta — e que nada fica parado entre duas pessoas por não ter dono.',
 'Diretor Comercial e Diretora Financeira',
 'Loja Tudo Casa, com visitas semanais à Obrajusta',
 '40h semanais, segunda a sábado',
 'Clariza, Office, email corporativo',
 jsonb_build_object(
   'obrigatorios', jsonb_build_array(
     '12.º ano completo; licenciatura em Administração, Gestão Comercial ou Contabilidade valorizada',
     'Experiência anterior de coordenação de equipa',
     'Experiência com sistemas de gestão'),
   'valorizados', jsonb_build_array(
     'Noções de lançamentos fiscais e contabilísticos',
     'Experiência em controlo de stock e inventário')),
 jsonb_build_array(
   jsonb_build_object('area', 'Coordenação', 'itens', jsonb_build_array(
     'Coordenar o trabalho das três assistências e distribuir prioridades quando entram em conflito',
     'Garantir que cada passagem entre funções acontece — é a responsabilidade que mais distingue este cargo',
     'Formar quem entra e assegurar cobertura durante férias e ausências')),
   jsonb_build_object('area', 'Comercial', 'itens', jsonb_build_array(
     'Rever propostas antes de seguirem para validação do Diretor Comercial',
     'Analisar o mapa comparativo de fornecedores e emitir parecer antes da decisão')),
   jsonb_build_object('area', 'Administrativo', 'itens', jsonb_build_array(
     'Fecho mensal: conferir a documentação preparada para a contabilidade antes do envio',
     'Visitas semanais à Obrajusta para alinhamento com a operação'))),
 jsonb_build_array(
   'Aprovar propostas comerciais — continua a ser exclusivo do Diretor Comercial',
   'Escolher fornecedor: apresenta parecer, a decisão é do Diretor',
   'Substituir permanentemente uma assistência — cobre ausências, não absorve o posto'),
 jsonb_build_object(
   'profissionais', jsonb_build_array(
     'Visão do processo completo, não apenas da sua parte',
     'Capacidade de detetar o que parou antes de alguém se queixar',
     'Comunicação clara com direção e com equipa'),
   'comportamentais', jsonb_build_array(
     'Isenção ao arbitrar prioridades entre colegas',
     'Ética profissional e discrição',
     'Firmeza sem autoritarismo')),
 jsonb_build_array(
   jsonb_build_object('titulo', 'Rotina de acompanhamento',
     'passos', jsonb_build_array(
       jsonb_build_object('titulo', 'Início do dia', 'descricao', 'Verificar o que ficou parado da véspera em cada uma das três frentes'),
       jsonb_build_object('titulo', 'Propostas', 'descricao', 'Rever as propostas prontas e encaminhar ao Diretor Comercial para validação'),
       jsonb_build_object('titulo', 'Cotações', 'descricao', 'Analisar mapas comparativos recebidos e preparar o parecer'),
       jsonb_build_object('titulo', 'Passagens', 'descricao', 'Confirmar que o que mudou de mãos ontem foi efetivamente recebido'),
       jsonb_build_object('titulo', 'Fim do mês', 'descricao', 'Conferir a documentação para a contabilidade antes de sair')),
     'nota', 'Nenhuma proposta comercial é apresentada ao cliente sem validação do Diretor Comercial. A criação deste cargo não altera essa regra.')),
 jsonb_build_array(
   'Processos parados há mais de 5 dias',
   'Propostas devolvidas pelo Diretor por erro',
   'Fecho mensal entregue dentro do prazo',
   'Cobertura assegurada em ausências'),
 'Assistente Administrativo e Comercial (revisão 27/12/2025)', 1
FROM public.empresa_grupos g
WHERE g.nome = 'Grupo Obrajusta / Tudo Casa'
ON CONFLICT (grupo_id, codigo) DO NOTHING;

SELECT nome, nivel, jsonb_array_length(responsabilidades) AS areas,
       jsonb_array_length(nao_e_do_cargo) AS limites
FROM public.rh_funcoes WHERE codigo = 'tecnico_admin_comercial';
