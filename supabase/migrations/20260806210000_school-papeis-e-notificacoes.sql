-- =============================================================================
-- Papeis do Clariza School e notificacoes por pessoa
--
-- Regra do ITC: matricular, validar o ingresso numa turma, atribuir pagamentos
-- e criar turmas sao actos da secretaria. So tres funcoes os podem praticar:
--   · Diretor Pedagogico
--   · Administrador do ITC
--   · Assistente Adm-Pedagogico
--
-- O instrutor NAO cria turmas. E avisado quando uma turma e criada com ele como
-- responsavel, para organizar a agenda — e lanca presencas e notas nas suas.
--
-- Ate agora qualquer utilizador com acesso a empresa podia escrever em tudo.
-- Isto e uma restricao real, por isso a equipa actual e inscrita primeiro, para
-- ninguem ficar do lado de fora.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) A equipa da escola
-- -----------------------------------------------------------------------------
create table if not exists public.school_equipa (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  nome         text not null,
  email        text,
  papel        text not null check (papel in ('diretor_pedagogico', 'administrador', 'assistente')),
  ativo        boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_school_equipa_auth on public.school_equipa(auth_user_id) where auth_user_id is not null;
create unique index if not exists uq_school_equipa_email
  on public.school_equipa(empresa_id, lower(trim(email))) where email is not null;

alter table public.school_equipa enable row level security;

comment on table public.school_equipa is
  'Quem gere a escola. Os tres papeis aqui inscritos sao os unicos que criam turmas, validam matriculas e atribuem pagamentos.';

-- -----------------------------------------------------------------------------
-- 2) Quem pode gerir
-- -----------------------------------------------------------------------------
create or replace function public.school_pode_gerir(p_empresa_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.school_equipa e
    where e.empresa_id = p_empresa_id
      and e.auth_user_id = auth.uid()
      and e.ativo = true
  )
$$;

create or replace function public.school_papel_do_utilizador(p_empresa_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select e.papel from public.school_equipa e
  where e.empresa_id = p_empresa_id and e.auth_user_id = auth.uid() and e.ativo = true
  limit 1
$$;

grant execute on function public.school_pode_gerir(uuid)           to authenticated;
grant execute on function public.school_papel_do_utilizador(uuid)  to authenticated;

-- A equipa ve-se a si propria; quem ja tinha acesso a empresa continua a gerir.
do $$
begin
  if not exists (select 1 from pg_policy where polrelid='public.school_equipa'::regclass and polname='school_equipa_interno') then
    create policy school_equipa_interno on public.school_equipa for all to authenticated
      using (public.user_has_empresa_access(empresa_id))
      with check (public.user_has_empresa_access(empresa_id));
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_equipa'::regclass and polname='school_equipa_propria') then
    create policy school_equipa_propria on public.school_equipa for select to authenticated
      using (auth_user_id = auth.uid());
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3) Inscrever quem ja gere o ITC hoje
--    Sem isto, a restricao seguinte deixava a escola sem ninguem que a possa
--    administrar.
-- -----------------------------------------------------------------------------
insert into public.school_equipa (empresa_id, auth_user_id, nome, email, papel)
select lue.empresa_id, lu.auth_user_id, lu.nome, lu.email, 'administrador'
from public.liberty_utilizadores lu
join public.liberty_utilizador_empresas lue on lue.utilizador_id = lu.id
where lue.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and lu.auth_user_id is not null
  and not exists (
    select 1 from public.school_equipa e
    where e.empresa_id = lue.empresa_id and e.auth_user_id = lu.auth_user_id
  );

-- O Diretor Pedagogico do ITC ja esta identificado no certificado.
insert into public.school_equipa (empresa_id, nome, papel)
select 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b', e.nome_diretor, 'diretor_pedagogico'
from public.empresas e
where e.id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
  and e.nome_diretor is not null
  and not exists (
    select 1 from public.school_equipa se
    where se.empresa_id = e.id and se.papel = 'diretor_pedagogico'
  );

-- -----------------------------------------------------------------------------
-- 4) Restringir os actos de secretaria
--
--    A politica antiga era FOR ALL: quem tinha a empresa fazia tudo. Passa a
--    LEITURA para quem tem a empresa, e ESCRITA so para a equipa da escola.
--    Os instrutores continuam a ler as suas turmas pelas politicas de portal,
--    mas deixam de as poder criar ou alterar.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['school_turmas', 'school_matriculas', 'school_inscricoes'] loop
    -- Substitui a politica FOR ALL por leitura + escrita separadas.
    execute format('drop policy if exists %I on public.%I', format('school_%s_empresa', t), t);
    execute format('drop policy if exists %I on public.%I', format('%s_interno', t), t);

    if not exists (
      select 1 from pg_policy
      where polrelid = format('public.%I', t)::regclass and polname = format('%s_leitura_interna', t)
    ) then
      execute format($f$
        create policy %I on public.%I for select to authenticated
        using (public.user_has_empresa_access(empresa_id))
      $f$, format('%s_leitura_interna', t), t);
    end if;

    if not exists (
      select 1 from pg_policy
      where polrelid = format('public.%I', t)::regclass and polname = format('%s_gestao', t)
    ) then
      execute format($f$
        create policy %I on public.%I for all to authenticated
        using (public.school_pode_gerir(empresa_id))
        with check (public.school_pode_gerir(empresa_id))
      $f$, format('%s_gestao', t), t);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 5) Notificacoes por pessoa
--
--    notificacoes_internas ja existia mas e endereçada a um PERFIL
--    (perfil_destino), nao a uma pessoa — nao serve para avisar um instrutor em
--    concreto. Esta e por destinatario.
-- -----------------------------------------------------------------------------
create table if not exists public.school_notificacoes (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  destinatario  uuid not null references auth.users(id) on delete cascade,
  tipo          text not null,
  titulo        text not null,
  mensagem      text,
  link          text,
  referencia_id uuid,
  lida          boolean not null default false,
  criada_em     timestamptz not null default now(),
  lida_em       timestamptz
);

create index if not exists idx_school_notif_destinatario
  on public.school_notificacoes(destinatario, lida, criada_em desc);

alter table public.school_notificacoes enable row level security;

do $$
begin
  -- Cada um ve e marca como lidas as suas. Ninguem le as de outro.
  if not exists (select 1 from pg_policy where polrelid='public.school_notificacoes'::regclass and polname='notif_proprias_ler') then
    create policy notif_proprias_ler on public.school_notificacoes for select to authenticated
      using (destinatario = auth.uid());
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_notificacoes'::regclass and polname='notif_proprias_marcar') then
    create policy notif_proprias_marcar on public.school_notificacoes for update to authenticated
      using (destinatario = auth.uid()) with check (destinatario = auth.uid());
  end if;

  if not exists (select 1 from pg_policy where polrelid='public.school_notificacoes'::regclass and polname='notif_gestao') then
    create policy notif_gestao on public.school_notificacoes for all to authenticated
      using (public.school_pode_gerir(empresa_id))
      with check (public.school_pode_gerir(empresa_id));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 6) Avisar o instrutor quando lhe atribuem uma turma
--
--    SECURITY DEFINER: quem cria a turma e a secretaria, e ela nao tem — nem
--    deve ter — permissao para escrever na caixa de outra pessoa.
-- -----------------------------------------------------------------------------
create or replace function public.school_notificar_docente_turma()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conta uuid;
  v_curso text;
begin
  if new.docente_id is null then return new; end if;
  -- Só quando o docente muda, para uma edição de local ou vagas não voltar a avisar.
  if tg_op = 'UPDATE' and old.docente_id is not distinct from new.docente_id then return new; end if;

  select d.auth_user_id into v_conta from public.school_docentes d where d.id = new.docente_id;
  if v_conta is null then return new; end if;   -- ainda sem acesso ao portal

  select c.nome into v_curso from public.school_cursos c where c.id = new.curso_id;

  insert into public.school_notificacoes (empresa_id, destinatario, tipo, titulo, mensagem, link, referencia_id)
  values (
    new.empresa_id, v_conta, 'turma_atribuida',
    'Nova turma atribuída',
    coalesce(v_curso, 'Formação') || ' — ' || coalesce(new.titulo, 'turma') ||
      case when new.inicio is not null
      then ', de ' || to_char(new.inicio, 'DD/MM/YYYY') ||
           coalesce(' a ' || to_char(new.fim, 'DD/MM/YYYY'), '')
      else '' end || '.',
    '/portal/instrutor', new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_school_notificar_docente on public.school_turmas;
create trigger trg_school_notificar_docente
  after insert or update of docente_id on public.school_turmas
  for each row execute function public.school_notificar_docente_turma();

-- -----------------------------------------------------------------------------
-- 7) Fechar a leitura das notificacoes do ERP a quem vem dos portais
--
--    notificacoes_internas tinha uma politica `true`: qualquer autenticado lia
--    as notificacoes de todas as empresas. Enquanto so havia pessoal interno era
--    um risco adormecido; com formandos e empresas clientes a entrar, deixa de
--    ser. Quem e interno continua a ver o mesmo.
-- -----------------------------------------------------------------------------
drop policy if exists notificacoes_internas_all on public.notificacoes_internas;

do $$
begin
  if not exists (select 1 from pg_policy where polrelid='public.notificacoes_internas'::regclass and polname='notificacoes_internas_leitura') then
    create policy notificacoes_internas_leitura on public.notificacoes_internas for select to authenticated
      using (public.e_utilizador_interno());
  end if;
end $$;
