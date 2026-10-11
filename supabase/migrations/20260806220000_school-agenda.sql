-- =============================================================================
-- Calendarizacao do Clariza School
--
-- Regra: a equipa da escola (diretor pedagogico, administrador, assistente) ve
-- a calendarizacao toda — turmas, cursos, formacoes corporativas. O instrutor ve
-- apenas os SEUS compromissos. O aluno ve as turmas em que anda.
--
-- O ambito e decidido AQUI, no servidor, e nao no ecra. As politicas de leitura
-- das turmas sao propositadamente largas (o catalogo da escola tem de ser
-- visivel para alguem se inscrever), por isso filtrar so na interface deixaria
-- a agenda de um instrutor a um pedido de distancia da agenda de outro.
-- =============================================================================

create or replace function public.school_agenda(
  p_desde date default (current_date - interval '30 days')::date,
  p_ate   date default (current_date + interval '180 days')::date
)
returns table (
  id            uuid,
  tipo          text,
  titulo        text,
  curso_nome    text,
  inicio        date,
  fim           date,
  local         text,
  estado        text,
  docente_nome  text,
  n_alunos      integer,
  cliente_nome  text,
  papel         text
)
language sql stable security definer set search_path = public as $$
  with quem as (
    select
      -- Escolas que esta pessoa gere
      array(select e.empresa_id from public.school_equipa e
            where e.auth_user_id = auth.uid() and e.ativo = true) as empresas_geridas,
      -- Fichas de instrutor e de aluno desta conta
      array(select d.id from public.school_docentes d where d.auth_user_id = auth.uid()) as docentes,
      array(select a.id from public.school_alunos   a where a.auth_user_id = auth.uid()) as alunos
  )
  select
    t.id,
    'turma'::text,
    t.titulo,
    c.nome,
    t.inicio,
    t.fim,
    t.local,
    t.status,
    d.nome,
    (select count(*)::int from public.school_matriculas m where m.turma_id = t.id),
    -- Formacao contratada por uma empresa: mostra-se de quem e.
    (select string_agg(distinct cc.nome, ', ')
       from public.school_matriculas m
       join public.school_alunos al on al.id = m.aluno_id
       join public.school_clientes_corp cc on cc.id = al.cliente_corp_id
      where m.turma_id = t.id),
    case
      when t.empresa_id = any(q.empresas_geridas) then 'gestao'
      when t.docente_id = any(q.docentes)         then 'instrutor'
      else 'aluno'
    end
  from public.school_turmas t
  cross join quem q
  left join public.school_cursos   c on c.id = t.curso_id
  left join public.school_docentes d on d.id = t.docente_id
  where coalesce(t.inicio, t.fim, current_date) between p_desde and p_ate
    and (
      -- Gere a escola: ve tudo o que nela acontece
      t.empresa_id = any(q.empresas_geridas)
      -- Instrutor: so as suas
      or t.docente_id = any(q.docentes)
      -- Aluno: so aquelas em que anda
      or exists (
        select 1 from public.school_matriculas m
        where m.turma_id = t.id and m.aluno_id = any(q.alunos)
      )
    )
  order by t.inicio nulls last, t.titulo;
$$;

comment on function public.school_agenda(date, date) is
  'Agenda da escola, ja filtrada por quem pergunta: a equipa ve tudo, o instrutor as suas turmas, o aluno aquelas em que anda.';

grant execute on function public.school_agenda(date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- Assinatura de calendario (Google Agenda, Outlook, Apple)
--
-- Um segredo por pessoa. A subscricao de um calendario e feita por um endereco
-- que o Google visita sozinho, sem sessao iniciada — por isso o segredo E a
-- credencial, e tem de poder ser trocado se alguem o partilhar por engano.
-- -----------------------------------------------------------------------------
create table if not exists public.school_agenda_tokens (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  criado_em    timestamptz not null default now(),
  ultimo_uso   timestamptz
);

alter table public.school_agenda_tokens enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polrelid='public.school_agenda_tokens'::regclass and polname='agenda_token_proprio') then
    create policy agenda_token_proprio on public.school_agenda_tokens for all to authenticated
      using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
  end if;
end $$;

/** Devolve o segredo desta pessoa, criando-o na primeira vez. */
create or replace function public.school_agenda_token()
returns text language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if auth.uid() is null then raise exception 'sem sessao iniciada'; end if;

  insert into public.school_agenda_tokens (auth_user_id)
  values (auth.uid())
  on conflict (auth_user_id) do nothing;

  select token into v_token from public.school_agenda_tokens where auth_user_id = auth.uid();
  return v_token;
end;
$$;

/** Troca o segredo. Usar quando o endereco tiver sido partilhado por engano. */
create or replace function public.school_agenda_token_renovar()
returns text language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if auth.uid() is null then raise exception 'sem sessao iniciada'; end if;
  update public.school_agenda_tokens
  set token = encode(gen_random_bytes(24), 'hex'), criado_em = now()
  where auth_user_id = auth.uid()
  returning token into v_token;
  return v_token;
end;
$$;

grant execute on function public.school_agenda_token()          to authenticated;
grant execute on function public.school_agenda_token_renovar()  to authenticated;
