-- =============================================================================
-- Acessos dos portais do Clariza School
--
-- O problema: para um aluno ver a sua matricula, a regra em vigor exigia que
-- ele fosse ligado a empresa em liberty_utilizador_empresas. Essa ligacao abre
-- 104 tabelas, incluindo `employees` (que tem coluna salarial e regra de GRUPO,
-- nao de empresa) e `liberty_utilizadores` (legivel por qualquer autenticado).
-- Dar portal a dezenas de formandos por essa via seria entregar-lhes o ERP.
--
-- A solucao: o utilizador de portal NAO e utilizador da empresa. E uma
-- identidade propria, ligada por auth_user_id, que so alcanca as suas proprias
-- linhas.
--
-- Tudo aqui e ADITIVO. As politicas novas sao permissivas e somam-se as
-- existentes: ninguem perde acesso nenhum. A unica excepcao esta no ponto 5 e
-- foi escrita para nao alterar em nada o que o pessoal interno ja via.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Quem sou eu
--    SECURITY DEFINER porque estas funcoes sao usadas DENTRO das politicas:
--    tem de conseguir ler a tabela sem despoletar a politica que estao a servir.
-- -----------------------------------------------------------------------------

-- Pessoal interno = tem pelo menos uma empresa atribuida.
create or replace function public.e_utilizador_interno()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.liberty_utilizador_empresas lue
    join public.liberty_utilizadores lu on lu.id = lue.utilizador_id
    where lu.auth_user_id = auth.uid()
  )
$$;

-- A mesma pessoa pode ser aluno em mais do que uma escola do grupo.
create or replace function public.school_alunos_do_utilizador()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.school_alunos where auth_user_id = auth.uid()
$$;

create or replace function public.school_docentes_do_utilizador()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.school_docentes where auth_user_id = auth.uid()
$$;

-- Escolas onde esta pessoa e aluno ou docente. Delimita o catalogo que o
-- portal pode mostrar: turmas abertas e cursos da SUA escola, nao de outras.
create or replace function public.school_empresas_do_portal()
returns setof uuid language sql stable security definer set search_path = public as $$
  select empresa_id from public.school_alunos   where auth_user_id = auth.uid()
  union
  select empresa_id from public.school_docentes where auth_user_id = auth.uid()
$$;

-- Turmas que o docente lecciona.
create or replace function public.school_turmas_do_docente()
returns setof uuid language sql stable security definer set search_path = public as $$
  select t.id from public.school_turmas t
  where t.docente_id in (select public.school_docentes_do_utilizador())
$$;

grant execute on function public.e_utilizador_interno()          to authenticated;
grant execute on function public.school_alunos_do_utilizador()   to authenticated;
grant execute on function public.school_docentes_do_utilizador() to authenticated;
grant execute on function public.school_empresas_do_portal()     to authenticated;
grant execute on function public.school_turmas_do_docente()      to authenticated;

-- -----------------------------------------------------------------------------
-- 2) Portal do Aluno — so as suas linhas
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policy where polrelid='public.school_alunos'::regclass and polname='portal_aluno_ficha_propria') then
    create policy portal_aluno_ficha_propria on public.school_alunos for select to authenticated
      using (auth_user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_matriculas'::regclass and polname='portal_aluno_matriculas') then
    create policy portal_aluno_matriculas on public.school_matriculas for select to authenticated
      using (aluno_id in (select public.school_alunos_do_utilizador()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_certificados'::regclass and polname='portal_aluno_certificados') then
    create policy portal_aluno_certificados on public.school_certificados for select to authenticated
      using (aluno_id in (select public.school_alunos_do_utilizador()));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3) Portal do Instrutor — as suas turmas e quem nelas anda
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policy where polrelid='public.school_docentes'::regclass and polname='portal_docente_ficha_propria') then
    create policy portal_docente_ficha_propria on public.school_docentes for select to authenticated
      using (auth_user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_matriculas'::regclass and polname='portal_docente_matriculas') then
    create policy portal_docente_matriculas on public.school_matriculas for select to authenticated
      using (turma_id in (select public.school_turmas_do_docente()));
  end if;

  -- O instrutor ve os alunos das turmas que lecciona. Fora disso, nao.
  if not exists (select 1 from pg_policy where polrelid='public.school_alunos'::regclass and polname='portal_docente_alunos_das_suas_turmas') then
    create policy portal_docente_alunos_das_suas_turmas on public.school_alunos for select to authenticated
      using (
        id in (
          select m.aluno_id from public.school_matriculas m
          where m.turma_id in (select public.school_turmas_do_docente())
        )
      );
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_certificados'::regclass and polname='portal_docente_certificados') then
    create policy portal_docente_certificados on public.school_certificados for select to authenticated
      using (turma_id in (select public.school_turmas_do_docente()));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4) Catalogo visivel no portal — turmas e cursos da propria escola
--    Sem isto o aluno veria a matricula mas nao o nome do curso.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policy where polrelid='public.school_turmas'::regclass and polname='portal_turmas_da_sua_escola') then
    create policy portal_turmas_da_sua_escola on public.school_turmas for select to authenticated
      using (empresa_id in (select public.school_empresas_do_portal()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_cursos'::regclass and polname='portal_cursos_da_sua_escola') then
    create policy portal_cursos_da_sua_escola on public.school_cursos for select to authenticated
      using (empresa_id in (select public.school_empresas_do_portal()));
  end if;

  -- Nome do instrutor da turma. E informacao que ja vai impressa no
  -- certificado, portanto nao acrescenta exposicao.
  if not exists (select 1 from pg_policy where polrelid='public.school_docentes'::regclass and polname='portal_docentes_das_suas_turmas') then
    create policy portal_docentes_das_suas_turmas on public.school_docentes for select to authenticated
      using (
        id in (
          select t.docente_id from public.school_turmas t
          where t.id in (
            select m.turma_id from public.school_matriculas m
            where m.aluno_id in (select public.school_alunos_do_utilizador())
          )
        )
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 5) Fechar a lista de utilizadores a quem vem de fora
--
--    liberty_utilizadores estava legivel por QUALQUER autenticado. Com pessoas
--    externas a entrar, isso passaria a ser a lista completa de utilizadores da
--    plataforma na mao de um formando.
--
--    A regra nova nao muda nada para o pessoal interno: quem tem empresa
--    atribuida continua a ver exactamente o que via. Quem nao tem — os portais
--    — passa a ver apenas a sua propria linha.
-- -----------------------------------------------------------------------------
do $$
declare v_regra text;
begin
  select pg_get_expr(polqual, polrelid) into v_regra
  from pg_policy where polrelid='public.liberty_utilizadores'::regclass and polcmd in ('r','*') limit 1;

  -- So mexe se ainda estiver no estado aberto que encontramos.
  if v_regra is not null and v_regra like '%auth.uid() IS NOT NULL%' and v_regra not like '%e_utilizador_interno%' then
    execute 'drop policy if exists "Authenticated users can view liberty_utilizadores" on public.liberty_utilizadores';
    execute 'drop policy if exists liberty_utilizadores_select on public.liberty_utilizadores';
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.liberty_utilizadores'::regclass and polname='liberty_utilizadores_leitura') then
    create policy liberty_utilizadores_leitura on public.liberty_utilizadores for select to authenticated
      using (auth.uid() is not null and (public.e_utilizador_interno() or auth_user_id = auth.uid()));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 6) Ligacao da conta a ficha
--
--    Chamada uma vez, depois de o utilizador confirmar o email. A prova de
--    identidade e a posse da caixa de correio: so liga fichas cujo email
--    coincide com o email confirmado do token, e so se ainda estiverem livres.
--    Nunca rouba uma ficha ja ligada a outra conta.
-- -----------------------------------------------------------------------------
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

  update public.school_alunos
  set auth_user_id = auth.uid()
  where lower(trim(email)) = v_email and auth_user_id is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then papel := 'aluno'; quantidade := v_n; return next; end if;

  update public.school_docentes
  set auth_user_id = auth.uid()
  where lower(trim(email)) = v_email and auth_user_id is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then papel := 'docente'; quantidade := v_n; return next; end if;

  return;
end;
$$;

comment on function public.school_portal_vincular() is
  'Liga a conta autenticada as fichas de aluno/docente com o mesmo email confirmado. Idempotente: nao toca em fichas ja ligadas.';

grant execute on function public.school_portal_vincular() to authenticated;

-- Sem indice, cada verificacao de politica varria a tabela toda.
create index if not exists idx_school_alunos_auth   on public.school_alunos(auth_user_id) where auth_user_id is not null;
create index if not exists idx_school_docentes_auth on public.school_docentes(auth_user_id) where auth_user_id is not null;
