-- =============================================================================
-- Motor de certificados do Clariza School
--
-- Traz para o Clariza o que o ITC Educa PRO ja fazia bem, corrigindo tres
-- fragilidades que essa versao tinha:
--
--   1. La o certificado era so um conjunto de chaves estrangeiras. Se o curso
--      fosse editado, os certificados ja emitidos mudavam de conteudo. Um
--      documento com valor legal nao pode reescrever-se sozinho: passa a
--      guardar um INSTANTANEO do que foi certificado.
--
--   2. La a politica RLS era "anon pode ler tudo", o que permitia descarregar
--      a lista completa de formandos sem sequer saber um codigo. Aqui a tabela
--      continua fechada e a verificacao publica passa por uma funcao que
--      devolve apenas os campos publicos, de um certificado de cada vez.
--
--   3. La o codigo era sequencial (ITC-2026-00000131), portanto adivinhavel.
--      Passa a ser aleatorio sobre um alfabeto sem caracteres ambiguos.
--
-- Esta migracao e puramente aditiva: nao altera nem remove nada existente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Configuracao do certificado por empresa
--    Fica em `empresas`, junto do resto da identidade visual do inquilino
--    (logo_path, cores, nome_diretor, assinatura_diretor_path ja la estavam).
-- -----------------------------------------------------------------------------
alter table public.empresas
  add column if not exists cert_prefixo             text,
  add column if not exists cert_arte_frente_path    text,
  add column if not exists cert_arte_verso_path     text,
  add column if not exists cert_texto_institucional text,
  add column if not exists cert_rodape              text,
  add column if not exists cert_url_verificacao     text,
  add column if not exists cert_cargo_diretor       text;

comment on column public.empresas.cert_prefixo is
  'Prefixo do codigo do certificado, ex. ITC. Sem prefixo usa-se o slug em maiusculas.';
comment on column public.empresas.cert_arte_frente_path is
  'Arte de fundo da pagina 1 (so logotipos e decoracao; todo o texto e desenhado pelo codigo).';

-- Configuracao do ITC a partir do modelo aprovado.
update public.empresas set
  cert_prefixo             = coalesce(cert_prefixo, 'ITC'),
  cert_arte_frente_path    = coalesce(cert_arte_frente_path, '/assets/certificado/itc/cert_page_1_branco.png'),
  cert_arte_verso_path     = coalesce(cert_arte_verso_path,  '/assets/certificado/itc/cert_page_2a_branco.png'),
  cert_texto_institucional = coalesce(cert_texto_institucional, 'Instituto de Treinamentos e resgate do Amapá - ITC'),
  cert_rodape              = coalesce(cert_rodape, 'Instituto de Treinamentos e Resgate do Amapá – ITC · CNPJ 53.827.322/0001-75 · Macapá, AP · www.itctreinamentos.com'),
  cert_url_verificacao     = coalesce(cert_url_verificacao, 'www.itctreinamentos.com'),
  cert_cargo_diretor       = coalesce(cert_cargo_diretor, 'Diretor Pedagógico'),
  nome_diretor             = coalesce(nome_diretor, 'Renevaldo Machado Cavalcante')
where id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b';

-- -----------------------------------------------------------------------------
-- 2) Instantaneo do certificado
--    Tudo o que estiver impresso no PDF passa a estar tambem congelado na
--    linha. Alterar o curso amanha nao reescreve o que ja foi certificado.
-- -----------------------------------------------------------------------------
alter table public.school_certificados
  add column if not exists aluno_nome            text,
  add column if not exists aluno_cpf             text,
  add column if not exists curso_id              uuid references public.school_cursos(id),
  add column if not exists curso_nome            text,
  add column if not exists curso_categoria       text,
  add column if not exists carga_horaria         integer,
  add column if not exists horas_teoricas        integer,
  add column if not exists horas_praticas        integer,
  add column if not exists modulos_json          jsonb,
  add column if not exists objetivo              text,
  add column if not exists metodologia           text,
  add column if not exists reconhecimento        text,
  add column if not exists aprovacao_minima      integer,
  add column if not exists validade_meses        integer,
  add column if not exists docente_nome          text,
  add column if not exists docente_assinatura    text,
  add column if not exists diretor_nome          text,
  add column if not exists diretor_assinatura    text,
  add column if not exists diretor_cargo         text,
  add column if not exists empresa_nome          text,
  add column if not exists local_aplicacao       text,
  add column if not exists data_inicio           date,
  add column if not exists data_conclusao        date,
  add column if not exists status                text not null default 'emitido',
  add column if not exists cancelado_em          timestamptz,
  add column if not exists cancelado_motivo      text,
  add column if not exists segunda_via           boolean not null default false,
  add column if not exists emitido_por_id        uuid,
  add column if not exists emitido_por_nome      text,
  add column if not exists sequencial            integer;

comment on column public.school_certificados.modulos_json is
  'Conteudo programatico tal como estava a data da emissao. Copia, nao referencia.';
comment on column public.school_certificados.status is
  'emitido | cancelado. Um certificado cancelado deixa de validar publicamente.';

create index if not exists idx_school_cert_status on public.school_certificados(status, validade_em);

-- -----------------------------------------------------------------------------
-- 3) Codificacao: sequencial interno + codigo publico nao adivinhavel
-- -----------------------------------------------------------------------------
create table if not exists public.school_certificados_seq (
  empresa_id uuid    not null references public.empresas(id) on delete cascade,
  ano        integer not null,
  ultimo_seq integer not null default 0,
  primary key (empresa_id, ano)
);

alter table public.school_certificados_seq enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.school_certificados_seq'::regclass
      and polname  = 'school_cert_seq_empresa'
  ) then
    create policy school_cert_seq_empresa on public.school_certificados_seq
      for all using (public.user_has_empresa_access(empresa_id))
      with check (public.user_has_empresa_access(empresa_id));
  end if;
end $$;

-- Alfabeto sem caracteres ambiguos: nada de 0/O nem 1/I/L, porque o codigo e
-- transcrito a mao de um papel para um formulario.
create or replace function public.school_gerar_codigo_certificado(p_empresa_id uuid)
returns table (codigo text, sequencial integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ano      integer := extract(year from current_date);
  v_seq      integer;
  v_prefixo  text;
  v_alfabeto text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_codigo   text;
  v_i        integer;
  v_tent     integer := 0;
begin
  if not public.user_has_empresa_access(p_empresa_id) then
    raise exception 'sem acesso a esta empresa';
  end if;

  select coalesce(nullif(e.cert_prefixo, ''), upper(left(regexp_replace(e.slug, '[^a-zA-Z]', '', 'g'), 4)))
    into v_prefixo
  from public.empresas e where e.id = p_empresa_id;

  if v_prefixo is null or v_prefixo = '' then
    v_prefixo := 'CERT';
  end if;

  -- Sequencial atomico: dois pedidos simultaneos nunca recebem o mesmo numero.
  insert into public.school_certificados_seq (empresa_id, ano, ultimo_seq)
  values (p_empresa_id, v_ano, 1)
  on conflict (empresa_id, ano) do update
    set ultimo_seq = public.school_certificados_seq.ultimo_seq + 1
  returning public.school_certificados_seq.ultimo_seq into v_seq;

  -- Codigo publico aleatorio, com nova tentativa em caso de colisao.
  loop
    v_tent := v_tent + 1;
    v_codigo := v_prefixo || '-' || v_ano || '-';
    for v_i in 1..6 loop
      v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;

    exit when not exists (
      select 1 from public.school_certificados c where c.codigo = v_codigo
    );

    if v_tent > 50 then
      raise exception 'nao foi possivel gerar um codigo unico';
    end if;
  end loop;

  codigo     := v_codigo;
  sequencial := v_seq;
  return next;
end;
$$;

revoke all on function public.school_gerar_codigo_certificado(uuid) from public, anon;
grant execute on function public.school_gerar_codigo_certificado(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4) Verificacao publica de autenticidade
--
--    A tabela continua fechada. Quem nao tem sessao chega aqui e so consegue
--    o que precisa para confirmar um certificado que ja tem na mao: um de cada
--    vez, pelo codigo exato, com o CPF mascarado. Sem correspondencia
--    aproximada -- um codigo errado devolve vazio, nunca outro certificado.
-- -----------------------------------------------------------------------------
create or replace function public.school_verificar_certificado(p_codigo text)
returns table (
  codigo           text,
  valido           boolean,
  vencido          boolean,
  cancelado        boolean,
  aluno_nome       text,
  aluno_cpf        text,
  curso_nome       text,
  carga_horaria    integer,
  reconhecimento   text,
  docente_nome     text,
  data_inicio      date,
  data_conclusao   date,
  emitido_em       date,
  validade_em      date,
  emissor_nome     text,
  local_aplicacao  text
)
language sql
stable
security definer
set search_path = public
as $$
  with alvo as (
    select c.*
    from public.school_certificados c
    where upper(regexp_replace(c.codigo, '\s', '', 'g')) =
          upper(regexp_replace(translate(coalesce(p_codigo, ''), '‐‑‒–—−', '------'), '\s', '', 'g'))
    limit 1
  )
  select
    a.codigo,
    a.status = 'emitido'
      and (a.validade_em is null or a.validade_em >= current_date)              as valido,
    a.validade_em is not null and a.validade_em < current_date                  as vencido,
    a.status = 'cancelado'                                                      as cancelado,
    coalesce(a.aluno_nome, al.nome)                                             as aluno_nome,
    -- CPF mascarado: chega para o titular se reconhecer, nao chega para copiar.
    case
      when length(regexp_replace(coalesce(a.aluno_cpf, al.cpf, ''), '\D', '', 'g')) = 11
      then substr(regexp_replace(coalesce(a.aluno_cpf, al.cpf), '\D', '', 'g'), 1, 3)
           || '.***.***-'
           || substr(regexp_replace(coalesce(a.aluno_cpf, al.cpf), '\D', '', 'g'), 10, 2)
      else null
    end                                                                         as aluno_cpf,
    coalesce(a.curso_nome, cu.nome)                                             as curso_nome,
    coalesce(a.carga_horaria, cu.carga_horaria)                                 as carga_horaria,
    coalesce(a.reconhecimento, cu.reconhecimento)                               as reconhecimento,
    coalesce(a.docente_nome, d.nome)                                            as docente_nome,
    coalesce(a.data_inicio, t.inicio)                                           as data_inicio,
    coalesce(a.data_conclusao, t.fim)                                           as data_conclusao,
    a.emitido_em::date                                                          as emitido_em,
    coalesce(a.validade_em, a.validade)                                         as validade_em,
    coalesce(a.empresa_nome, e.nome)                                            as emissor_nome,
    coalesce(a.local_aplicacao, t.empresa_aplicacao)                            as local_aplicacao
  from alvo a
  left join public.school_alunos   al on al.id = a.aluno_id
  left join public.school_turmas   t  on t.id  = a.turma_id
  left join public.school_cursos   cu on cu.id = coalesce(a.curso_id, t.curso_id)
  left join public.school_docentes d  on d.id  = coalesce(a.docente_id, t.docente_id)
  left join public.empresas        e  on e.id  = a.empresa_id;
$$;

comment on function public.school_verificar_certificado(text) is
  'Verificacao publica de autenticidade. Unico ponto de acesso anonimo aos certificados: um por chamada, pelo codigo exato, CPF mascarado.';

grant execute on function public.school_verificar_certificado(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5) PDFs no Storage (bucket privado school-certificados, ja existente)
--    Leitura e escrita apenas para quem tem acesso a empresa; o primeiro
--    segmento do caminho e o empresa_id.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'storage.objects'::regclass
      and polname  = 'school_cert_ler'
  ) then
    create policy school_cert_ler on storage.objects for select to authenticated
      using (
        bucket_id = 'school-certificados'
        and public.user_has_empresa_access(((storage.foldername(name))[1])::uuid)
      );
  end if;

  if not exists (
    select 1 from pg_policy
    where polrelid = 'storage.objects'::regclass
      and polname  = 'school_cert_escrever'
  ) then
    create policy school_cert_escrever on storage.objects for insert to authenticated
      with check (
        bucket_id = 'school-certificados'
        and public.user_has_empresa_access(((storage.foldername(name))[1])::uuid)
      );
  end if;

  if not exists (
    select 1 from pg_policy
    where polrelid = 'storage.objects'::regclass
      and polname  = 'school_cert_substituir'
  ) then
    create policy school_cert_substituir on storage.objects for update to authenticated
      using (
        bucket_id = 'school-certificados'
        and public.user_has_empresa_access(((storage.foldername(name))[1])::uuid)
      );
  end if;
end $$;
