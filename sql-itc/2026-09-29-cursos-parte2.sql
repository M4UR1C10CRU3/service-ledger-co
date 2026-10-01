-- ITC · Cursos, parte 2 (29/09/2026): NR-22, as duas NR-12, «controlo»→«controle» e português do Brasil nos textos gravados hoje.
-- Os 13 primeiros cursos já foram ativados. Cópia de segurança em backups.school_cursos_20260929.

-- 1. Cópia das duas NR-12 antes de mexer
insert into backups.school_cursos_20260929
select * from public.school_cursos
where id in ('c36d7adc-f426-479b-928a-fdd2057c628f','cbeb743f-5c9a-4a17-89bc-19c82f3d8890')
  and id not in (select id from backups.school_cursos_20260929);

-- 2. NR-22: completar e ativar
update public.school_cursos set ativo = true, validade_meses = 12, validade_anos = 1, updated_at = now(),
 descricao = 'Treinamento introdutório de segurança e saúde na mineração conforme a NR-22, para trabalhadores admitidos em atividades de mineração, abordando os riscos da atividade mineira, as normas internas, os equipamentos de proteção e os procedimentos de emergência e salvamento.',
 objetivo = 'Capacitar o trabalhador recém-admitido a executar atividades de mineração com segurança, reconhecendo os riscos do ambiente mineiro e as medidas de prevenção e de resposta a emergências.',
 metodologia = 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 reconhecimento = 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-22 (MTE/Brasil).'
where id = 'dd4d81db-ae4e-41c7-abe2-5f7d2ec971ec' and not ativo;

-- 3. NR-12: nome alinhado com os outros cursos + textos
update public.school_cursos set nome = 'NR-12 — Segurança em Máquinas e Equipamentos', updated_at = now(),
 descricao = 'Capacitação para operadores de máquinas e equipamentos conforme a NR-12, que exige treinamento compatível com as funções do trabalhador, com conteúdo teórico e prático sobre os riscos da máquina, os dispositivos de segurança, os procedimentos de trabalho seguro e as situações de emergência. A capacitação deve ser específica para a máquina operada.',
 objetivo = 'Capacitar o trabalhador a operar máquinas e equipamentos com segurança, reconhecendo seus riscos e as proteções existentes, e aplicando os procedimentos de trabalho, de bloqueio de energias e de emergência.',
 metodologia = 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 reconhecimento = 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-12 (MTE/Brasil).'
where id = 'cbeb743f-5c9a-4a17-89bc-19c82f3d8890' and descricao is null;

update public.school_cursos set nome = 'NR-12 — Segurança em Máquinas e Equipamentos (Retroescavadeira)', updated_at = now(),
 descricao = 'Capacitação para operadores de retroescavadeira conforme a NR-12, com conteúdo teórico e prático sobre o funcionamento da máquina, a inspeção diária, os dispositivos de segurança, as operações de escavação e carregamento, o deslocamento seguro e os procedimentos de emergência.',
 objetivo = 'Capacitar o trabalhador a operar retroescavadeiras com segurança, realizando a inspeção pré-operacional, respeitando os limites de estabilidade e prevenindo tombamentos, atropelamentos e o contato com redes enterradas ou aéreas.',
 metodologia = 'Aulas teóricas com suporte audiovisual seguidas de atividades práticas em ambiente controlado, precedidas de Análise Preliminar de Risco, com estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 reconhecimento = 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-12 (MTE/Brasil).'
where id = 'c36d7adc-f426-479b-928a-fdd2057c628f' and descricao is null;

-- 4. «controlo» (Portugal) → «controle» (Brasil) no conteúdo programático
update public.school_cursos
set conteudo_programatico = replace(replace(conteudo_programatico::text, 'controlo', 'controle'), 'Controlo', 'Controle')::jsonb, updated_at = now()
where empresa_id = (select id from public.empresas where nome ilike '%ITC%' limit 1)
  and conteudo_programatico::text ~* 'controlo';

-- 5. Português do Brasil nos textos gravados hoje (só nos cursos da cópia de segurança)
update public.school_cursos c set
 descricao = regexp_replace(regexp_replace(replace(replace(c.descricao, 'n.º', 'nº'), 'a realizar no próprio estabelecimento', 'a ser realizado no próprio estabelecimento'),
   '\m(a|as|o|os) (sua|suas|seu|seus)\M', '\2', 'g'), '  +', ' ', 'g'),
 objetivo = regexp_replace(regexp_replace(c.objetivo, '\m(a|as|o|os) (sua|suas|seu|seus)\M', '\2', 'g'), '  +', ' ', 'g'),
 reconhecimento = replace(c.reconhecimento, 'n.º', 'nº'),
 updated_at = now()
where c.id in (select id from backups.school_cursos_20260929);

-- 6. Verificação: esperado inativos 0, incompletos 0, controlo 0, termos_pt 0
select
 (select count(*) from public.school_cursos where empresa_id = e.id and not ativo) as inativos,
 (select count(*) from public.school_cursos where empresa_id = e.id and (descricao is null or objetivo is null or metodologia is null or reconhecimento is null)) as incompletos,
 (select count(*) from public.school_cursos where empresa_id = e.id and conteudo_programatico::text ~* 'controlo') as controlo,
 (select count(*) from public.school_cursos where id in (select id from backups.school_cursos_20260929) and concat_ws(' ', descricao, objetivo, reconhecimento) ~ '\m(a|as|o|os) (sua|suas|seu|seus)\M|n\.º') as termos_pt
from (select id from public.empresas where nome ilike '%ITC%' limit 1) e;
