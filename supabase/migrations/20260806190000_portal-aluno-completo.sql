-- =============================================================================
-- Portal do Aluno — o que falta para o fechar
--
-- Tres coisas:
--
--  1. O aluno nao alcanca as suas presencas, notas nem materiais. As tabelas
--     existem mas so tem politica para o pessoal interno, por isso o detalhe do
--     curso nasceria sempre vazio.
--
--  2. Nao ha por onde pedir inscricao numa turma aberta. O aluno ve as turmas
--     e nao pode fazer nada com essa informacao.
--
--  3. O aluno nao pode corrigir o proprio contacto. Um telefone errado na ficha
--     obriga a telefonar para a secretaria para o mandar mudar.
--
-- Aditiva.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) O aluno ve as SUAS presencas, notas e os materiais das suas turmas
--
--    Os saltos entre tabelas vao por funcao SECURITY DEFINER — foi a recursao
--    entre politicas que ja nos mordeu uma vez.
-- -----------------------------------------------------------------------------
create or replace function public.school_matriculas_do_utilizador()
returns setof uuid language sql stable security definer set search_path = public as $$
  select m.id from public.school_matriculas m
  where m.aluno_id in (
    select a.id from public.school_alunos a where a.auth_user_id = auth.uid()
  )
$$;

create or replace function public.school_turmas_do_aluno()
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct m.turma_id from public.school_matriculas m
  where m.aluno_id in (
    select a.id from public.school_alunos a where a.auth_user_id = auth.uid()
  )
$$;

grant execute on function public.school_matriculas_do_utilizador() to authenticated;
grant execute on function public.school_turmas_do_aluno()          to authenticated;

do $$
begin
  if not exists (select 1 from pg_policy where polrelid='public.school_frequencia'::regclass and polname='portal_aluno_frequencia') then
    create policy portal_aluno_frequencia on public.school_frequencia for select to authenticated
      using (matricula_id in (select public.school_matriculas_do_utilizador()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_avaliacoes'::regclass and polname='portal_aluno_avaliacoes') then
    create policy portal_aluno_avaliacoes on public.school_avaliacoes for select to authenticated
      using (matricula_id in (select public.school_matriculas_do_utilizador()));
  end if;

  -- Materiais: so os que o instrutor marcou como visiveis para o aluno.
  if not exists (select 1 from pg_policy where polrelid='public.school_materiais'::regclass and polname='portal_aluno_materiais') then
    create policy portal_aluno_materiais on public.school_materiais for select to authenticated
      using (visivel_aluno = true and turma_id in (select public.school_turmas_do_aluno()));
  end if;

  -- O instrutor ve tudo o que se passa nas turmas que lecciona.
  if not exists (select 1 from pg_policy where polrelid='public.school_frequencia'::regclass and polname='portal_docente_frequencia') then
    create policy portal_docente_frequencia on public.school_frequencia for select to authenticated
      using (matricula_id in (
        select m.id from public.school_matriculas m
        where m.turma_id in (select public.school_turmas_do_docente())
      ));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_avaliacoes'::regclass and polname='portal_docente_avaliacoes') then
    create policy portal_docente_avaliacoes on public.school_avaliacoes for select to authenticated
      using (turma_id in (select public.school_turmas_do_docente()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_materiais'::regclass and polname='portal_docente_materiais') then
    create policy portal_docente_materiais on public.school_materiais for select to authenticated
      using (turma_id in (select public.school_turmas_do_docente()));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) Pedidos de inscricao
--
--    O aluno pede; a secretaria confirma e so ai nasce a matricula. Nao criamos
--    a matricula direto porque ha vagas, pagamento e pre-requisitos pelo meio —
--    coisas que a escola decide, nao o formando.
-- -----------------------------------------------------------------------------
create table if not exists public.school_inscricoes (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas(id) on delete cascade,
  aluno_id     uuid not null references public.school_alunos(id) on delete cascade,
  turma_id     uuid not null references public.school_turmas(id) on delete cascade,
  -- pedido -> aceite | recusada | cancelada
  estado       text not null default 'pedido',
  mensagem     text,
  resposta     text,
  respondido_em timestamptz,
  matricula_id uuid references public.school_matriculas(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Um pedido por aluno e turma enquanto estiver em aberto.
create unique index if not exists uq_inscricao_aberta
  on public.school_inscricoes(aluno_id, turma_id) where estado = 'pedido';
create index if not exists idx_inscricao_turma on public.school_inscricoes(turma_id, estado);

alter table public.school_inscricoes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polrelid='public.school_inscricoes'::regclass and polname='inscricoes_interno') then
    create policy inscricoes_interno on public.school_inscricoes for all to authenticated
      using (public.user_has_empresa_access(empresa_id))
      with check (public.user_has_empresa_access(empresa_id));
  end if;

  -- O aluno ve e cria os seus. Nao altera nem apaga: depois de pedido, quem
  -- decide e a escola.
  if not exists (select 1 from pg_policy where polrelid='public.school_inscricoes'::regclass and polname='portal_aluno_inscricoes_ler') then
    create policy portal_aluno_inscricoes_ler on public.school_inscricoes for select to authenticated
      using (aluno_id in (select public.school_alunos_do_utilizador()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_inscricoes'::regclass and polname='portal_aluno_inscricoes_criar') then
    create policy portal_aluno_inscricoes_criar on public.school_inscricoes for insert to authenticated
      with check (aluno_id in (select public.school_alunos_do_utilizador()));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3) O aluno corrige o proprio contacto
--
--    So contacto e fotografia. Nome e CPF NAO: sao o que vai impresso no
--    certificado, e quem os altera e a secretaria, contra documento.
-- -----------------------------------------------------------------------------
create or replace function public.school_aluno_atualizar_contacto(
  p_email    text default null,
  p_telefone text default null,
  p_foto_url text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.school_alunos where auth_user_id = auth.uid() limit 1;
  if v_id is null then raise exception 'sem ficha de aluno associada'; end if;

  update public.school_alunos set
    email    = coalesce(nullif(trim(p_email), ''),    email),
    telefone = coalesce(nullif(trim(p_telefone), ''), telefone),
    foto_url = coalesce(nullif(trim(p_foto_url), ''), foto_url),
    updated_at = now()
  where id = v_id;
end;
$$;

comment on function public.school_aluno_atualizar_contacto(text, text, text) is
  'O aluno corrige o proprio contacto. Nome e CPF ficam de fora: sao os dados impressos no certificado.';

grant execute on function public.school_aluno_atualizar_contacto(text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4) Indices para as politicas nao varrerem tabelas inteiras
-- -----------------------------------------------------------------------------
create index if not exists idx_frequencia_matricula on public.school_frequencia(matricula_id);
create index if not exists idx_avaliacoes_matricula on public.school_avaliacoes(matricula_id);
create index if not exists idx_materiais_turma      on public.school_materiais(turma_id) where visivel_aluno = true;
