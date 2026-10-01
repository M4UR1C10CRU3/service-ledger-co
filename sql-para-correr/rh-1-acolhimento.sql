-- Recursos Humanos › Acolhimento (onboarding) e período experimental.
-- Liga o recrutamento (candidato aprovado) ao colaborador e às avaliações experimentais.
-- Não toca em nenhuma tabela existente.

create table if not exists public.rh_acolhimentos (
  id                         uuid primary key default gen_random_uuid(),
  empresa_id                 uuid not null references public.empresas(id),
  colaborador_id             uuid not null references public.employees(id) on delete cascade,
  candidato_id               uuid references public.rh_candidatos(id) on delete set null,
  vaga_id                    uuid references public.rh_vagas(id) on delete set null,
  cargo                      text,
  data_entrada               date not null,
  periodo_experimental_dias  integer not null default 90,
  fim_periodo_experimental   date generated always as (data_entrada + periodo_experimental_dias) stored,
  responsavel_nome           text,
  tutor_nome                 text,
  estado                     text not null default 'em_curso',   -- em_curso | concluido | cessado
  decisao                    text,                                -- continuidade | cessacao
  decisao_em                 date,
  notas                      text,
  criado_por                 uuid,
  criado_em                  timestamptz not null default now(),
  atualizado_em              timestamptz not null default now()
);

create table if not exists public.rh_acolhimento_itens (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas(id),
  acolhimento_id  uuid not null references public.rh_acolhimentos(id) on delete cascade,
  fase            text not null,  -- antes_entrada | primeiro_dia | primeira_semana | primeiro_mes | fim_periodo
  descricao       text not null,
  responsavel     text,
  prazo           date,
  obrigatorio     boolean not null default true,
  feito           boolean not null default false,
  feito_em        timestamptz,
  feito_por_nome  text,
  posicao         integer not null default 0,
  notas           text
);

create index if not exists idx_rh_acolhimentos_empresa on public.rh_acolhimentos(empresa_id, estado);
create index if not exists idx_rh_acolhimentos_colab   on public.rh_acolhimentos(colaborador_id);
create index if not exists idx_rh_acolhimento_itens    on public.rh_acolhimento_itens(acolhimento_id, posicao);

alter table public.rh_acolhimentos       enable row level security;
alter table public.rh_acolhimento_itens  enable row level security;

drop policy if exists rh_acolhimentos_empresa on public.rh_acolhimentos;
create policy rh_acolhimentos_empresa on public.rh_acolhimentos
  for all using (public.user_has_empresa_access(empresa_id))
  with check (public.user_has_empresa_access(empresa_id));

drop policy if exists rh_acolhimento_itens_empresa on public.rh_acolhimento_itens;
create policy rh_acolhimento_itens_empresa on public.rh_acolhimento_itens
  for all using (public.user_has_empresa_access(empresa_id))
  with check (public.user_has_empresa_access(empresa_id));

-- atualizado_em automático (reutiliza a função se já existir no projeto)
create or replace function public.rh_acolhimentos_touch() returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;
drop trigger if exists trg_rh_acolhimentos_touch on public.rh_acolhimentos;
create trigger trg_rh_acolhimentos_touch before update on public.rh_acolhimentos
  for each row execute function public.rh_acolhimentos_touch();
