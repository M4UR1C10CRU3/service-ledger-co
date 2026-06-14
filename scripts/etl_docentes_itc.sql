-- ============================================================
-- ETL: Docentes ITC → Clariza School
-- ITC empresa_id no Clariza: b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b
-- IDs originais preservados para manter FK com school_turmas
-- Correr no SQL Editor do CLARIZA (qeskzaodgfveidyeghbm)
-- ============================================================

INSERT INTO public.school_docentes (
  id, empresa_id, nome, email, telefone,
  formacao, area_especializacao, resumo, ativo
)
VALUES
(
  '5ef73ef9-5bf9-429c-9c31-25333cf79c39',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Renevaldo Machado Cavalcante',
  'renner.cavalcante@hotmail.com',
  '(96) 98102-8484',
  'Eletrotécnico, Técnico em Segurança do Trabalho e Bombeiro Civil Resgatista',
  'Elétrica, Resgate e Segurança do Trabalho',
  'CEO do ITC e instrutor com sólida trajetória no ITC e SENAI. Especialista em trabalho em altura, espaços confinados e resgate técnico avançado, possui certificações internacionais da Alemanha e Espanha. É Pedagogo, pós-graduado em Saúde e Segurança e Técnico em Eletrotécnica e Segurança do Trabalho. Atua como auditor de gestão (ISO 14001) e qualidade, além de ser alpinista industrial IRATA.',
  true
),
(
  '8b4d4396-fec8-4ade-a6db-8e4bfb1cf9b3',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Diego da Silva Nobre',
  'diegodasilvanobre@gmail.com',
  '(96) 98415-9352',
  'Enfermeiro e Bombeiro Civil Resgatista',
  'Saúde, Resgate e Segurança do Trabalho',
  'Enfermeiro, especialista em urgência e emergência com mais de 12 anos de experiência em planos de contingência e atendimento emergencial. Especialista em transporte aeromédico e resgate em áreas remotas, coordena cursos de APH, UTI móvel e sobrevivência na selva. Destaca-se no transporte de pacientes críticos e é instrutor credenciado em protocolos como BLS, ACLS e Stop the Bleed.',
  true
),
(
  '084a02b5-e0f0-40f6-ae65-5c6e0053b962',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Frank Duff Fonseca de Jesus',
  'frankduffdejesus@gmail.com',
  '(96) 98132-9002 / 99155-8553',
  'Eletrotécnico e Técnico em Mecânica Industrial',
  'Elétrica, Mecânica e Operação de Máquinas e Equipamentos',
  'Especialista em Sistemas Fotovoltaicos e possui formação técnica em Eletrotécnica e Mecânica. Com registro ativo no CREA-AP, atua como Encarregado de Manutenção na Fundação Bradesco e possui experiência como instrutor de elétrica no SENAI. Tem vivência em grandes empresas como a VALE e domínio das NRs 10 e 35. Sua versatilidade inclui graduação em Teatro e conhecimentos em Libras.',
  true
),
(
  'abdeac72-7a37-4b9f-8b8b-9ee24885bbe4',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Marcos Ferreira da Silva',
  'marcosengsst@uol.com.br',
  '(96) 98140-7431',
  'Engenheiro de Segurança do Trabalho e/ou Meio Ambiente',
  'Segurança do Trabalho e Meio Ambiente',
  'Engenheiro de Segurança do Trabalho e Florestal com mais de 7 anos de experiência em SMS. Especialista em gestão de equipes e NRs, possui sólida atuação em licenciamento ambiental, e-Social e elaboração de documentos como PGR e LTCAT. Com experiência em grandes empresas como a Petrobras, detém certificações ISO 9001/19011/45001 e pós-graduação em Higiene Ocupacional.',
  true
),
(
  'e9ae139c-a903-4714-8833-42bef56f1ebb',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Divaldo dos Santos Souza',
  'divaldodss@gmail.com',
  '(96) 98416-764 / 99139-2673',
  'Engenheiro Eletricista',
  'Elétrica',
  'Engenheiro Eletricista e Matemático com uma sólida trajetória nas áreas de elétrica e educação profissional. Atuou como instrutor e coordenador de cursos no SENAI-AP e ITC acumulando vasta experiência em manutenção e automação industrial. Especialista em sistemas como CLP, inversores de frequência e eletropneumática, Divaldo combina competência técnica e didática, possuindo registo ativo no CREA-AP.',
  true
),
(
  '263e3c90-9356-4ffd-a074-9563c91cec84',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Fábia Santos de Sena',
  'senafabia64@gmail.com',
  '(96) 98402-6117',
  'Técnica em Segurança do Trabalho e Eletromecânica',
  'Eletromecânica e Segurança do Trabalho',
  'Pedagoga e Técnica em Segurança do Trabalho e Eletromecânica. Atuou como instrutora no SEST SENAT, coordenando formações do CONTRAN e NRs para máquinas e equipamentos. Com experiência como diretora e pregoeira na STTRANS, destaca-se na gestão de trânsito, palestras de DDS e liderança de equipas. Atualmente frequenta a licenciatura em Engenharia Civil.',
  true
),
(
  'bd29bd9e-add0-47fb-9550-feeb89da357b',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Ivan Pereira de Sousa',
  'ivan.proativa@gmail.com',
  '(96) 99933-9935',
  'Engenheiro Mecânico e de Segurança do Trabalho',
  'Mecânica e Segurança do Trabalho',
  'Engenheiro Mecânico com pós-graduação em Engenharia de Segurança do Trabalho e vasta experiência em ensino profissionalizante. Atuou como instrutor e supervisor no sistema SESI/SENAI e exerceu a função de Engenheiro de Segurança em grandes empresas como a Ferreira Gomes Energia e Direcional Engenharia. Especialista em análise de riscos ocupacionais, gestão de SST e elaboração de laudos técnicos.',
  true
),
(
  '3053c7c6-4c19-4c62-9750-ac4d33cd9289',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Eder Barbosa da Costa',
  'edercosta1391@gmail.com',
  '(96) 98113-1385',
  'Técnico em Mecânica Industrial',
  'Mecânica Industrial e Automotiva',
  'Especialista em mecânica industrial e automotiva, com sólida trajetória como instrutor no SENAI-AP e na Capitania dos Portos. Técnico em Mecânica Industrial e graduando em Engenharia Mecânica, possui expertise em motores diesel, injeção eletrónica e tornearia. É proprietário da ENGTEC1 Industrial, aliando vasta experiência técnica em manutenção de máquinas a uma forte atuação no ensino profissionalizante.',
  true
),
(
  'cedd6788-ff9b-40bf-80f1-4bd1e0151c96',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Carlos Miguel Barbosa Farias',
  'carlosmiguelr666777@gmail.com',
  '(96) 98144-9015',
  'Técnico em Enfermagem e Bombeiro Civil Resgatista',
  'Saúde e Resgate',
  'Técnico em Enfermagem com especialização em Atendimento Pré-Hospitalar (APH) e resgate em áreas remotas. Possui sólida formação em socorrismo de UTI móvel, farmacologia aplicada e atendimento humanizado pelo SENAC-AP. É instrutor do Curso de Bombeiro Civil Resgatista no ITC.',
  true
),
(
  'bfc9b16b-5ac1-4737-bc94-ebdcdbb90e0c',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Ketlyn Monteiro Cavalcante',
  'itcformacaoprofissional@gmail.com',
  '(96) 98112-7859 / 98129-2562',
  'Técnica em Segurança do Trabalho e Bombeiro Civil Resgatista',
  'Segurança do Trabalho e Resgate',
  'Técnica em Segurança do Trabalho e Bombeira Civil, com especialização em auditoria de sistemas de gestão (ISO 45001 e 19011). Possui sólida formação pelo SENAI-AP e ITC Treinamentos, com expertise em NRs 10, 20 e 35, incluindo a supervisão de trabalho em altura. Com experiência em acompanhamento de frentes de serviço e integração de segurança na construção civil.',
  true
),
(
  '9bd0470b-60bc-481f-8904-a76c00d541c3',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Erick Cristiano Silva da Silva',
  'itcformacaoprofissional@gmail.com',
  '(96) 98141-8332 / 99134-8948',
  'Técnico em Enfermagem e Bombeiro Civil Resgatista',
  'Segurança do Trabalho e Resgate',
  'Técnico em Enfermagem e Acadêmico de Enfermagem com vasta experiência em urgência e emergência. Atua no SAMU UTI Móvel e possui expertise em transporte aéreo humanitário de pacientes em áreas de difícil acesso. Com sólida formação em APH, suporte avançado em UTI móvel, farmacologia aplicada e protocolos como Stop the Bleed. É instrutor do Curso de Bombeiro Civil Resgatista no ITC.',
  true
),
(
  '524c9215-f81e-4093-b7f4-9ef68434a7f2',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Fábio Soares Mont'' Alverne',
  'itcformacaoprofissional@gmail.com',
  '(96) 99108-1097',
  'Bombeiro Civil Resgatista',
  'Resgate',
  'Bombeiro Civil, Resgatista e Socorrista com ampla especialização em operações de emergência. Possui expertise em resgate em áreas remotas, suporte básico de vida (BLS), atendimento pré-hospitalar (APH) e capacitação em UTI móvel. Certificado como supervisor de trabalho em altura (NR 35) e operador de suporte médico aeromédico.',
  true
),
(
  '6a249a04-27ff-4817-b029-cae7a4d40f36',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Weyder Monteiro Cavalcante',
  'itcformacaoprofissional@gmail.com',
  '(96) 99193-5575',
  'Bombeiro Civil Resgatista e Instrutor Técnico de Trânsito',
  'Resgate e Direção Defensiva',
  'Bombeiro Civil Resgatista e Instrutor Técnico de Trânsito credenciado pelo DETRAN-AP. Com formação em Edificações pelo SENAI e cursando Educação Física, possui especializações em primeiros socorros, biomecânica e avaliação postural. Combina competências técnicas em salvamento com experiência em atendimento ao cliente e instrução teórica e prática.',
  true
),
(
  '5dbd29a1-ddf0-4585-8c94-b33e2e501aa9',
  'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
  'Tárcio Oeiras Guedes',
  'tarcio_guedes@yahoo.com.br',
  '(96) 98127-9790',
  'Engenheiro Eletricista',
  'Elétrica',
  'Engenheiro Eletricista e Licenciado em Física, com mais de 20 anos de experiência em instalações elétricas, manutenção e operação de equipamentos eletroeletrónicos. Com sólida carreira na docência e na gestão administrativa operacional, possui especializações em Engenharia de Manutenção e Sistemas Fotovoltaicos. É especialista em planeamento de manutenção industrial e hospitalar.',
  true
)
ON CONFLICT (id) DO NOTHING;
