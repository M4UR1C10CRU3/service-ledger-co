-- =============================================================================
-- FORMACOES — a escola passa a poder criar as suas
--
-- O catalogo que semeei nao chega: as fichas dos 17 instrutores do ITC trazem
-- "Tecnico em Mecanica Industrial", "Tecnico em Enfermagem", "Bombeiro Civil
-- Resgatista" e outras que nao estavam la. Um catalogo fechado obriga a pedir
-- SQL de cada vez que aparece uma formacao nova — e a alternativa que a casa
-- acaba por escolher e escrever texto livre noutro sitio.
--
-- Duas coisas aqui:
--   1. politicas de escrita, para a escola criar as suas formacoes
--   2. as formacoes que faltavam, ja com as normas que credenciam
--
-- Migracao ADITIVA.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Quem pode escrever no catalogo
--
--    O catalogo da plataforma (empresa_id NULL) e so de leitura para todos. O
--    que cada escola cria e dela: escreve e le, e mais ninguem ve.
--
--    A leitura passa a ser filtrada. Antes devolvia TUDO a qualquer
--    autenticado — sem gravidade nenhuma nos dados, mas com uma escola a ver a
--    lista da outra a encher-se de coisas que nao lhe dizem respeito.
-- -----------------------------------------------------------------------------
drop policy if exists school_formacoes_leitura on public.school_formacoes;
create policy school_formacoes_leitura on public.school_formacoes
  for select using (
    empresa_id is null or user_has_empresa_access(empresa_id)
  );

drop policy if exists school_formacoes_escrita on public.school_formacoes;
create policy school_formacoes_escrita on public.school_formacoes
  for all
  using (empresa_id is not null and user_has_empresa_access(empresa_id))
  with check (empresa_id is not null and user_has_empresa_access(empresa_id));

-- O mapa de normas segue o dono da formacao: quem pode mexer na formacao pode
-- dizer que normas ela credencia. As da plataforma ficam intocaveis.
drop policy if exists school_formacao_normas_leitura on public.school_formacao_normas;
create policy school_formacao_normas_leitura on public.school_formacao_normas
  for select using (auth.uid() is not null);

drop policy if exists school_formacao_normas_escrita on public.school_formacao_normas;
create policy school_formacao_normas_escrita on public.school_formacao_normas
  for all
  using (exists (
    select 1 from public.school_formacoes f
     where f.id = formacao_id
       and f.empresa_id is not null
       and user_has_empresa_access(f.empresa_id)
  ))
  with check (exists (
    select 1 from public.school_formacoes f
     where f.id = formacao_id
       and f.empresa_id is not null
       and user_has_empresa_access(f.empresa_id)
  ));

-- O codigo unico global impede duas escolas de criarem a mesma formacao com o
-- mesmo nome. Passa a ser unico POR EMPRESA.
--
-- A CONSTRAINT primeiro, o indice so depois. Ao contrario falha com
-- "cannot drop index ... because constraint ... requires it": o `unique` da
-- criacao da tabela gerou uma constraint, e o indice existe ao servico dela.
-- Apagar a constraint leva o indice atras; o `drop index` que fica a seguir e
-- so a rede para o caso de alguma base ter um indice unico solto.
alter table public.school_formacoes drop constraint if exists school_formacoes_codigo_key;
drop index if exists school_formacoes_codigo_key;
create unique index if not exists school_formacoes_codigo_empresa_idx
  on public.school_formacoes (coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), codigo);

-- -----------------------------------------------------------------------------
-- 2) As formacoes que faltavam
--
--    Tiradas das fichas reais dos 17 instrutores do ITC. Continuam a ser
--    catalogo da plataforma (empresa_id NULL) porque servem qualquer escola de
--    formacao, nao so esta.
-- -----------------------------------------------------------------------------
insert into public.school_formacoes (codigo, nome, sigla, conselho, ordem) values
  ('tec_enfermagem',     'Técnico em Enfermagem',           'Téc. Enf.',  'COREN', 115),
  ('enfermeiro',         'Enfermeiro',                      null,         'COREN', 116),
  ('tec_mec_industrial', 'Técnico em Mecânica Industrial',  'Téc. Mec.',  'CRT',    65),
  ('eng_producao',       'Engenheiro de Produção',          'Eng. Prod.', 'CREA',   75),
  ('tec_edificacoes',    'Técnico em Edificações',          'Téc. Edif.', 'CRT',    76),
  ('tec_quimica',        'Técnico em Química',              'Téc. Quím.', 'CRQ',    85),
  ('operador_maquinas',  'Operador de Máquinas Certificado', null,        null,    105)
on conflict do nothing;

insert into public.school_formacao_normas (formacao_id, norma)
select f.id, n.norma
  from public.school_formacoes f
  join (values
    -- Enfermagem: primeiros socorros.
    ('tec_enfermagem','PRIMEIROS-SOCORROS'),
    ('enfermeiro','PRIMEIROS-SOCORROS'),
    -- Mecanica industrial: maquinas e movimentacao de materiais
    ('tec_mec_industrial','NR-11'),('tec_mec_industrial','NR-12'),
    ('tec_mec_industrial','NR-13'),
    ('eng_producao','NR-11'),('eng_producao','NR-12'),
    ('tec_edificacoes','NR-18'),('tec_edificacoes','NR-35'),
    ('tec_quimica','NR-20'),
    ('operador_maquinas','NR-11'),('operador_maquinas','NR-12')
  ) as n(codigo, norma) on n.codigo = f.codigo
 where f.empresa_id is null
on conflict (formacao_id, norma) do nothing;

-- -----------------------------------------------------------------------------
-- 3) Bombeiro Civil passa a Bombeiro Civil Resgatista
--
--    O ITC so forma resgatistas — a formacao simples nao existe na casa. O
--    "Bombeiro Civil" foi semeado na migracao anterior, que ja correu, por isso
--    RENOMEIA-SE em vez de se criar um segundo: dois na lista competiam pelo
--    mesmo instrutor, e apagar o antigo perderia as ligacoes ja feitas.
--
--    O codigo interno fica 'bombeiro_civil'. Mudar codigos que outras linhas ja
--    referenciam nao acrescenta nada e so cria oportunidade de erro.
--
--    As normas que credencia ja estao certas para o resgatista: NR-23, NR-33,
--    NR-35 e Primeiros Socorros.
-- -----------------------------------------------------------------------------
update public.school_formacoes
   set nome = 'Bombeiro Civil Resgatista'
 where codigo = 'bombeiro_civil'
   and empresa_id is null
   and nome = 'Bombeiro Civil';
