-- =============================================================================
-- Portal Corporativo — o espaco da empresa cliente na plataforma
--
-- Deixa de ser um relatorio que a administracao abre sobre um cliente e passa
-- a ser o sitio onde a empresa ve os seus contratos, a calendarizacao, pede
-- orcamentos de formacao e acompanha o servico prestado.
--
-- Tres decisoes tomadas aqui, e o motivo de cada uma:
--
--  1. VARIOS contactos por empresa, nao um login partilhado.
--     school_clientes_corp.auth_user_id existia e servia uma conta so. Uma
--     credencial partilhada entre o RH e o tecnico de seguranca nao se
--     consegue revogar a um deles nem diz quem fez o que. Fica uma tabela de
--     contactos, cada um com a sua conta.
--
--  2. Ligacao REAL entre aluno e empresa cliente.
--     A vista antiga procurava os formandos com
--     `empresa_trabalho ILIKE '%nome do cliente%'`. Esse campo esta vazio nos
--     9 alunos, portanto o resultado era sempre zero; e mesmo preenchido,
--     comparar por texto confunde "Etecon Ltda" com "Etecon Servicos Ltda".
--     Passa a haver chave estrangeira.
--
--  3. Pedidos de formacao proprios.
--     pedidos_orcamento e do ERP e esta moldado para obra: local de execucao,
--     duracao da obra, empreitada. Pedir formacao para 12 pessoas em NR 35 nao
--     cabe la sem deturpar os dois.
--
-- Aditiva: cria tabelas e colunas novas, nao altera nem remove nada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Contactos da empresa cliente com acesso ao portal
-- -----------------------------------------------------------------------------
create table if not exists public.school_corp_contactos (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas(id) on delete cascade,
  cliente_id   uuid not null references public.school_clientes_corp(id) on delete cascade,
  nome         text not null,
  email        text not null,
  cargo        text,
  auth_user_id uuid references auth.users(id) on delete set null,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Um email so pode representar uma empresa cliente de cada escola.
create unique index if not exists uq_corp_contacto_email
  on public.school_corp_contactos(empresa_id, lower(trim(email)));
create index if not exists idx_corp_contacto_auth
  on public.school_corp_contactos(auth_user_id) where auth_user_id is not null;
create index if not exists idx_corp_contacto_cliente
  on public.school_corp_contactos(cliente_id);

alter table public.school_corp_contactos enable row level security;

-- -----------------------------------------------------------------------------
-- 2) Ligacao do aluno a empresa cliente
-- -----------------------------------------------------------------------------
alter table public.school_alunos
  add column if not exists cliente_corp_id uuid references public.school_clientes_corp(id) on delete set null;

create index if not exists idx_school_alunos_cliente_corp
  on public.school_alunos(cliente_corp_id) where cliente_corp_id is not null;

comment on column public.school_alunos.cliente_corp_id is
  'Empresa cliente que enviou este formando. Substitui a comparacao por texto sobre empresa_trabalho, que confundia nomes parecidos.';

-- -----------------------------------------------------------------------------
-- 3) Pedidos de orcamento de formacao
-- -----------------------------------------------------------------------------
create table if not exists public.school_pedidos_formacao (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas(id) on delete cascade,
  cliente_id     uuid not null references public.school_clientes_corp(id) on delete cascade,
  numero         text not null,
  curso_id       uuid references public.school_cursos(id) on delete set null,
  curso_nome     text,
  n_formandos    integer,
  modalidade     text,
  local_pretendido text,
  data_pretendida  date,
  observacoes    text,
  -- pedido -> em_analise -> respondido -> aceite | recusado | cancelado
  estado         text not null default 'pedido',
  resposta       text,
  valor_proposto numeric,
  respondido_em  timestamptz,
  pedido_por     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists uq_pedido_formacao_numero
  on public.school_pedidos_formacao(empresa_id, numero);
create index if not exists idx_pedido_formacao_cliente
  on public.school_pedidos_formacao(cliente_id, estado);

alter table public.school_pedidos_formacao enable row level security;

-- Numeracao atomica, como a dos certificados.
create table if not exists public.school_pedidos_formacao_seq (
  empresa_id uuid    not null references public.empresas(id) on delete cascade,
  ano        integer not null,
  ultimo_seq integer not null default 0,
  primary key (empresa_id, ano)
);
alter table public.school_pedidos_formacao_seq enable row level security;

-- -----------------------------------------------------------------------------
-- 4) Identidade do utilizador corporativo
-- -----------------------------------------------------------------------------
create or replace function public.school_clientes_do_utilizador()
returns setof uuid language sql stable security definer set search_path = public as $$
  select cliente_id from public.school_corp_contactos
  where auth_user_id = auth.uid() and ativo = true
$$;

grant execute on function public.school_clientes_do_utilizador() to authenticated;

-- Estende a ligacao de conta: alem de aluno e docente, tambem contacto de
-- empresa cliente. Mesma prova de identidade — a posse do email confirmado.
create or replace function public.school_portal_vincular()
returns table (papel text, quantidade integer)
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_n integer;
begin
  if auth.uid() is null or v_email = '' then
    raise exception 'sem sessao iniciada';
  end if;

  update public.school_alunos set auth_user_id = auth.uid()
  where lower(trim(email)) = v_email and auth_user_id is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then papel := 'aluno'; quantidade := v_n; return next; end if;

  update public.school_docentes set auth_user_id = auth.uid()
  where lower(trim(email)) = v_email and auth_user_id is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then papel := 'docente'; quantidade := v_n; return next; end if;

  update public.school_corp_contactos set auth_user_id = auth.uid()
  where lower(trim(email)) = v_email and auth_user_id is null and ativo = true;
  get diagnostics v_n = row_count;
  if v_n > 0 then papel := 'corporativo'; quantidade := v_n; return next; end if;

  return;
end;
$$;

grant execute on function public.school_portal_vincular() to authenticated;

-- -----------------------------------------------------------------------------
-- 5) Regras de acesso
--
--    A empresa cliente ve o que lhe diz respeito e mais nada: os seus
--    contratos, os seus pedidos, os formandos que ELA enviou, e as turmas onde
--    esses formandos andam. Nao ve formandos de outra empresa nem o resto da
--    escola.
-- -----------------------------------------------------------------------------

-- Interno: acesso pela empresa, como no resto do School.
do $$
begin
  if not exists (select 1 from pg_policy where polrelid='public.school_corp_contactos'::regclass and polname='corp_contactos_interno') then
    create policy corp_contactos_interno on public.school_corp_contactos for all to authenticated
      using (public.user_has_empresa_access(empresa_id))
      with check (public.user_has_empresa_access(empresa_id));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_pedidos_formacao'::regclass and polname='pedidos_formacao_interno') then
    create policy pedidos_formacao_interno on public.school_pedidos_formacao for all to authenticated
      using (public.user_has_empresa_access(empresa_id))
      with check (public.user_has_empresa_access(empresa_id));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_pedidos_formacao_seq'::regclass and polname='pedidos_formacao_seq_interno') then
    create policy pedidos_formacao_seq_interno on public.school_pedidos_formacao_seq for all to authenticated
      using (public.user_has_empresa_access(empresa_id))
      with check (public.user_has_empresa_access(empresa_id));
  end if;
end $$;

-- Portal corporativo
do $$
begin
  -- A sua propria ficha de contacto
  if not exists (select 1 from pg_policy where polrelid='public.school_corp_contactos'::regclass and polname='corp_contacto_proprio') then
    create policy corp_contacto_proprio on public.school_corp_contactos for select to authenticated
      using (auth_user_id = auth.uid());
  end if;

  -- A ficha da empresa que representa
  if not exists (select 1 from pg_policy where polrelid='public.school_clientes_corp'::regclass and polname='corp_ficha_da_empresa') then
    create policy corp_ficha_da_empresa on public.school_clientes_corp for select to authenticated
      using (id in (select public.school_clientes_do_utilizador()));
  end if;

  -- Contratos da sua empresa
  if not exists (select 1 from pg_policy where polrelid='public.school_contratos_corp'::regclass and polname='corp_contratos') then
    create policy corp_contratos on public.school_contratos_corp for select to authenticated
      using (cliente_id in (select public.school_clientes_do_utilizador()));
  end if;

  -- Pedidos: ve os seus e pode criar novos
  if not exists (select 1 from pg_policy where polrelid='public.school_pedidos_formacao'::regclass and polname='corp_pedidos_ler') then
    create policy corp_pedidos_ler on public.school_pedidos_formacao for select to authenticated
      using (cliente_id in (select public.school_clientes_do_utilizador()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_pedidos_formacao'::regclass and polname='corp_pedidos_criar') then
    create policy corp_pedidos_criar on public.school_pedidos_formacao for insert to authenticated
      with check (cliente_id in (select public.school_clientes_do_utilizador()));
  end if;

  -- Os formandos que a empresa enviou
  if not exists (select 1 from pg_policy where polrelid='public.school_alunos'::regclass and polname='corp_seus_formandos') then
    create policy corp_seus_formandos on public.school_alunos for select to authenticated
      using (cliente_corp_id in (select public.school_clientes_do_utilizador()));
  end if;

  -- Matriculas e certificados desses formandos
  if not exists (select 1 from pg_policy where polrelid='public.school_matriculas'::regclass and polname='corp_matriculas') then
    create policy corp_matriculas on public.school_matriculas for select to authenticated
      using (aluno_id in (
        select a.id from public.school_alunos a
        where a.cliente_corp_id in (select public.school_clientes_do_utilizador())
      ));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_certificados'::regclass and polname='corp_certificados') then
    create policy corp_certificados on public.school_certificados for select to authenticated
      using (aluno_id in (
        select a.id from public.school_alunos a
        where a.cliente_corp_id in (select public.school_clientes_do_utilizador())
      ));
  end if;

  -- Calendarizacao: as turmas onde os seus formandos andam, e o catalogo de
  -- cursos da escola, necessario para pedir orcamento.
  if not exists (select 1 from pg_policy where polrelid='public.school_turmas'::regclass and polname='corp_turmas') then
    create policy corp_turmas on public.school_turmas for select to authenticated
      using (empresa_id in (
        select c.empresa_id from public.school_clientes_corp c
        where c.id in (select public.school_clientes_do_utilizador())
      ));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_cursos'::regclass and polname='corp_cursos') then
    create policy corp_cursos on public.school_cursos for select to authenticated
      using (empresa_id in (
        select c.empresa_id from public.school_clientes_corp c
        where c.id in (select public.school_clientes_do_utilizador())
      ));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 6) Numero do pedido
-- -----------------------------------------------------------------------------
create or replace function public.school_gerar_numero_pedido(p_cliente_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_empresa uuid;
  v_ano integer := extract(year from current_date);
  v_seq integer;
begin
  select empresa_id into v_empresa from public.school_clientes_corp where id = p_cliente_id;
  if v_empresa is null then raise exception 'cliente inexistente'; end if;

  -- Deixa passar quem e interno OU representa esta empresa cliente.
  if not (public.user_has_empresa_access(v_empresa)
          or p_cliente_id in (select public.school_clientes_do_utilizador())) then
    raise exception 'sem acesso a este cliente';
  end if;

  insert into public.school_pedidos_formacao_seq (empresa_id, ano, ultimo_seq)
  values (v_empresa, v_ano, 1)
  on conflict (empresa_id, ano) do update
    set ultimo_seq = public.school_pedidos_formacao_seq.ultimo_seq + 1
  returning public.school_pedidos_formacao_seq.ultimo_seq into v_seq;

  return 'PF-' || v_ano || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

grant execute on function public.school_gerar_numero_pedido(uuid) to authenticated;
