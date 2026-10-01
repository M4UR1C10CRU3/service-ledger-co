-- ITC · NR-01: completar a ficha (29/09/2026). Carregue em Run. Esperado no fim: incompletos 0 · inativos 0.
insert into backups.school_cursos_20260929
select * from public.school_cursos where id = 'e906e915-0722-4a9c-9c58-6831906ba423'
  and id not in (select id from backups.school_cursos_20260929);

update public.school_cursos set nome = 'NR-01 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais', updated_at = now(),
 descricao = 'Treinamento sobre as disposições gerais da NR-01 e o Gerenciamento de Riscos Ocupacionais (GRO), abordando os direitos e deveres de empregadores e trabalhadores, o Programa de Gerenciamento de Riscos (PGR), o inventário de riscos, o plano de ação e as regras de capacitação e treinamento previstas na norma.',
 objetivo = 'Capacitar o trabalhador a compreender as disposições gerais das Normas Regulamentadoras e o gerenciamento de riscos ocupacionais, identificando perigos, avaliando riscos e contribuindo para as medidas de prevenção previstas no PGR.',
 metodologia = 'Aulas teóricas com suporte audiovisual, simulações práticas em ambiente controlado, estudos de caso reais e avaliações teórico-práticas. O certificado é emitido somente após aprovação com nota mínima de 70%.',
 reconhecimento = 'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP) e alinhado às diretrizes da NR-01 (MTE/Brasil).'
where id = 'e906e915-0722-4a9c-9c58-6831906ba423' and descricao is null;

select (select count(*) from public.school_cursos where empresa_id = e.id and (descricao is null or objetivo is null or metodologia is null or reconhecimento is null)) as incompletos,
       (select count(*) from public.school_cursos where empresa_id = e.id and not ativo) as inativos
from (select id from public.empresas where nome ilike '%ITC%' limit 1) e;
