-- =============================================================================
-- Corrigir recursao infinita entre as politicas dos portais
--
-- Sintoma: "infinite recursion detected in policy for relation school_alunos".
--
-- Causa: duas politicas a saltarem uma para a tabela da outra.
--   school_alunos      (portal do docente) consulta school_matriculas
--   school_matriculas  (portal corporativo) consulta school_alunos
-- Cada consulta reavalia as politicas da tabela de destino, e o Postgres
-- apanha o ciclo.
--
-- Solucao: qualquer salto entre tabelas dentro de uma politica passa por uma
-- funcao SECURITY DEFINER. A funcao le a tabela sem reavaliar politicas, e o
-- ciclo deixa de existir. E a mesma tecnica ja usada em
-- school_turmas_do_docente().
-- =============================================================================

-- Alunos das turmas que este docente lecciona.
create or replace function public.school_alunos_das_turmas_do_docente()
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct m.aluno_id
  from public.school_matriculas m
  where m.turma_id in (
    select t.id from public.school_turmas t
    where t.docente_id in (
      select d.id from public.school_docentes d where d.auth_user_id = auth.uid()
    )
  )
$$;

-- Formandos enviados pelas empresas clientes que esta pessoa representa.
create or replace function public.school_alunos_dos_meus_clientes()
returns setof uuid language sql stable security definer set search_path = public as $$
  select a.id from public.school_alunos a
  where a.cliente_corp_id in (
    select cc.cliente_id from public.school_corp_contactos cc
    where cc.auth_user_id = auth.uid() and cc.ativo = true
  )
$$;

-- Escolas das empresas clientes que representa.
create or replace function public.school_empresas_dos_meus_clientes()
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct c.empresa_id from public.school_clientes_corp c
  where c.id in (
    select cc.cliente_id from public.school_corp_contactos cc
    where cc.auth_user_id = auth.uid() and cc.ativo = true
  )
$$;

grant execute on function public.school_alunos_das_turmas_do_docente() to authenticated;
grant execute on function public.school_alunos_dos_meus_clientes()     to authenticated;
grant execute on function public.school_empresas_dos_meus_clientes()   to authenticated;

-- ── Politicas reescritas sobre as funcoes ───────────────────────────────────
drop policy if exists portal_docente_alunos_das_suas_turmas on public.school_alunos;
create policy portal_docente_alunos_das_suas_turmas on public.school_alunos for select to authenticated
  using (id in (select public.school_alunos_das_turmas_do_docente()));

drop policy if exists corp_matriculas on public.school_matriculas;
create policy corp_matriculas on public.school_matriculas for select to authenticated
  using (aluno_id in (select public.school_alunos_dos_meus_clientes()));

drop policy if exists corp_certificados on public.school_certificados;
create policy corp_certificados on public.school_certificados for select to authenticated
  using (aluno_id in (select public.school_alunos_dos_meus_clientes()));

drop policy if exists corp_turmas on public.school_turmas;
create policy corp_turmas on public.school_turmas for select to authenticated
  using (empresa_id in (select public.school_empresas_dos_meus_clientes()));

drop policy if exists corp_cursos on public.school_cursos;
create policy corp_cursos on public.school_cursos for select to authenticated
  using (empresa_id in (select public.school_empresas_dos_meus_clientes()));

-- Esta nao recorria a outra tabela, mas fica igual as restantes por coerencia.
drop policy if exists corp_seus_formandos on public.school_alunos;
create policy corp_seus_formandos on public.school_alunos for select to authenticated
  using (id in (select public.school_alunos_dos_meus_clientes()));
