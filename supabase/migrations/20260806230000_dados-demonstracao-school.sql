-- =============================================================================
-- DADOS DE DEMONSTRACAO — Clariza School / ITC
--
-- Para o sistema poder ser mostrado a funcionar antes de haver dados reais.
-- Tudo aqui e ficticio e deve ser apagado quando o ITC comecar a usar:
--   · emails terminados em @demo.itctreinamentos.com
--   · materiais, presencas e avaliacoes das turmas de 2026
--   · o Assistente Adm-Pedagogico de demonstracao
--
-- NAO toca em nada que ja esteja preenchido: os emails reais dos instrutores,
-- os nomes dos alunos e os certificados ficam como estao. So enche vazios.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Emails dos alunos — 1 em 8 tinha, e sem email nao ha portal
-- -----------------------------------------------------------------------------
update public.school_alunos a
set email = lower(
      regexp_replace(
        translate(split_part(a.nome, ' ', 1) || '.' || split_part(a.nome, ' ', array_length(string_to_array(a.nome, ' '), 1)),
                  'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                  'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
        '[^a-zA-Z.]', '', 'g')
    ) || '@demo.itctreinamentos.com'
where a.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and (a.email is null or trim(a.email) = '');

-- Os dois instrutores criados sem contacto
update public.school_docentes set
  email = case when nome like 'Eber%' then 'eber.rocha@demo.itctreinamentos.com'
                                      else 'fabio.costa@demo.itctreinamentos.com' end,
  formacao = coalesce(formacao, 'Técnico em Segurança do Trabalho'),
  area_especializacao = coalesce(area_especializacao, 'Trabalho em Altura'),
  tempo_experiencia = coalesce(tempo_experiencia, '8 anos')
where empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and (email is null or trim(email) = '')
  and (nome like 'Eber%' or nome like 'F%bio Costa%');

-- -----------------------------------------------------------------------------
-- 2) Equipa da escola — falta o Assistente Adm-Pedagogico
-- -----------------------------------------------------------------------------
update public.school_equipa
set email = 'renevaldo.cavalcante@demo.itctreinamentos.com'
where papel = 'diretor_pedagogico' and email is null;

insert into public.school_equipa (empresa_id, nome, email, papel)
select 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b',
       'Ketlyn Monteiro Cavalcante', 'ketlyn.cavalcante@demo.itctreinamentos.com', 'assistente'
where not exists (
  select 1 from public.school_equipa
  where empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b' and papel = 'assistente'
);

-- -----------------------------------------------------------------------------
-- 3) Presencas da turma concluida
--
--    Cinco dias de aula. Um aluno falta a uma — sem nenhuma falta, a
--    assiduidade nao demonstra nada.
-- -----------------------------------------------------------------------------
with turma as (
  select id, empresa_id from public.school_turmas
  where empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b' and titulo like '%2026/05%' limit 1
),
mats as (
  select m.id, m.empresa_id, row_number() over (order by m.id) n
  from public.school_matriculas m, turma t where m.turma_id = t.id
),
aulas as (
  select unnest(array['2026-05-10','2026-05-12','2026-05-14','2026-05-16','2026-05-20']::date[]) dia,
         generate_series(1, 5) i
)
insert into public.school_frequencia (empresa_id, matricula_id, data_aula, presente, observacao)
select m.empresa_id, m.id, a.dia,
       -- o segundo aluno falta ao terceiro dia
       not (m.n = 2 and a.i = 3),
       case when m.n = 2 and a.i = 3 then 'Falta justificada — atestado médico' else null end
from mats m
cross join (select distinct dia, i from aulas) a
on conflict (matricula_id, data_aula) do nothing;

-- -----------------------------------------------------------------------------
-- 4) Avaliacoes — teorica e pratica, com notas que dao aprovacao
-- -----------------------------------------------------------------------------
with turma as (
  select id, empresa_id from public.school_turmas
  where empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b' and titulo like '%2026/05%' limit 1
),
mats as (
  select m.id, m.empresa_id, m.turma_id, row_number() over (order by m.id) n
  from public.school_matriculas m, turma t where m.turma_id = t.id
),
provas as (
  select * from (values
    ('prova',   'Prova teórica — NR 35 e normas ABNT', '2026-05-16'::date, 20::numeric),
    ('pratica', 'Avaliação prática — resgate em altura', '2026-05-20'::date, 20::numeric)
  ) as p(tipo, descricao, data_avaliacao, nota_maxima)
)
insert into public.school_avaliacoes (empresa_id, turma_id, matricula_id, tipo, descricao, nota, nota_maxima, data_avaliacao)
select m.empresa_id, m.turma_id, m.id, p.tipo, p.descricao,
       -- Notas entre 15 e 19: aprovados, mas não todos iguais.
       15 + ((m.n * 3 + case when p.tipo = 'pratica' then 1 else 0 end) % 5),
       p.nota_maxima, p.data_avaliacao
from mats m cross join provas p
where not exists (
  select 1 from public.school_avaliacoes a
  where a.matricula_id = m.id and a.descricao = p.descricao
);

-- -----------------------------------------------------------------------------
-- 5) Materiais de apoio
-- -----------------------------------------------------------------------------
insert into public.school_materiais (empresa_id, turma_id, docente_id, titulo, descricao, url, tipo, visivel_aluno)
select t.empresa_id, t.id, t.docente_id, v.titulo, v.descricao, v.url, v.tipo, true
from public.school_turmas t
cross join (values
  ('Apostila NR 35 — Trabalho em Altura', 'Material de apoio completo do curso, com a norma comentada.',
   'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/norma-regulamentadora-no-35-trabalho-em-altura', 'documento'),
  ('Checklist de inspeção de EPI', 'Ficha de verificação a usar antes de cada operação.', null, 'documento'),
  ('Vídeo — técnicas de ancoragem', 'Demonstração prática dos pontos de fixação.', null, 'video')
) as v(titulo, descricao, url, tipo)
where t.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and not exists (
    select 1 from public.school_materiais mm where mm.turma_id = t.id and mm.titulo = v.titulo
  );

-- -----------------------------------------------------------------------------
-- 6) Um pedido de inscricao a espera de resposta
-- -----------------------------------------------------------------------------
insert into public.school_inscricoes (empresa_id, aluno_id, turma_id, mensagem)
select a.empresa_id, a.id, t.id,
       'Tenho disponibilidade no período da manhã. Preciso da reciclagem antes de setembro.'
from public.school_alunos a
cross join lateral (
  select id from public.school_turmas
  where empresa_id = a.empresa_id and status = 'aberta' limit 1
) t
where a.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and not exists (select 1 from public.school_inscricoes i where i.aluno_id = a.id and i.turma_id = t.id)
  and not exists (select 1 from public.school_matriculas m where m.aluno_id = a.id and m.turma_id = t.id)
limit 2;

-- -----------------------------------------------------------------------------
-- 7) Empresas clientes — contactos e formandos associados
-- -----------------------------------------------------------------------------
insert into public.school_corp_contactos (empresa_id, cliente_id, nome, email, cargo)
select c.empresa_id, c.id, v.nome, v.email, v.cargo
from public.school_clientes_corp c
cross join lateral (values
  ('Segurança do Trabalho', 'sesmt.' || left(regexp_replace(lower(c.nome), '[^a-z]', '', 'g'), 10) || '@demo.itctreinamentos.com', 'Técnico de Segurança')
) as v(nome, email, cargo)
where c.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and c.nome in ('Voltalia Servicos do Brasil Ltda', 'Etecon Ltda')
  and not exists (
    select 1 from public.school_corp_contactos cc where cc.cliente_id = c.id and cc.cargo = 'Técnico de Segurança'
  );

-- Formandos ainda sem empresa ficam distribuidos pelos clientes, para o portal
-- corporativo ter conteudo em mais do que uma empresa.
with clientes as (
  select id, row_number() over (order by nome) n from public.school_clientes_corp
  where empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
    and nome in ('Ipiranga Produtos de Petroleo S.A.', 'Voltalia Servicos do Brasil Ltda', 'Etecon Ltda')
),
sem_empresa as (
  select id, row_number() over (order by nome) n from public.school_alunos
  where empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b' and cliente_corp_id is null
)
update public.school_alunos a
set cliente_corp_id = (select c.id from clientes c where c.n = ((s.n - 1) % (select count(*) from clientes)) + 1)
from sem_empresa s where a.id = s.id;

-- -----------------------------------------------------------------------------
-- 8) Contratos com datas e valores plausiveis
-- -----------------------------------------------------------------------------
update public.school_contratos_corp
set observacao = coalesce(observacao,
  'Contrato anual de formação em NR 35 — inclui reciclagem bienal e emissão de certificados.')
where empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b';
