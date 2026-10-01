-- RH (01/10/2026) — Funções operacionais de obra, bloco 2 de 3: Manobrador de Máquinas, Carpinteiro de Cofragem, Carpinteiro de Limpos, Carpinteiro de Estruturas e Telhados, Aplicador de ETICS.
-- Para o Grupo Obrajusta / Tudo Casa (as funções são do grupo; o local de trabalho indica a Obrajusta II).
-- Correr DEPOIS de rh-2-3-perfis.sql (liga cada função ao seu perfil de avaliação). Só insere; se já existir, não mexe.
INSERT INTO public.rh_funcoes (grupo_id, codigo, nome, departamento, nivel, cor, missao, reporta_a, local_trabalho, horario,
  ferramentas, ordem, requisitos, responsabilidades, nao_e_do_cargo, competencias, indicadores, perfil_avaliacao_id)
SELECT g.id, v.codigo, v.nome, 'Obra', v.nivel, v.cor, v.missao, v.reporta, 'Obras da Obrajusta II (Mirandela e região) e estaleiro', 'Conforme horário da obra',
  v.ferramentas, v.ordem, v.requisitos, v.responsabilidades, v.nao, v.competencias, v.indicadores,
  (SELECT p.id FROM public.rh_aval_perfis p WHERE p.grupo_id = g.id AND p.codigo = v.perfil)
FROM public.empresa_grupos g
CROSS JOIN (VALUES
('manobrador_maquinas', 'Manobrador de Máquinas', 'operacional', '#c2410c', 'operacional', 'Operar as máquinas da obra com produtividade e em segurança, conservando o equipamento.', 'Chefe de Equipa', 'Escavadora, retroescavadora, mini-giratória, dumper, cilindro, empilhador ou plataforma elevatória', 55,
 '{"obrigatorios":["Formação certificada para as máquinas que opera","Carta de condução categoria B","Experiência em movimentação de terras"],"valorizados":["Carta de condução categoria C","Experiência com grua"]}'::jsonb,
 '[{"area":"Operação","itens":["Executar escavações, aterros, valas e movimentação de cargas","Respeitar as zonas de segurança e as redes enterradas sinalizadas"]},{"area":"Equipamento","itens":["Fazer a verificação diária da máquina e registar avarias","Manter a máquina limpa e abastecida"]}]'::jsonb,
 '["Operar máquina sem verificação diária feita","Escavar sem confirmar redes enterradas"]'::jsonb, '{"profissionais":["Domínio das máquinas","Leitura de cotas e marcações"],"comportamentais":["Atenção permanente","Responsabilidade"]}'::jsonb, '["Avarias por má utilização","Ocorrências de segurança","Horas produtivas face às horas de máquina"]'::jsonb),
('carpinteiro_cofragem', 'Carpinteiro de Cofragem', 'operacional', '#92400e', 'operacional', 'Montar e desmontar cofragens e escoramentos que garantam a forma, as cotas e a segurança dos elementos de betão.', 'Chefe de Equipa', 'Serrote, serra circular, martelo, nível, cofragem metálica e de madeira, escoras', 56,
 '{"obrigatorios":["Experiência em cofragem de fundações, pilares, vigas e lajes","Leitura de desenhos de estruturas"],"valorizados":["Experiência com sistemas de cofragem metálica","Trabalho em altura com formação"]}'::jsonb,
 '[{"area":"Cofragem","itens":["Montar cofragens a prumo, nível e cota","Escorar e verificar antes da betonagem","Descofrar nos prazos indicados e limpar o material"]}]'::jsonb,
 '["Retirar escoramento antes do prazo indicado"]'::jsonb, '{"profissionais":["Rigor dimensional","Conhecimento de escoramentos"],"comportamentais":["Atenção à segurança","Trabalho em equipa"]}'::jsonb, '["Correções de betão por defeito de cofragem","Perdas de material de cofragem","Ocorrências de segurança"]'::jsonb),
('carpinteiro_limpos', 'Carpinteiro de Limpos', 'operacional', '#854d0e', 'operacional', 'Executar e montar carpintarias de acabamento (portas, rodapés, roupeiros, soalhos, tetos) com acabamento perfeito.', 'Chefe de Equipa', 'Serra de esquadria, tupia, aparafusadora, nível laser, ferramentas de marcenaria', 57,
 '{"obrigatorios":["Experiência em montagem de portas, aros e rodapés","Rigor em acabamentos"],"valorizados":["Experiência em soalhos e tetos falsos de madeira","Leitura de desenhos de carpintaria"]}'::jsonb,
 '[{"area":"Montagem","itens":["Montar aros, portas, rodapés, roupeiros e cozinhas","Assentar soalhos e revestimentos de madeira","Afinar ferragens e corrigir folgas"]}]'::jsonb,
 '["Montar sobre paredes ou pavimentos fora de esquadria sem avisar o chefe de equipa"]'::jsonb, '{"profissionais":["Coordenação motora fina","Conhecimento de madeiras e ferragens"],"comportamentais":["Brio","Cuidado com a casa do cliente"]}'::jsonb, '["Reclamações de acabamento","Retrabalho","Material desperdiçado"]'::jsonb),
('carpinteiro_estruturas', 'Carpinteiro de Estruturas e Telhados', 'operacional', '#713f12', 'operacional', 'Executar e reabilitar estruturas de madeira e coberturas estanques e seguras.', 'Chefe de Equipa', 'Motosserra, serra circular, aparafusadora, linha de vida, andaime', 58,
 '{"obrigatorios":["Experiência em estruturas de madeira e coberturas","Trabalho em altura com formação e uso de linha de vida"],"valorizados":["Experiência em reabilitação de telhados antigos","Aplicação de painel sandwich e telha"]}'::jsonb,
 '[{"area":"Coberturas","itens":["Montar asnas, madres e varas","Aplicar subtelha, telha ou painel e remates","Executar e reparar algerozes e caleiras"]}]'::jsonb,
 '["Subir à cobertura sem proteção coletiva ou individual montada"]'::jsonb, '{"profissionais":["Conhecimento de estruturas de madeira","Estanquidade de coberturas"],"comportamentais":["Responsabilidade com a segurança","Autonomia"]}'::jsonb, '["Infiltrações após entrega","Ocorrências de segurança","Retrabalho"]'::jsonb),
('aplicador_etics', 'Aplicador de ETICS', 'operacional', '#0f766e', 'operacional', 'Aplicar sistemas de isolamento térmico pelo exterior (ETICS) conforme as indicações do fabricante, sem fissuras nem pontes térmicas.', 'Chefe de Equipa', 'Talochas, régua, misturador, andaime, ferramentas de corte de isolamento', 59,
 '{"obrigatorios":["Experiência em aplicação de ETICS (colagem, fixação, armadura, regularização e acabamento)","Trabalho em andaime"],"valorizados":["Formação dada por fabricante de sistemas ETICS","Experiência em reboco e pintura de fachadas"]}'::jsonb,
 '[{"area":"Aplicação","itens":["Preparar o suporte e aplicar o perfil de arranque","Colar e fixar as placas de isolamento sem juntas abertas","Aplicar a rede de armadura, reforços e o acabamento"]}]'::jsonb,
 '["Aplicar acabamento fora das condições de temperatura e humidade indicadas pelo fabricante"]'::jsonb, '{"profissionais":["Conhecimento do sistema ETICS","Rigor nos remates e pontos singulares"],"comportamentais":["Atenção ao pormenor","Trabalho em equipa"]}'::jsonb, '["Fissuras ou descolamentos após entrega","Metros aplicados face ao planeado","Retrabalho"]'::jsonb)
) AS v(codigo, nome, nivel, cor, perfil, missao, reporta, ferramentas, ordem, requisitos, responsabilidades, nao, competencias, indicadores)
WHERE g.nome = 'Grupo Obrajusta / Tudo Casa'
ON CONFLICT (grupo_id, codigo) DO NOTHING;

SELECT f.nome, f.nivel, p.nome AS perfil_de_avaliacao
FROM public.rh_funcoes f LEFT JOIN public.rh_aval_perfis p ON p.id = f.perfil_avaliacao_id
WHERE f.departamento = 'Obra' ORDER BY f.ordem;
