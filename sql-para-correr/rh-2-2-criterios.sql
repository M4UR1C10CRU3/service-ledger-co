-- RH (01/10/2026) — PASSO 2 de 3: biblioteca de critérios de avaliação do Grupo Obrajusta / Tudo Casa.
-- Cada critério diz o que vale uma nota 1, 3 e 5, para que dois avaliadores pontuem da mesma forma.
-- Só insere; se o critério já existir (mesmo código), não mexe.
INSERT INTO public.rh_criterios (grupo_id, codigo, nome, categoria, descricao, ancora_1, ancora_3, ancora_5, ordem)
SELECT g.id, c.codigo, c.nome, c.categoria, c.descricao, c.a1, c.a3, c.a5, c.ordem
FROM public.empresa_grupos g
CROSS JOIN (VALUES
 ('proatividade', 'Proatividade e iniciativa', 'comportamental', 'Antecipa problemas e age sem esperar ordens.',
  'Só faz o que lhe mandam; espera que alguém repare nos problemas.', 'Toma iniciativa nas situações habituais.', 'Antecipa problemas, propõe soluções e avança sem ser preciso pedir.', 1),
 ('atencao_cuidado', 'Atenção e cuidado', 'qualidade', 'Atenção ao pormenor e cuidado com o trabalho e com o cliente.',
  'Distrações frequentes; deixa falhas visíveis.', 'Cuidadoso no essencial, com falhas pontuais.', 'Rigoroso no pormenor; raramente lhe escapa alguma coisa.', 2),
 ('coordenacao_motora', 'Coordenação motora fina', 'tecnica', 'Destreza manual e precisão em trabalhos finos (acabamentos, ligações, montagens).',
  'Acabamentos irregulares; precisa de quem corrija.', 'Precisão adequada na maior parte dos trabalhos.', 'Acabamentos exemplares, mesmo em trabalhos delicados.', 3),
 ('comunicacao', 'Comunicação', 'comportamental', 'Clareza com colegas, chefias e clientes; informa o que é preciso, a tempo.',
  'Não informa ou informa mal; geram-se mal-entendidos.', 'Comunica bem no dia a dia.', 'Claro, objetivo e oportuno; evita problemas por informar antes.', 4),
 ('prestabilidade', 'Prestabilidade e espírito de equipa', 'comportamental', 'Disponibilidade para ajudar colegas e clientes.',
  'Recusa ou dificulta ajudar fora da sua tarefa.', 'Ajuda quando lhe pedem.', 'Oferece-se para ajudar e facilita o trabalho da equipa.', 5),
 ('atendimento', 'Qualidade no atendimento ao cliente', 'qualidade', 'Simpatia, paciência, rapidez e postura perante o cliente.',
  'Atendimento descuidado; há queixas de clientes.', 'Atendimento correto e cordial.', 'Clientes elogiam; resolve e fideliza.', 6),
 ('informacao_cliente', 'Qualidade da informação prestada', 'qualidade', 'Exatidão da informação que dá a clientes e colegas (preços, prazos, produtos).',
  'Dá informação errada com frequência.', 'Informação correta, com dúvidas pontuais.', 'Informação sempre exata; confirma antes de responder.', 7),
 ('retrabalho', 'Índice de retrabalho e refação', 'qualidade', 'Quantas vezes é preciso refazer ou corrigir o que fez.',
  'Retrabalho frequente; erros repetidos.', 'Retrabalho ocasional, aprende com o erro.', 'Quase nunca é preciso refazer; faz bem à primeira.', 8),
 ('pontualidade', 'Pontualidade e assiduidade', 'comportamental', 'Cumpre horários e falta só com justificação.',
  'Atrasos ou faltas frequentes.', 'Atrasos raros e justificados.', 'Sempre pontual e assíduo.', 9),
 ('seguranca', 'Cumprimento das regras de segurança', 'seguranca', 'Uso de EPI e cumprimento das regras de segurança e higiene.',
  'Ignora regras ou EPI; põe-se ou põe outros em risco.', 'Cumpre as regras quando lembrado.', 'Cumpre sempre e chama a atenção dos colegas.', 10),
 ('cuidado_equipamentos', 'Cuidado com ferramentas, equipamentos e viatura', 'seguranca', 'Conservação, arrumação e devolução do material da empresa.',
  'Estraga ou perde material com frequência.', 'Conserva o material de forma aceitável.', 'Material sempre limpo, arrumado e em bom estado.', 11),
 ('conhecimento_tecnico', 'Conhecimento técnico da função', 'tecnica', 'Domínio das técnicas, normas e materiais da sua função.',
  'Precisa de supervisão constante.', 'Domina o trabalho habitual.', 'Referência técnica; resolve casos difíceis e ensina outros.', 12),
 ('produtividade', 'Produtividade e cumprimento de prazos', 'qualidade', 'Volume de trabalho feito e prazos cumpridos.',
  'Prazos falhados com frequência.', 'Cumpre a maior parte dos prazos.', 'Cumpre sempre e muitas vezes antecipa.', 13),
 ('organizacao', 'Organização e método', 'comportamental', 'Planeia o trabalho, arquiva e segue os procedimentos.',
  'Desorganizado; perde documentos ou passos.', 'Organizado no essencial.', 'Método exemplar; qualquer pessoa encontra o que fez.', 14),
 ('autonomia', 'Autonomia e resolução de problemas', 'comportamental', 'Resolve imprevistos sem depender da chefia.',
  'Para perante qualquer imprevisto.', 'Resolve os problemas habituais.', 'Resolve problemas novos e só escala o que deve.', 15),
 ('aprendizagem', 'Capacidade de aprendizagem e adaptação', 'comportamental', 'Aprende novas tarefas, ferramentas e mudanças.',
  'Resiste à mudança; repete erros.', 'Aprende ao ritmo esperado.', 'Aprende depressa e adapta-se bem a mudanças.', 16),
 ('lideranca', 'Liderança e coordenação de equipa', 'gestao', 'Distribui trabalho, acompanha e desenvolve a equipa.',
  'A equipa não sabe o que fazer; conflitos sem resolução.', 'Coordena a equipa no dia a dia.', 'Equipa organizada, motivada e a crescer.', 17),
 ('limpeza_local', 'Limpeza e arrumação do local de trabalho', 'seguranca', 'Deixa a obra, loja ou posto de trabalho limpo e arrumado.',
  'Deixa sujidade e material espalhado.', 'Limpa e arruma no fim do trabalho.', 'Local sempre impecável, também durante o trabalho.', 18),
 ('registo_sistema', 'Registo no sistema a tempo e correto', 'qualidade', 'Lança no Clariza o que faz (cartões, documentos, ponto), sem erros.',
  'Não regista ou regista com erros.', 'Regista, por vezes com atraso.', 'Registos completos e no próprio dia.', 19)
) AS c(codigo, nome, categoria, descricao, a1, a3, a5, ordem)
WHERE g.nome = 'Grupo Obrajusta / Tudo Casa'
ON CONFLICT (grupo_id, codigo) DO NOTHING;

SELECT count(*) AS criterios FROM public.rh_criterios;
