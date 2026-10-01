-- RH (01/10/2026) — Funções operacionais de obra, bloco 3 de 3: Ladrilhador, Serralheiro, Engenheiro Civil / Diretor de Obra, Arquiteto, Técnico de Higiene e Segurança no Trabalho.
-- Para o Grupo Obrajusta / Tudo Casa (as funções são do grupo; o local de trabalho indica a Obrajusta II).
-- Correr DEPOIS de rh-2-3-perfis.sql (liga cada função ao seu perfil de avaliação). Só insere; se já existir, não mexe.
INSERT INTO public.rh_funcoes (grupo_id, codigo, nome, departamento, nivel, cor, missao, reporta_a, local_trabalho, horario,
  ferramentas, ordem, requisitos, responsabilidades, nao_e_do_cargo, competencias, indicadores, perfil_avaliacao_id)
SELECT g.id, v.codigo, v.nome, 'Obra', v.nivel, v.cor, v.missao, v.reporta, 'Obras da Obrajusta II (Mirandela e região) e estaleiro', 'Conforme horário da obra',
  v.ferramentas, v.ordem, v.requisitos, v.responsabilidades, v.nao, v.competencias, v.indicadores,
  (SELECT p.id FROM public.rh_aval_perfis p WHERE p.grupo_id = g.id AND p.codigo = v.perfil)
FROM public.empresa_grupos g
CROSS JOIN (VALUES
('ladrilhador', 'Ladrilhador', 'operacional', '#0e7490', 'operacional', 'Assentar pavimentos e revestimentos cerâmicos e de pedra com alinhamento, nível e juntas perfeitos.', 'Chefe de Equipa', 'Máquina de corte, rebarbadora, nível laser, talochas, espaçadores, sistema de nivelamento', 60,
 '{"obrigatorios":["Experiência em assentamento de cerâmicos de grande formato","Impermeabilização de zonas húmidas"],"valorizados":["Experiência em pedra natural e mosaico","Execução de bases de duche em obra"]}'::jsonb,
 '[{"area":"Assentamento","itens":["Preparar e regularizar o suporte","Impermeabilizar casas de banho e varandas","Assentar, cortar e betumar com alinhamento e nível"]}]'::jsonb,
 '["Assentar sobre suporte húmido ou sem regularização"]'::jsonb, '{"profissionais":["Coordenação motora fina","Leitura da estereotomia (distribuição das peças)"],"comportamentais":["Brio","Paciência e método"]}'::jsonb, '["Peças ocas ou partidas após entrega","Infiltrações em zonas húmidas","Desperdício de material"]'::jsonb),
('serralheiro', 'Serralheiro', 'operacional', '#475569', 'operacional', 'Fabricar e montar serralharias (guardas, portões, estruturas metálicas, caixilharias) com acabamento e soldadura de qualidade.', 'Chefe de Equipa', 'Máquina de soldar (elétrodo, MIG/MAG), rebarbadora, serrote de fita, berbequim de coluna', 61,
 '{"obrigatorios":["Experiência em soldadura e corte de perfis metálicos","Leitura de desenhos de serralharia"],"valorizados":["Experiência em alumínio e PVC","Certificação de soldador"]}'::jsonb,
 '[{"area":"Oficina e obra","itens":["Medir em obra, fabricar e montar","Soldar, esmerilar e preparar para pintura ou galvanização","Fixar com a resistência e o prumo exigidos"]}]'::jsonb,
 '["Montar guardas sem confirmar fixação adequada ao suporte"]'::jsonb, '{"profissionais":["Soldadura","Rigor de medição"],"comportamentais":["Cuidado com a segurança (fagulhas, cortes)","Organização da oficina"]}'::jsonb, '["Peças refeitas por erro de medida","Reclamações de acabamento","Ocorrências de segurança"]'::jsonb),
('engenheiro_civil', 'Engenheiro Civil / Diretor de Obra', 'tecnico', '#1e3a8a', 'chefia', 'Garantir que cada obra é executada conforme projeto, com qualidade, no prazo, no custo e em segurança.', 'Gerência', 'AutoCAD, MS Project ou equivalente, Excel, Clariza (quadros de produção e concursos)', 62,
 '{"obrigatorios":["Licenciatura ou mestrado em Engenharia Civil","Inscrição na Ordem dos Engenheiros (ou na Ordem dos Engenheiros Técnicos)","Habilitação para assumir a direção de obra"],"valorizados":["Experiência em obras públicas e concursos","Experiência em reabilitação de edifícios"]}'::jsonb,
 '[{"area":"Obra","itens":["Planear a obra e acompanhar prazos e custos","Validar métodos, materiais e medições","Assinar o livro de obra e acompanhar fiscalização e dono de obra"]},{"area":"Comercial e técnico","itens":["Apoiar orçamentos e mapas de quantidades","Preparar a parte técnica das propostas a concurso"]}]'::jsonb,
 '["Aprovar trabalhos a mais sem validação comercial do valor"]'::jsonb, '{"profissionais":["Gestão de obra (prazo, custo, qualidade)","Leitura e compatibilização de projetos"],"comportamentais":["Liderança","Negociação com dono de obra e fiscalização"]}'::jsonb, '["Desvio de prazo por obra","Desvio de custo por obra","Autos de medição faturados a tempo","Ocorrências de segurança"]'::jsonb),
('arquiteto', 'Arquiteto', 'tecnico', '#6d28d9', 'tecnico', 'Conceber e acompanhar projetos de arquitetura viáveis de executar e licenciar, ao serviço do cliente e da obra.', 'Gerência', 'AutoCAD, Revit ou ArchiCAD, ferramentas de visualização 3D', 63,
 '{"obrigatorios":["Mestrado integrado em Arquitetura","Inscrição na Ordem dos Arquitectos"],"valorizados":["Experiência em licenciamento municipal","Experiência em reabilitação e conforto térmico"]}'::jsonb,
 '[{"area":"Projeto","itens":["Fazer o levantamento e o estudo prévio com o cliente","Desenvolver projeto de licenciamento e de execução","Instruir os processos de licenciamento na câmara municipal"]},{"area":"Obra","itens":["Acompanhar a execução e esclarecer dúvidas de projeto","Validar alterações em obra"]}]'::jsonb,
 '["Assumir a direção técnica da obra"]'::jsonb, '{"profissionais":["Desenho e compatibilização de especialidades","Conhecimento do regime de licenciamento"],"comportamentais":["Comunicação com o cliente","Organização"]}'::jsonb, '["Prazos de entrega de projeto cumpridos","Pedidos de esclarecimento da câmara por projeto","Alterações em obra por erro de projeto"]'::jsonb),
('tecnico_hst', 'Técnico de Higiene e Segurança no Trabalho', 'tecnico', '#15803d', 'tecnico', 'Prevenir acidentes e garantir que as obras cumprem as regras de segurança e saúde no trabalho.', 'Gerência e Diretor de Obra', 'Plano de segurança e saúde, registos de inspeção, Clariza', 64,
 '{"obrigatorios":["Título profissional de Técnico ou Técnico Superior de Segurança no Trabalho","Conhecimento da legislação de segurança na construção"],"valorizados":["Experiência em obras de construção e reabilitação","Formação de formadores"]}'::jsonb,
 '[{"area":"Prevenção","itens":["Desenvolver o plano de segurança e saúde de cada obra","Inspecionar as obras e registar não conformidades","Dar formação e acolhimento de segurança a quem entra em obra"]},{"area":"Acompanhamento","itens":["Investigar acidentes e incidentes","Controlar EPI, verificações de equipamentos e documentação de subempreiteiros"]}]'::jsonb,
 '["Executar trabalhos de produção"]'::jsonb, '{"profissionais":["Avaliação de riscos","Legislação de segurança na construção"],"comportamentais":["Firmeza","Pedagogia"]}'::jsonb, '["Acidentes com baixa","Não conformidades resolvidas no prazo","Pessoas com formação de acolhimento em dia"]'::jsonb)
) AS v(codigo, nome, nivel, cor, perfil, missao, reporta, ferramentas, ordem, requisitos, responsabilidades, nao, competencias, indicadores)
WHERE g.nome = 'Grupo Obrajusta / Tudo Casa'
ON CONFLICT (grupo_id, codigo) DO NOTHING;

SELECT f.nome, f.nivel, p.nome AS perfil_de_avaliacao
FROM public.rh_funcoes f LEFT JOIN public.rh_aval_perfis p ON p.id = f.perfil_avaliacao_id
WHERE f.departamento = 'Obra' ORDER BY f.ordem;
