-- ITC · Ativar os 14 cursos inativos, preenchendo descrição, objetivo, metodologia e reconhecimento (29/09/2026).
-- Cópia de segurança já feita em backups.school_cursos_20260929 (14 linhas, RLS ligado).
-- Só toca cursos ainda inativos cuja descrição é a nota provisória «Criado a partir do levantamento…».
-- Deve devolver 14 linhas. Carga horária e conteúdo programático NÃO são alterados.
-- Única mudança de validade: NR-11 passa de 24 para 12 meses (NR-11: cartão do operador válido por um ano).
-- Reverter: update public.school_cursos c set ativo=b.ativo, validade_meses=b.validade_meses, validade_anos=b.validade_anos,
--   descricao=b.descricao, objetivo=b.objetivo, metodologia=b.metodologia, reconhecimento=b.reconhecimento
--   from backups.school_cursos_20260929 b where c.id=b.id;

update public.school_cursos c set
  ativo = true,
  validade_meses = v.vm,
  validade_anos = greatest(1, round(v.vm / 12.0)::int),
  descricao = v.d, objetivo = v.o, metodologia = v.m, reconhecimento = v.r,
  updated_at = now()
from (values
('MOPP — Transporte de Produtos Perigosos', 60,
 'Curso especializado para condutores de veículos de transporte de produtos perigosos (MOPP), conforme a Resolução CONTRAN n.º 789/2020, com carga horária de 50 horas e validade de 5 anos. A conclusão deve ser registrada no prontuário do condutor junto ao DETRAN, e a renovação exige curso de atualização.',
 'Capacitar o condutor a transportar produtos perigosos com segurança, conhecendo a legislação, a classificação e a sinalização das cargas, a prevenção de acidentes e os procedimentos de emergência, primeiros socorros e combate a incêndio.',
 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e em conformidade com a Resolução CONTRAN n.º 789/2020.'),
('NR-06 — Equipamentos de Proteção Individual', 12,
 'Treinamento sobre seleção, uso, guarda, higienização e conservação dos Equipamentos de Proteção Individual, conforme a NR-06, que obriga o empregador a orientar e treinar o trabalhador sobre o uso adequado do EPI. Inclui a verificação do Certificado de Aprovação (CA) e as limitações de proteção de cada equipamento.',
 'Capacitar o trabalhador a selecionar, utilizar, inspecionar e conservar corretamente os EPI adequados aos riscos da sua atividade, reconhecendo as suas limitações e as responsabilidades do empregador e do empregado.',
 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-06 (MTE/Brasil).'),
('NR-11 — Operador de Empilhadeira', 12,
 'Treinamento para operadores de empilhadeira conforme a NR-11, que exige capacitação específica e identificação do operador habilitado, com cartão de identificação válido por um ano e revalidação mediante exame de saúde. Aborda a inspeção pré-uso, a estabilidade e a capacidade de carga, e a movimentação e o empilhamento seguros.',
 'Capacitar o trabalhador a operar empilhadeiras com segurança, realizando a inspeção diária do equipamento, respeitando a capacidade e o centro de carga, e prevenindo tombamentos, colisões e atropelamentos.',
 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-11 (MTE/Brasil).'),
('NR-13 — Operador de Caldeiras e Vasos de Pressão', 12,
 'Treinamento de segurança para operadores de caldeiras e vasos de pressão, conforme a NR-13 e o seu Anexo I. A habilitação do operador exige, além deste treinamento, o estágio prático supervisionado previsto na norma, a realizar no próprio estabelecimento.',
 'Capacitar o trabalhador a operar caldeiras e vasos de pressão com segurança, conhecendo os seus princípios de funcionamento, os dispositivos de segurança, os riscos de explosão e os procedimentos de inspeção e de emergência.',
 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-13 (MTE/Brasil).'),
('NR-17 — Ergonomia no Trabalho', 12,
 'Treinamento sobre ergonomia no trabalho conforme a NR-17, abordando a adaptação das condições de trabalho às características psicofisiológicas dos trabalhadores: levantamento e transporte de cargas, mobiliário e postos de trabalho, organização do trabalho e prevenção de LER/DORT.',
 'Capacitar o trabalhador a reconhecer os riscos ergonômicos da sua atividade e a adotar posturas, pausas e práticas de trabalho que previnam lesões e doenças osteomusculares.',
 'Aulas teóricas com suporte audiovisual, simulações práticas em ambiente controlado, estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-17 (MTE/Brasil).'),
('NR-18 — Segurança na Construção Civil', 12,
 'Treinamento de segurança e saúde na indústria da construção conforme a NR-18, com informações sobre as condições e o meio ambiente de trabalho, os riscos inerentes à função, o uso de EPC e EPI e os procedimentos de emergência no canteiro de obras.',
 'Capacitar o trabalhador a executar as suas atividades no canteiro de obras com segurança, identificando os riscos de quedas, soterramento, eletricidade e máquinas, e aplicando as medidas de prevenção e proteção previstas na NR-18.',
 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-18 (MTE/Brasil).'),
('NR-20 — Avançado I (Inflamáveis e Combustíveis)', 24,
 'Curso Avançado I da NR-20 para trabalhadores que atuam em instalações com inflamáveis e combustíveis, conforme o Anexo II da norma, com atualização a cada dois anos. Aborda a análise de riscos, o controle de fontes de ignição, a prevenção e o combate a incêndios e o plano de resposta a emergências.',
 'Capacitar o trabalhador a atuar com segurança em instalações de inflamáveis e combustíveis, identificando os riscos de incêndio e explosão, aplicando as medidas de controle e participando da resposta a emergências.',
 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-20 (MTE/Brasil).'),
('NR-22 — Segurança na Mineração (Formação Admissional)', 12,
 'Treinamento introdutório de segurança e saúde na mineração conforme a NR-22, para trabalhadores admitidos em atividades de mineração, abordando os riscos da atividade mineira, as normas internas, os equipamentos de proteção e os procedimentos de emergência e salvamento.',
 'Capacitar o trabalhador recém-admitido a executar atividades de mineração com segurança, reconhecendo os riscos do ambiente mineiro e as medidas de prevenção e de resposta a emergências.',
 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-22 (MTE/Brasil).'),
('NR-26 — Sinalização de Segurança', 12,
 'Treinamento sobre sinalização de segurança conforme a NR-26, abordando as cores de segurança, a identificação de produtos químicos pelo sistema GHS, a rotulagem preventiva e as fichas com dados de segurança (FDS).',
 'Capacitar o trabalhador a interpretar a sinalização de segurança, os rótulos e as fichas com dados de segurança dos produtos químicos, adotando as precauções indicadas.',
 'Aulas teóricas com suporte audiovisual, simulações práticas em ambiente controlado, estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-26 (MTE/Brasil).'),
('NR-29 — Segurança no Trabalho Portuário', 12,
 'Treinamento de segurança e saúde no trabalho portuário conforme a NR-29, abordando as operações de carga e descarga, a movimentação de mercadorias, o trabalho a bordo e em terra, as cargas perigosas e os planos de controle de emergência.',
 'Capacitar o trabalhador portuário a executar as suas atividades com segurança, identificando os riscos das operações portuárias e aplicando as medidas de prevenção e os procedimentos de emergência.',
 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-29 (MTE/Brasil).'),
('NR-30 — Segurança no Trabalho Aquaviário', 12,
 'Treinamento de segurança e saúde no trabalho aquaviário conforme a NR-30, abordando os riscos a bordo de embarcações, as condições de trabalho e de alojamento e os procedimentos de emergência e abandono da embarcação.',
 'Capacitar o trabalhador aquaviário a identificar os riscos do trabalho a bordo e a aplicar as medidas de prevenção e os procedimentos de emergência e abandono da embarcação.',
 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-30 (MTE/Brasil).'),
('NR-31 — Segurança no Trabalho Rural e Agroindústria', 12,
 'Treinamento de segurança e saúde no trabalho na agricultura, pecuária, silvicultura, exploração florestal e aquicultura, conforme a NR-31, abordando o uso de máquinas e implementos, o manuseio de agrotóxicos, as ferramentas manuais e a prevenção de acidentes com animais peçonhentos. Não substitui as capacitações específicas exigidas pela norma para a aplicação de agrotóxicos e a operação de máquinas.',
 'Capacitar o trabalhador rural a reconhecer os riscos das atividades agrícolas e agroindustriais e a adotar as medidas de prevenção e proteção previstas na NR-31.',
 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-31 (MTE/Brasil).'),
('NR-32 — Segurança em Serviços de Saúde', 12,
 'Treinamento de segurança e saúde em serviços de saúde conforme a NR-32, abordando os riscos biológicos, químicos e radiológicos, o manuseio de perfurocortantes, o uso de EPI, a vacinação e o gerenciamento de resíduos de serviços de saúde.',
 'Capacitar o profissional de serviços de saúde a identificar os riscos da sua atividade e a aplicar as medidas de proteção, incluindo o manuseio seguro de perfurocortantes e o descarte correto de resíduos.',
 'Aulas teóricas com suporte audiovisual, simulações práticas em ambiente controlado, estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-32 (MTE/Brasil).'),
('NR-34 — Construção e Reparação Naval', 12,
 'Treinamento admissional de segurança e saúde na indústria da construção, reparação e desmonte naval conforme a NR-34, abordando os trabalhos a quente, em altura e em espaços confinados a bordo, a movimentação de cargas e os procedimentos de emergência.',
 'Capacitar o trabalhador da indústria naval a executar as suas atividades com segurança, reconhecendo os riscos específicos do ambiente naval e aplicando as medidas de prevenção previstas na NR-34.',
 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-34 (MTE/Brasil).')
) as v(nome, vm, d, o, m, r)
where c.nome = v.nome
  and not c.ativo
  and c.descricao like 'Criado a partir do levantamento%'
  and c.empresa_id = (select id from public.empresas where nome ilike '%ITC%' limit 1)
returning c.nome, c.ativo, c.validade_meses;
