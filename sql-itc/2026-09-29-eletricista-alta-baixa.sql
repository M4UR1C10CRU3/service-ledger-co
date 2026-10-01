-- ITC · Eletricista de Linhas Elétricas de Alta e Baixa Tensão (29/09/2026)
-- Adequado ao certificado de referência (Alan Robson, 240 h, 12 tópicos) e à legislação vigente.
-- Validade 24 meses: NR-10 (reciclagem bienal) e NR-35 (treinamento periódico bienal) — 36 meses não é permitido.
-- O nome mantém «NR-10 SEP» para o certificado continuar a invocar o TRT (cobertura NR-10 SEP).

insert into backups.school_cursos_20260929
select * from public.school_cursos where id = 'eda28dc1-407b-4619-bc7a-2a1fc6160534'
  and id not in (select id from backups.school_cursos_20260929);

update public.school_cursos set
 nome = 'Eletricista de Linhas Elétricas de Alta e Baixa Tensão (NR-10, NR-10 SEP e NR-35)',
 categoria = 'NR-10',
 carga_horaria = 240,
 validade_meses = 24, validade_anos = 2,
 descricao = 'Curso de qualificação profissional de Eletricista de Linhas Elétricas de Alta e Baixa Tensão, com 240 horas, que integra as capacitações obrigatórias da NR-10 Básico (40 h) e da NR-10 SEP (40 h), conforme o Anexo II da NR-10, e da NR-35 (16 h). Abrange fundamentos de eletricidade, redes de distribuição, montagem, operação e manutenção, serviços técnicos comerciais e iluminação pública. As capacitações da NR-10 e da NR-35 exigem reciclagem a cada dois anos, e a participação exige ASO com aptidão para trabalho com eletricidade e em altura.',
 objetivo = 'Qualificar o profissional para executar a montagem, a operação e a manutenção de redes de distribuição de energia elétrica em alta e baixa tensão e de iluminação pública, com a capacitação em segurança exigida pela NR-10 (Básico e SEP) e pela NR-35, incluindo técnicas de resgate e primeiros socorros.',
 metodologia = 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 reconhecimento = 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP), em conformidade com a Lei nº 9.394/96 (Diretrizes e Bases da Educação Nacional), alinhado às diretrizes da NR-10 (Portaria MTE nº 598/2004) e da NR-35 (MTE/Brasil) e à Diretriz de Treinamento e Homologação de Instituição de Ensino e Instrutores do Grupo Equatorial (Versão 2 — abril/2023).',
 conteudo_programatico = '[
  {"horas": 40, "modulo": "NR-10 Básico — Segurança em Instalações e Serviços em Eletricidade (Anexo II, item 1)"},
  {"horas": 40, "modulo": "NR-10 SEP — Segurança no Sistema Elétrico de Potência e em suas proximidades (Anexo II, item 2)"},
  {"horas": 16, "modulo": "NR-35 — Trabalho em Altura (capacitação inicial)"},
  {"horas": 16, "modulo": "Fundamentos de Eletricidade"},
  {"horas": 12, "modulo": "Sistemas de Medida e Representação Gráfica"},
  {"horas": 8, "modulo": "Qualidade, Saúde, Meio Ambiente e Segurança nos Serviços em Eletricidade"},
  {"horas": 16, "modulo": "Fundamentos de Redes de Distribuição"},
  {"horas": 16, "modulo": "Operação de Equipamentos e Dispositivos de Redes de Distribuição"},
  {"horas": 20, "modulo": "Manutenção de Redes de Distribuição de Energia Elétrica"},
  {"horas": 12, "modulo": "Execução de Serviços Técnicos Comerciais"},
  {"horas": 16, "modulo": "Técnicas de Montagem de Redes de Distribuição"},
  {"horas": 12, "modulo": "Retirada e Manutenção de Iluminação Pública"},
  {"horas": 8, "modulo": "Técnicas de remoção, atendimento e transporte de acidentados"},
  {"horas": 4, "modulo": "Acidentes típicos: análise, discussão e medidas de proteção"},
  {"horas": 4, "modulo": "Responsabilidades"}
 ]'::jsonb,
 updated_at = now()
where id = 'eda28dc1-407b-4619-bc7a-2a1fc6160534';

-- Verificação: esperado 240 · 240 · 24 · 15
select c.carga_horaria,
       (select sum((m->>'horas')::int) from jsonb_array_elements(c.conteudo_programatico) m) as soma_modulos,
       c.validade_meses,
       jsonb_array_length(c.conteudo_programatico) as modulos
from public.school_cursos c where c.id = 'eda28dc1-407b-4619-bc7a-2a1fc6160534';
