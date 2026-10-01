-- =============================================================================
-- ADMINISTRATIVO — Licenciamentos e documentacao legal
--
-- Modulo COMUM a todas as empresas, preparado para Portugal e Brasil desde o
-- primeiro dia. O principio do desenho: o MOTOR nao sabe o que e um alvara.
--
--   motor    = documento, validade, aviso, versoes, renovacao, historico.
--              Igual em Macapa e em Braga.
--   catalogo = que tipos existem, quem emite, com que ambito e periodicidade.
--              Dados numa tabela, por pais. NUNCA uma lista escrita no codigo.
--
-- Migracao ADITIVA: so CREATE ... IF NOT EXISTS e ALTER ... ADD COLUMN IF NOT
-- EXISTS. Nao ha DROP de tabelas, nem DELETE, nem TRUNCATE, nem alteracao de
-- colunas existentes. Nada do que hoje funciona muda de comportamento.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Pre-requisito: o Clariza nao sabia em que pais esta cada empresa
--
--    Sem isto nao ha catalogo por pais. As colunas de moeda e identificador
--    ficam criadas mas NAO sao usadas nesta fase: os formatos de moeda estao
--    fixos em src/lib/formatters.ts e mexer nisso e um trabalho proprio.
-- -----------------------------------------------------------------------------
alter table public.empresas
  add column if not exists pais                text,
  add column if not exists moeda               text,
  add column if not exists identificador_fiscal text,
  add column if not exists identificador_tipo   text;

comment on column public.empresas.pais is
  'Codigo ISO do pais da empresa (PT, BR). Decide o catalogo de documentos legais.';
comment on column public.empresas.moeda is
  'Codigo ISO da moeda (EUR, BRL). CRIADA MAS AINDA NAO USADA — formatters.ts fixa EUR.';
comment on column public.empresas.identificador_tipo is
  'NIF em Portugal, CNPJ no Brasil. Acompanha identificador_fiscal.';

-- O pais nao fica preso a esta migracao: o seletor "Pais" nas Configuracoes
-- passa a escrever aqui, portanto qualquer empresa se muda de catalogo num
-- clique. E o que faz a Agencia Demo poder demonstrar ora Portugal ora o
-- Brasil, sem tocar em codigo.
update public.empresas
   set pais               = coalesce(pais, 'BR'),
       moeda              = coalesce(moeda, 'BRL'),
       identificador_tipo = coalesce(identificador_tipo, 'CNPJ')
 where slug in ('itc', 'itc-educa-pro');

update public.empresas
   set pais               = coalesce(pais, 'PT'),
       moeda              = coalesce(moeda, 'EUR'),
       identificador_tipo = coalesce(identificador_tipo, 'NIF')
 where slug in ('obrajusta', 'obrajusta-gestao', 'tudocasa',
                'tudocasa-matrizcharme', 'tudocasa-matrizchamer', 'resiserv',
                'elo-giro', 'demo-agencia');

-- -----------------------------------------------------------------------------
-- 1) Paises e os seus ambitos
--
--    O ambito NAO pode ser um CHECK fixo: no Brasil e municipal/estadual/
--    federal, em Portugal e municipal/nacional/uniao_europeia. Um enum com os
--    valores brasileiros partia Portugal no dia da primeira empresa portuguesa.
-- -----------------------------------------------------------------------------
create table if not exists public.adm_paises (
  codigo               text primary key,
  nome                 text not null,
  ambitos              text[] not null default '{}',
  identificador_label  text,
  created_at           timestamptz not null default now()
);

insert into public.adm_paises (codigo, nome, ambitos, identificador_label) values
  ('PT', 'Portugal', array['municipal','nacional','uniao_europeia','privado'], 'NIF'),
  ('BR', 'Brasil',   array['municipal','estadual','federal','privado'],        'CNPJ')
on conflict (codigo) do nothing;

-- -----------------------------------------------------------------------------
-- 2) Catalogo base da plataforma — partilhado por todos, por pais
--
--    Mantido por nos, so de leitura para a aplicacao. Se cada empresa criasse
--    os seus tipos do zero, dez empresas portuguesas inventavam dez maneiras
--    de escrever "certidao de nao divida" e nenhum relatorio cruzava.
--
--    validade em VALOR + UNIDADE, nao em meses: uma CRF do FGTS vale 30 dias,
--    uma CND federal 180 dias, um alvara um ano, a DGERT tres anos. "1 mes"
--    para uma certidao de 30 dias e uma aproximacao que acaba por enganar.
-- -----------------------------------------------------------------------------
create table if not exists public.adm_tipos_documento (
  id                  uuid primary key default gen_random_uuid(),
  pais                text references public.adm_paises(codigo),  -- null = universal
  codigo              text not null unique,
  nome                text not null,
  entidade_emissora   text,
  ambito              text,
  validade_valor      integer,
  validade_unidade    text check (validade_unidade in ('dias','meses','anos')),
  aviso_dias_sugerido integer not null default 60,
  rotina              boolean not null default false,
  obrigatorio         boolean not null default false,
  aplica_a_vertical   text,
  ordem               integer not null default 100,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now()
);

comment on table public.adm_tipos_documento is
  'Catalogo base por pais. rotina = documento de renovacao frequente (ex. CRF do FGTS, 30 dias): aviso curto e fora do painel de risco, senao o sininho enche-se de ruido e ninguem volta a olhar.';

create index if not exists adm_tipos_documento_pais_idx
  on public.adm_tipos_documento(pais, ativo);

-- ── Semente: Brasil ──────────────────────────────────────────────────────────
insert into public.adm_tipos_documento
  (pais, codigo, nome, entidade_emissora, ambito, validade_valor, validade_unidade, aviso_dias_sugerido, rotina, obrigatorio, ordem) values
  ('BR','br_alvara_funcionamento','Alvará de Funcionamento','Prefeitura','municipal',1,'anos',60,false,true,10),
  ('BR','br_avcb','AVCB / CLCB — Vistoria do Corpo de Bombeiros','Corpo de Bombeiros Militar','estadual',1,'anos',60,false,true,20),
  ('BR','br_licenca_sanitaria','Licença Sanitária','Vigilância Sanitária','municipal',1,'anos',60,false,false,30),
  ('BR','br_cartao_cnpj','Cartão CNPJ','Receita Federal','federal',null,null,60,false,true,40),
  ('BR','br_contrato_social','Contrato Social e alterações','Junta Comercial','estadual',null,null,60,false,true,50),
  ('BR','br_cnd_federal','CND Federal — tributos e dívida ativa','Receita Federal / PGFN','federal',180,'dias',30,false,true,60),
  ('BR','br_cnd_estadual','CND Estadual','SEFAZ','estadual',90,'dias',20,true,false,70),
  ('BR','br_cnd_municipal','CND Municipal','Prefeitura','municipal',90,'dias',20,true,false,80),
  ('BR','br_crf_fgts','CRF do FGTS','Caixa Económica Federal','federal',30,'dias',7,true,true,90),
  ('BR','br_cndt','CNDT — débitos trabalhistas','Tribunal Superior do Trabalho','federal',180,'dias',30,false,true,100),
  ('BR','br_certidao_falencia','Certidão de falência e recuperação judicial','Tribunal de Justiça','estadual',90,'dias',20,true,false,110),
  ('BR','br_pgr','PGR — programa de gerenciamento de riscos (NR-1)','Interno',null,1,'anos',60,false,true,120),
  ('BR','br_pcmso','PCMSO (NR-7)','Médico do trabalho',null,1,'anos',60,false,true,130),
  ('BR','br_apolice_seguro','Apólice de seguro','Seguradora','privado',1,'anos',45,false,false,140),
  ('BR','br_credenciamento_instrutor','Credenciamento de instrutor de NR','Entidade formadora','privado',2,'anos',90,false,false,150),
  ('BR','br_licenca_ambiental','Licença Ambiental','Órgão ambiental estadual / IBAMA','estadual',2,'anos',90,false,false,160)
on conflict (codigo) do nothing;

-- ── Semente: Portugal ────────────────────────────────────────────────────────
--    Nao e a lista brasileira traduzida. Sao documentos diferentes, de
--    entidades que no Brasil nao tem equivalente, e vice-versa.
insert into public.adm_tipos_documento
  (pais, codigo, nome, entidade_emissora, ambito, validade_valor, validade_unidade, aviso_dias_sugerido, rotina, obrigatorio, aplica_a_vertical, ordem) values
  ('PT','pt_certidao_permanente','Certidão Permanente do Registo Comercial','IRN','nacional',1,'anos',45,false,true,null,10),
  ('PT','pt_certidao_at','Certidão de não dívida à Autoridade Tributária','Autoridade Tributária','nacional',3,'meses',20,true,true,null,20),
  ('PT','pt_situacao_contributiva','Declaração de situação contributiva regularizada','Segurança Social','nacional',3,'meses',20,true,true,null,30),
  ('PT','pt_dgert','Certificação de entidade formadora','DGERT','nacional',3,'anos',120,false,false,'school',40),
  ('PT','pt_alvara_impic','Alvará / título de registo de construção','IMPIC','nacional',1,'anos',60,false,false,'build',50),
  ('PT','pt_licenca_utilizacao','Licença de utilização do espaço','Câmara Municipal','municipal',null,null,60,false,true,null,60),
  ('PT','pt_seguro_at','Seguro de acidentes de trabalho','Seguradora','privado',1,'anos',45,false,true,null,70),
  ('PT','pt_seguro_rc','Seguro de responsabilidade civil','Seguradora','privado',1,'anos',45,false,false,null,80),
  ('PT','pt_registo_criminal','Certificado de registo criminal dos gerentes','Registo Criminal','nacional',3,'meses',20,true,false,null,90),
  ('PT','pt_rgpd','Registo de tratamentos e encarregado de proteção de dados','Interno / CNPD','nacional',1,'anos',60,false,false,null,100),
  ('PT','pt_iso','Certificação ISO','Organismo certificador','privado',3,'anos',120,false,false,null,110),
  ('PT','pt_livro_reclamacoes','Livro de reclamações eletrónico','DGC','nacional',null,null,60,false,true,null,120)
on conflict (codigo) do nothing;

-- ── Universais (sem pais) ────────────────────────────────────────────────────
insert into public.adm_tipos_documento
  (pais, codigo, nome, entidade_emissora, ambito, validade_valor, validade_unidade, aviso_dias_sugerido, obrigatorio, ordem) values
  (null,'contrato_arrendamento','Contrato de arrendamento das instalações','Senhorio','privado',1,'anos',90,false,900),
  (null,'outro','Outro documento',null,null,null,null,60,false,999)
on conflict (codigo) do nothing;

-- -----------------------------------------------------------------------------
-- 3) Tipos proprios de cada empresa
--
--    Nenhum catalogo preve tudo, e um modulo que so aceita o que estava
--    previsto e um modulo que a empresa contorna com uma pasta partilhada.
-- -----------------------------------------------------------------------------
create table if not exists public.adm_tipos_documento_empresa (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references public.empresas(id) on delete cascade,
  nome                text not null,
  entidade_emissora   text,
  ambito              text,
  validade_valor      integer,
  validade_unidade    text check (validade_unidade in ('dias','meses','anos')),
  aviso_dias_sugerido integer not null default 60,
  rotina              boolean not null default false,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now()
);

create index if not exists adm_tipos_empresa_idx
  on public.adm_tipos_documento_empresa(empresa_id, ativo);

-- -----------------------------------------------------------------------------
-- 4) Os documentos
--
--    Por EMPRESA, nunca por grupo: as empresas de um grupo partilham
--    dados-mestre de proposito, mas um alvara pertence a uma pessoa coletiva
--    concreta — mesmo quando as empresas estao em paises diferentes.
-- -----------------------------------------------------------------------------
create table if not exists public.adm_documentos (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references public.empresas(id) on delete cascade,
  tipo_id            uuid references public.adm_tipos_documento(id),
  tipo_empresa_id    uuid references public.adm_tipos_documento_empresa(id),
  tipo_nome          text not null,          -- fotografia do nome a data do registo
  titulo             text not null,
  numero             text,
  entidade_emissora  text,
  ambito             text,
  data_emissao       date,
  data_validade      date,
  validade_valor     integer,
  validade_unidade   text check (validade_unidade in ('dias','meses','anos')),
  aviso_dias         integer not null default 60,
  rotina             boolean not null default false,
  responsavel_id     uuid,
  responsavel_nome   text,
  custo_renovacao    numeric(12,2),
  observacoes        text,
  em_renovacao       boolean not null default false,
  dispensado         boolean not null default false,
  arquivado          boolean not null default false,
  created_by         uuid,
  created_by_nome    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists adm_documentos_empresa_idx
  on public.adm_documentos(empresa_id, arquivado);
create index if not exists adm_documentos_validade_idx
  on public.adm_documentos(data_validade) where data_validade is not null;

-- ── Versoes ──────────────────────────────────────────────────────────────────
--    Renovar CRIA uma versao nova; a anterior fica arquivada com o ficheiro
--    dela. O alvara antigo nao desaparece: e ele que prova que a empresa
--    esteve regular naquele periodo.
create table if not exists public.adm_documento_versoes (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  documento_id    uuid not null references public.adm_documentos(id) on delete cascade,
  numero          text,
  data_emissao    date,
  data_validade   date,
  nome_ficheiro   text,
  storage_path    text,
  mime_type       text,
  tamanho_bytes   bigint,
  vigente         boolean not null default true,
  notas           text,
  created_by_nome text,
  created_at      timestamptz not null default now()
);

create index if not exists adm_versoes_documento_idx
  on public.adm_documento_versoes(documento_id, created_at desc);

-- ── Historico ────────────────────────────────────────────────────────────────
create table if not exists public.adm_documento_historico (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  documento_id     uuid not null references public.adm_documentos(id) on delete cascade,
  tipo             text not null,
  descricao        text not null,
  metadata         jsonb default '{}'::jsonb,
  utilizador_nome  text,
  created_at       timestamptz not null default now()
);

create index if not exists adm_historico_documento_idx
  on public.adm_documento_historico(documento_id, created_at desc);

-- ── Registo de alertas ja enviados ───────────────────────────────────────────
--    Sem isto, a tarefa diaria repetia a mesma notificacao todos os dias ate
--    alguem renovar. A chave inclui a data de validade: quando o documento e
--    renovado, a validade muda e o ciclo de avisos recomeca do zero.
create table if not exists public.adm_documento_alertas (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  documento_id  uuid not null references public.adm_documentos(id) on delete cascade,
  marco         text not null,          -- 'a_vencer' | 'vencido'
  data_validade date,
  enviado_em    timestamptz not null default now()
);

create unique index if not exists adm_alertas_unicos_idx
  on public.adm_documento_alertas(documento_id, marco, data_validade);

-- -----------------------------------------------------------------------------
-- 5) O estado calcula-se, nunca se grava
--
--    Um campo estado gravado na tabela fica errado no dia seguinte.
--    security_invoker = on: a vista respeita a RLS de quem a consulta. Sem
--    isto seria um buraco — a vista corria com os privilegios do dono e
--    devolvia os documentos de todas as empresas.
-- -----------------------------------------------------------------------------
create or replace view public.v_adm_documentos
with (security_invoker = on) as
select
  d.*,
  case
    when d.arquivado                then 'arquivado'
    when d.dispensado               then 'dispensado'
    when d.em_renovacao             then 'em_renovacao'
    when d.data_validade is null    then 'sem_validade'
    when d.data_validade <  current_date then 'vencido'
    when d.data_validade <= current_date + make_interval(days => d.aviso_dias) then 'a_vencer'
    else 'vigente'
  end                                                    as estado,
  (d.data_validade - current_date)                       as dias_para_vencer
from public.adm_documentos d;

-- -----------------------------------------------------------------------------
-- 6) Seguranca
--
--    user_has_empresa_access desde a primeira migracao. Nunca
--    auth.uid() is not null — foi assim que quase todo o core comercial ficou
--    sem isolamento entre empresas.
-- -----------------------------------------------------------------------------
alter table public.adm_paises                   enable row level security;
alter table public.adm_tipos_documento          enable row level security;
alter table public.adm_tipos_documento_empresa  enable row level security;
alter table public.adm_documentos               enable row level security;
alter table public.adm_documento_versoes        enable row level security;
alter table public.adm_documento_historico      enable row level security;
alter table public.adm_documento_alertas        enable row level security;

-- Catalogo base: leitura para autenticados, escrita para ninguem pela
-- aplicacao. Nao tem empresa_id — e partilhado de proposito.
drop policy if exists adm_paises_leitura on public.adm_paises;
create policy adm_paises_leitura on public.adm_paises
  for select using (auth.uid() is not null);

drop policy if exists adm_tipos_leitura on public.adm_tipos_documento;
create policy adm_tipos_leitura on public.adm_tipos_documento
  for select using (auth.uid() is not null);

-- Tudo o que tem empresa_id isola por empresa.
drop policy if exists adm_tipos_empresa_empresa on public.adm_tipos_documento_empresa;
create policy adm_tipos_empresa_empresa on public.adm_tipos_documento_empresa
  for all using (user_has_empresa_access(empresa_id))
  with check (user_has_empresa_access(empresa_id));

drop policy if exists adm_documentos_empresa on public.adm_documentos;
create policy adm_documentos_empresa on public.adm_documentos
  for all using (user_has_empresa_access(empresa_id))
  with check (user_has_empresa_access(empresa_id));

drop policy if exists adm_versoes_empresa on public.adm_documento_versoes;
create policy adm_versoes_empresa on public.adm_documento_versoes
  for all using (user_has_empresa_access(empresa_id))
  with check (user_has_empresa_access(empresa_id));

drop policy if exists adm_historico_empresa on public.adm_documento_historico;
create policy adm_historico_empresa on public.adm_documento_historico
  for all using (user_has_empresa_access(empresa_id))
  with check (user_has_empresa_access(empresa_id));

drop policy if exists adm_alertas_empresa on public.adm_documento_alertas;
create policy adm_alertas_empresa on public.adm_documento_alertas
  for all using (user_has_empresa_access(empresa_id))
  with check (user_has_empresa_access(empresa_id));

-- -----------------------------------------------------------------------------
-- 7) Ficheiros — bucket PRIVADO
--
--    Um alvara e documento da empresa; nao anda num link aberto. Acesso so
--    por URL assinado, como o Planeamento ja faz.
--    Path: {empresa_id}/{documento_id}/{ficheiro}
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('adm-documentos', 'adm-documentos', false)
on conflict (id) do nothing;

-- A pasta de topo e o empresa_id. Um cast directo a uuid dentro da politica
-- seria perigoso: a expressao corre para objectos de TODOS os buckets, e um
-- nome que nao comece por uuid rebentava com erro — partindo o storage dos
-- outros modulos. Por isso o cast vive numa funcao que apanha a excepcao e
-- devolve falso.
create or replace function public.adm_acesso_pasta(nome text)
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare
  eid uuid;
begin
  eid := (storage.foldername(nome))[1]::uuid;
  return user_has_empresa_access(eid);
exception when others then
  return false;
end $$;

drop policy if exists adm_docs_storage_select on storage.objects;
create policy adm_docs_storage_select on storage.objects
  for select using (
    bucket_id = 'adm-documentos' and public.adm_acesso_pasta(name)
  );

drop policy if exists adm_docs_storage_insert on storage.objects;
create policy adm_docs_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'adm-documentos' and public.adm_acesso_pasta(name)
  );

drop policy if exists adm_docs_storage_delete on storage.objects;
create policy adm_docs_storage_delete on storage.objects
  for delete using (
    bucket_id = 'adm-documentos' and public.adm_acesso_pasta(name)
  );

-- -----------------------------------------------------------------------------
-- 8) updated_at
-- -----------------------------------------------------------------------------
create or replace function public.adm_documentos_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists adm_documentos_touch_trg on public.adm_documentos;
create trigger adm_documentos_touch_trg
  before update on public.adm_documentos
  for each row execute function public.adm_documentos_touch();

-- -----------------------------------------------------------------------------
-- 9) Permissoes do modulo novo
--
--    O Planeamento Estrategico nunca teve chave de permissao: estava visivel a
--    quem entrasse. Ao passar a exigir a chave 'administrativo', quem nao
--    tivesse linha nenhuma deixava de o ver — e isso seria uma regressao.
--
--    Por isso semeia-se a permissao para todos os utilizadores que ja existem,
--    conforme o perfil: quem hoje ve o Planeamento continua a ve-lo. Os
--    administradores nao precisam de linha (o codigo abre-lhes tudo).
--
--    O perfil operacional fica so com LEITURA: mantem o Planeamento como hoje,
--    mas nao gere licencas. Apertar isto ate zero faz-se no ecra de
--    Utilizadores, sem tocar em codigo.
-- -----------------------------------------------------------------------------
insert into public.liberty_utilizador_permissoes
  (utilizador_id, empresa_id, modulo, perm_ver, perm_criar, perm_editar, perm_eliminar)
select lue.utilizador_id,
       lue.empresa_id,
       'administrativo',
       true,
       lu.perfil in ('administrador','gestor'),
       lu.perfil in ('administrador','gestor'),
       lu.perfil = 'administrador'
  from public.liberty_utilizador_empresas lue
  join public.liberty_utilizadores lu on lu.id = lue.utilizador_id
 where coalesce(lu.eliminado, false) = false
on conflict (utilizador_id, empresa_id, modulo) do nothing;
