-- =============================================================================
-- CERTIFICADO DE NR — o que faltava para aguentar uma auditoria
--
-- Cinco lacunas, apuradas contra o que um SESMT de cliente confere quando
-- recebe o certificado de um colaborador:
--
--   1. tipo de treinamento (inicial / periodico / reciclagem)  — NAO existia
--   2. CNPJ e razao social da entidade formadora               — coluna vazia
--   3. qualificacao do instrutor                               — havia, nao saia
--   4. local de realizacao                                     — havia, nao saia
--   5. aproveitamento e frequencia do aluno                    — havia, nao saia
--
-- ATENCAO ao que se descobriu a fazer isto: `school_matriculas.nota_final`
-- existe no ficheiro de migracao do repositorio e NAO existe na base. O
-- ficheiro foi editado depois de aplicado. Por isso a nota do aluno vem de
-- `school_avaliacoes` e a frequencia de `school_frequencia`, que existem
-- mesmo — e ficam gravadas no certificado como fotografia.
--
-- Migracao ADITIVA: so acrescenta colunas e preenche vazios.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tipo de treinamento — na TURMA
--
--    E a turma que e inicial ou periodica, nao o curso: o mesmo conteudo pode
--    ser dado das duas maneiras. Mas o catalogo do ITC ja tem cursos separados
--    ("NR-35 Periodico / Resgate"), por isso o valor e sugerido a partir do
--    nome do curso e o instrutor corrige se for preciso.
-- -----------------------------------------------------------------------------
alter table public.school_turmas
  add column if not exists tipo_treinamento text;

comment on column public.school_turmas.tipo_treinamento is
  'inicial | periodico | reciclagem | eventual | complementar. E o primeiro item que um auditor procura: sem ele nao se sabe de quando conta o prazo da proxima.';

-- Semear pelo nome do curso da turma. So onde esta vazio.
update public.school_turmas t
   set tipo_treinamento = case
         when c.nome ilike '%recicla%'                          then 'reciclagem'
         when c.nome ilike '%peri_dico%' or c.nome ilike '%periodico%' then 'periodico'
         when c.nome ilike '%complementar%'                     then 'complementar'
         when c.nome ilike '%eventual%'                         then 'eventual'
         else 'inicial'
       end
  from public.school_cursos c
 where c.id = t.curso_id
   and t.tipo_treinamento is null;

-- -----------------------------------------------------------------------------
-- 2) Fotografias no certificado
--
--    O certificado ja guarda instantaneos (aluno_nome, curso_nome...) para nao
--    mudar quando as tabelas mudam. Estes campos seguem a mesma regra: uma nota
--    corrigida no ano seguinte nao pode reescrever um certificado ja emitido.
-- -----------------------------------------------------------------------------
alter table public.school_certificados
  add column if not exists tipo_treinamento       text,
  add column if not exists local_realizacao       text,
  add column if not exists nota_final             numeric(5,2),
  add column if not exists frequencia_percent     numeric(5,2),
  add column if not exists instrutor_qualificacao text,
  add column if not exists entidade_razao_social  text,
  add column if not exists entidade_documento     text;

comment on column public.school_certificados.frequencia_percent is
  'Percentagem de presencas, calculada de school_frequencia no momento da emissao.';
comment on column public.school_certificados.entidade_documento is
  'CNPJ ou NIF da entidade formadora, como estava a data da emissao.';

-- -----------------------------------------------------------------------------
-- 3) O CNPJ do ITC
--
--    A coluna foi criada esta manha e ficou vazia. O numero vem do proprio TRT:
--    Instituto Machado Cavalcante Ltda, CNPJ 53.827.322/0001-75.
-- -----------------------------------------------------------------------------
update public.empresas
   set identificador_fiscal = coalesce(identificador_fiscal, '53.827.322/0001-75'),
       nome_legal           = coalesce(nome_legal, 'Instituto Machado Cavalcante Ltda')
 where slug in ('itc', 'itc-educa-pro');

-- -----------------------------------------------------------------------------
-- 4) Formacoes dos instrutores — catalogo, nao texto livre
--
--    Um instrutor tem varias formacoes, e nem todas credenciam todos os cursos.
--    Um Bombeiro Civil a assinar um NR-10 nao acrescenta nada — e a mais, dilui
--    o que interessa. Por isso o certificado imprime a INTERSECCAO: das
--    formacoes que ele tem, so as que credenciam a norma daquele curso.
--
--    Catalogo e nao texto livre porque "Eng. Seg. Trabalho", "Engenheiro
--    Seguranca" e "Eng.o de Seg. do Trabalho" seriam tres coisas diferentes e
--    nada cruzaria.
-- -----------------------------------------------------------------------------
create table if not exists public.school_formacoes (
  id          uuid primary key default gen_random_uuid(),
  -- empresa_id NULL = catalogo da plataforma, partilhado. Preenchido = da casa.
  empresa_id  uuid references public.empresas(id) on delete cascade,
  codigo      text not null unique,
  nome        text not null,
  sigla       text,
  conselho    text,           -- CREA, CRT, CRM... quando ha registo profissional
  ordem       integer not null default 100,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.school_docente_formacoes (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  docente_id    uuid not null references public.school_docentes(id) on delete cascade,
  formacao_id   uuid not null references public.school_formacoes(id) on delete restrict,
  -- O registo e o que da peso: "Engenheiro de Seguranca do Trabalho — CREA-AP
  -- 12345" vale; a formacao sozinha vale menos.
  registo       text,
  observacoes   text,
  created_at    timestamptz not null default now(),
  unique (docente_id, formacao_id)
);

-- Que formacoes credenciam que norma. Pela NORMA e nao pelo curso: e a NR que
-- dita a qualificacao exigida, e assim o mapa serve tambem os cursos que ainda
-- nao existem. `norma` usa os mesmos codigos de codigoNormaDoCurso().
create table if not exists public.school_formacao_normas (
  id          uuid primary key default gen_random_uuid(),
  formacao_id uuid not null references public.school_formacoes(id) on delete cascade,
  norma       text not null,
  created_at  timestamptz not null default now(),
  unique (formacao_id, norma)
);

create index if not exists school_docente_formacoes_idx
  on public.school_docente_formacoes(docente_id);
create index if not exists school_formacao_normas_idx
  on public.school_formacao_normas(norma);

alter table public.school_formacoes         enable row level security;
alter table public.school_docente_formacoes enable row level security;
alter table public.school_formacao_normas   enable row level security;

-- Catalogo e mapa: leitura para autenticados; a ligacao docente-formacao isola
-- por empresa, com USING E WITH CHECK.
drop policy if exists school_formacoes_leitura on public.school_formacoes;
create policy school_formacoes_leitura on public.school_formacoes
  for select using (auth.uid() is not null);

drop policy if exists school_formacao_normas_leitura on public.school_formacao_normas;
create policy school_formacao_normas_leitura on public.school_formacao_normas
  for select using (auth.uid() is not null);

drop policy if exists school_docente_formacoes_empresa on public.school_docente_formacoes;
create policy school_docente_formacoes_empresa on public.school_docente_formacoes
  for all using (user_has_empresa_access(empresa_id))
  with check (user_has_empresa_access(empresa_id));

-- -----------------------------------------------------------------------------
-- 5) Catalogo de formacoes — ponto de partida, para o Renevaldo confirmar
-- -----------------------------------------------------------------------------
insert into public.school_formacoes (codigo, nome, sigla, conselho, ordem) values
  ('eng_seg_trabalho', 'Engenheiro de Segurança do Trabalho',        'Eng. Seg. Trab.', 'CREA',  10),
  ('tec_seg_trabalho', 'Técnico em Segurança do Trabalho',           'TST',             'MTE',   20),
  ('eng_eletricista',  'Engenheiro Eletricista',                     'Eng. Elet.',      'CREA',  30),
  ('tec_eletrotecnica','Técnico em Eletrotécnica',                   'Téc. Eletrot.',   'CRT',   40),
  ('eletrotecnico',    'Eletrotécnico',                              null,              'CRT',   50),
  ('eng_mecanico',     'Engenheiro Mecânico',                        'Eng. Mec.',       'CREA',  60),
  ('eng_civil',        'Engenheiro Civil',                           'Eng. Civil',      'CREA',  70),
  ('eng_quimico',      'Engenheiro Químico',                         'Eng. Quím.',      'CREA',  80),
  ('bombeiro_civil',   'Bombeiro Civil',                             null,              null,    90),
  ('sup_brigada',      'Supervisor de Brigada de Incêndio',          null,              null,   100),
  ('socorrista',       'Socorrista / Primeiros Socorros',            null,              null,   110),
  ('prof_saude',       'Profissional de Saúde',                      null,              'COREN/CRM', 120),
  ('instrutor_transito','Instrutor de Trânsito',                     null,              'DETRAN',130),
  ('tec_meio_ambiente','Técnico em Meio Ambiente',                   'Téc. Amb.',       'CRT',  140),
  ('tec_eletromecanica','Técnico em Eletromecânica',                 'Téc. Eletrom.',   'CRT',  150)
on conflict (codigo) do nothing;

-- -----------------------------------------------------------------------------
-- 6) Que formacao credencia que norma
--
--    PONTO DE PARTIDA, nao verdade fechada. Sai da pratica corrente e deve ser
--    confirmado pelo responsavel tecnico antes de valer para certificados
--    reais. Editavel no ecra de Formacoes.
-- -----------------------------------------------------------------------------
insert into public.school_formacao_normas (formacao_id, norma)
select f.id, n.norma
  from public.school_formacoes f
  join (values
    -- Seguranca do trabalho: transversal a quase tudo
    ('eng_seg_trabalho','NR-01'),('eng_seg_trabalho','NR-05'),('eng_seg_trabalho','NR-06'),
    ('eng_seg_trabalho','NR-10'),('eng_seg_trabalho','NR-10-SEP'),('eng_seg_trabalho','NR-11'),
    ('eng_seg_trabalho','NR-12'),('eng_seg_trabalho','NR-20'),('eng_seg_trabalho','NR-23'),
    ('eng_seg_trabalho','NR-33'),('eng_seg_trabalho','NR-34'),('eng_seg_trabalho','NR-35'),
    ('tec_seg_trabalho','NR-01'),('tec_seg_trabalho','NR-05'),('tec_seg_trabalho','NR-06'),
    ('tec_seg_trabalho','NR-11'),('tec_seg_trabalho','NR-12'),('tec_seg_trabalho','NR-23'),
    ('tec_seg_trabalho','NR-33'),('tec_seg_trabalho','NR-35'),
    -- Eletricidade
    ('eng_eletricista','NR-10'),('eng_eletricista','NR-10-SEP'),
    ('tec_eletrotecnica','NR-10'),('tec_eletrotecnica','NR-10-SEP'),
    ('eletrotecnico','NR-10'),('eletrotecnico','NR-10-SEP'),
    ('tec_eletromecanica','NR-10'),('tec_eletromecanica','NR-12'),
    -- Maquinas, caldeiras, obra e inflamaveis
    ('eng_mecanico','NR-12'),('eng_mecanico','NR-13'),
    ('eng_civil','NR-18'),('eng_civil','NR-35'),
    ('eng_quimico','NR-20'),
    -- Incendio e resgate
    ('bombeiro_civil','NR-23'),('bombeiro_civil','NR-33'),('bombeiro_civil','NR-35'),
    ('bombeiro_civil','PRIMEIROS-SOCORROS'),
    ('sup_brigada','NR-23'),
    ('socorrista','PRIMEIROS-SOCORROS'),
    ('prof_saude','PRIMEIROS-SOCORROS'),
    -- Transito e ambiente
    ('instrutor_transito','DIRECAO-DEFENSIVA'),
    ('tec_meio_ambiente','NR-25'),('tec_meio_ambiente','NR-38')
  ) as n(codigo, norma) on n.codigo = f.codigo
on conflict (formacao_id, norma) do nothing;
