-- =============================================================================
-- Lancamento de presencas, faltas e notas
--
-- Achado: school_frequencia, school_avaliacoes e school_materiais tinham APENAS
-- as politicas de leitura dos portais que criei ontem. Nenhuma politica para o
-- pessoal interno. Com RLS ligada e sem politica, o Postgres nega tudo — nem a
-- secretaria nem o instrutor conseguiriam escrever uma linha.
--
-- E a mesma falha dos buckets de Storage: tabela criada, RLS ligada, politicas
-- esquecidas. Explica porque as tres estao a zero desde sempre.
--
-- Aqui fica: acesso interno pela empresa, e escrita para o instrutor nas turmas
-- que lecciona — que e quem esta na sala e sabe quem faltou.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Pessoal interno — o mesmo criterio do resto do School
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['school_frequencia', 'school_avaliacoes', 'school_materiais'] loop
    if not exists (
      select 1 from pg_policy
      where polrelid = format('public.%I', t)::regclass
        and polname  = format('%s_interno', t)
    ) then
      execute format($f$
        create policy %I on public.%I for all to authenticated
        using (public.user_has_empresa_access(empresa_id))
        with check (public.user_has_empresa_access(empresa_id))
      $f$, format('%s_interno', t), t);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 2) O instrutor lanca nas SUAS turmas
--
--    Escrita limitada as turmas que lecciona. Um instrutor nao mexe na
--    assiduidade da turma de outro.
-- -----------------------------------------------------------------------------

-- Matriculas das turmas do docente — evita o salto directo entre tabelas
-- dentro da politica, que foi o que gerou recursao da ultima vez.
create or replace function public.school_matriculas_das_turmas_do_docente()
returns setof uuid language sql stable security definer set search_path = public as $$
  select m.id from public.school_matriculas m
  where m.turma_id in (
    select t.id from public.school_turmas t
    where t.docente_id in (
      select d.id from public.school_docentes d where d.auth_user_id = auth.uid()
    )
  )
$$;

grant execute on function public.school_matriculas_das_turmas_do_docente() to authenticated;

do $$
begin
  -- Presencas
  if not exists (select 1 from pg_policy where polrelid='public.school_frequencia'::regclass and polname='docente_lanca_frequencia') then
    create policy docente_lanca_frequencia on public.school_frequencia for insert to authenticated
      with check (matricula_id in (select public.school_matriculas_das_turmas_do_docente()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_frequencia'::regclass and polname='docente_corrige_frequencia') then
    create policy docente_corrige_frequencia on public.school_frequencia for update to authenticated
      using (matricula_id in (select public.school_matriculas_das_turmas_do_docente()))
      with check (matricula_id in (select public.school_matriculas_das_turmas_do_docente()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_frequencia'::regclass and polname='docente_apaga_frequencia') then
    create policy docente_apaga_frequencia on public.school_frequencia for delete to authenticated
      using (matricula_id in (select public.school_matriculas_das_turmas_do_docente()));
  end if;

  -- Avaliacoes
  if not exists (select 1 from pg_policy where polrelid='public.school_avaliacoes'::regclass and polname='docente_lanca_avaliacoes') then
    create policy docente_lanca_avaliacoes on public.school_avaliacoes for insert to authenticated
      with check (turma_id in (select public.school_turmas_do_docente()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_avaliacoes'::regclass and polname='docente_corrige_avaliacoes') then
    create policy docente_corrige_avaliacoes on public.school_avaliacoes for update to authenticated
      using (turma_id in (select public.school_turmas_do_docente()))
      with check (turma_id in (select public.school_turmas_do_docente()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_avaliacoes'::regclass and polname='docente_apaga_avaliacoes') then
    create policy docente_apaga_avaliacoes on public.school_avaliacoes for delete to authenticated
      using (turma_id in (select public.school_turmas_do_docente()));
  end if;

  -- Materiais
  if not exists (select 1 from pg_policy where polrelid='public.school_materiais'::regclass and polname='docente_publica_materiais') then
    create policy docente_publica_materiais on public.school_materiais for insert to authenticated
      with check (turma_id in (select public.school_turmas_do_docente()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_materiais'::regclass and polname='docente_gere_materiais') then
    create policy docente_gere_materiais on public.school_materiais for update to authenticated
      using (turma_id in (select public.school_turmas_do_docente()))
      with check (turma_id in (select public.school_turmas_do_docente()));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_materiais'::regclass and polname='docente_remove_materiais') then
    create policy docente_remove_materiais on public.school_materiais for delete to authenticated
      using (turma_id in (select public.school_turmas_do_docente()));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3) Uma presenca por aula e por matricula
--
--    Sem isto, lancar a chamada duas vezes no mesmo dia contava duas aulas e
--    estragava a percentagem de assiduidade que o aluno ve no portal.
-- -----------------------------------------------------------------------------
delete from public.school_frequencia a
using public.school_frequencia b
where a.ctid < b.ctid and a.matricula_id = b.matricula_id and a.data_aula = b.data_aula;

create unique index if not exists uq_frequencia_aula
  on public.school_frequencia(matricula_id, data_aula);
