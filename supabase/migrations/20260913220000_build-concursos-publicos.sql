-- =============================================================================
-- Clariza Build — Concursos Públicos (fase 1)
--
-- Pedido a 2026-09-13 pela Obrajusta II. Um concurso é um cartão do Quadro do
-- tipo 'concursos' (doc_tipo = 'concurso'), com três tabelas próprias:
--   cp_concursos    os factos do concurso e a decisão
--   cp_mapa_itens   o mapa de quantidades, com o preço unitário nosso
--   cp_documentos   a checklist do art. 9.º e o estado de cada documento
--
-- Regras que vieram do processo real (pacote OJMEC 105/2025, Fomento):
--   * entre versões do mapa a Câmara RENUMERA os artigos — o código não é
--     chave; o emparelhamento faz-se pela descrição (guardamos codigo_v1);
--   * as certidões (registo comercial, RCBE, alvará) NÃO se guardam aqui — a
--     checklist só lembra; quem as anexa atualizadas é quem valida;
--   * o preço de um concurso é a memória do seguinte (origem_preco).
--
-- Nada do que já existe é alterado. Só se acrescenta.
-- =============================================================================

-- 1) O concurso ----------------------------------------------------------------
create table if not exists public.cp_concursos (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references public.empresas(id) on delete cascade,
  cartao_id              uuid references public.quadro_cartoes(id) on delete set null,
  referencia_interna     text,                 -- OJMEC 105/2025
  versao                 integer not null default 1,
  versao_anterior_id     uuid references public.cp_concursos(id) on delete set null,
  -- entidade adjudicante
  entidade_nome          text not null,
  entidade_nipc          text,
  entidade_referencia    text,                 -- CP1389DAG
  cliente_id             uuid references public.clientes(id) on delete set null,
  -- o objeto
  designacao             text not null,
  tipo_procedimento      text,                 -- concurso público, consulta prévia…
  tipo_contrato          text,                 -- empreitada de obras públicas
  cpv                    text,
  local_execucao         text,
  -- números
  preco_base             numeric(14,2),
  prazo_execucao_dias    integer,
  caucao_pct             numeric(5,2),
  criterio_adjudicacao   text,
  fundos_eu              boolean,
  -- o anúncio e a plataforma
  anuncio_numero         text,
  anuncio_data           date,
  plataforma             text,
  url_pecas              text,
  prazo_propostas        timestamptz,
  prazo_manutencao_dias  integer,
  habilitacao            text,                 -- alvará exigido
  -- o nosso lado
  estado                 text not null default 'detetado',
  decisao                text check (decisao in ('avancar','declinar')),
  decisao_motivo         text,
  decisao_em             timestamptz,
  decisao_por            text,
  preco_proposto         numeric(14,2),
  proposta_numero        text,
  submetido_em           timestamptz,
  resultado              text,                 -- adjudicado | nao_adjudicado | anulado | republicado
  resultado_em           timestamptz,
  notas                  text,
  criado_por             uuid references auth.users(id),
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);
create index if not exists cp_concursos_empresa_idx on public.cp_concursos(empresa_id, estado);
create index if not exists cp_concursos_cartao_idx  on public.cp_concursos(cartao_id);

-- 2) O mapa de quantidades ----------------------------------------------------
create table if not exists public.cp_mapa_itens (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  concurso_id      uuid not null references public.cp_concursos(id) on delete cascade,
  codigo           text not null,              -- 0.1.1
  nivel            text not null check (nivel in ('capitulo','artigo','item')),
  descricao        text not null,
  unidade          text,
  quantidade       numeric(14,3),
  preco_previo     numeric(14,2),              -- proposta prévia (aproximado)
  preco_unitario   numeric(14,2),              -- preço real
  origem_preco     text,                       -- reutilizado | qtd_alterada | novo | manual
  codigo_v1        text,                       -- o código que este item tinha na versão anterior
  quantidade_v1    numeric(14,3),
  posicao          integer not null default 0,
  notas            text
);
create index if not exists cp_mapa_concurso_idx on public.cp_mapa_itens(concurso_id, posicao);

-- 3) A checklist de documentos ------------------------------------------------
create table if not exists public.cp_documentos (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  concurso_id      uuid not null references public.cp_concursos(id) on delete cascade,
  alinea           text,                       -- a) … l)
  nome             text not null,
  familia          text not null check (familia in ('standing','modelo','especifico')),
  depende_do_preco boolean not null default false,
  estado           text not null default 'por_fazer'
                   check (estado in ('por_fazer','gerado','validado','assinado','submetido','nao_aplicavel')),
  anexo_id         uuid references public.cartao_anexos(id) on delete set null,
  validado_por     text,
  validado_em      timestamptz,
  assinado_em      timestamptz,
  posicao          integer not null default 0,
  notas            text
);
create index if not exists cp_documentos_concurso_idx on public.cp_documentos(concurso_id, posicao);

-- 4) Segurança — sempre user_has_empresa_access, nunca auth.uid() is not null
alter table public.cp_concursos   enable row level security;
alter table public.cp_mapa_itens  enable row level security;
alter table public.cp_documentos  enable row level security;

drop policy if exists cp_concursos_empresa on public.cp_concursos;
create policy cp_concursos_empresa on public.cp_concursos
  for all using (user_has_empresa_access(empresa_id))
  with check (user_has_empresa_access(empresa_id));

drop policy if exists cp_mapa_empresa on public.cp_mapa_itens;
create policy cp_mapa_empresa on public.cp_mapa_itens
  for all using (user_has_empresa_access(empresa_id))
  with check (user_has_empresa_access(empresa_id));

drop policy if exists cp_documentos_empresa on public.cp_documentos;
create policy cp_documentos_empresa on public.cp_documentos
  for all using (user_has_empresa_access(empresa_id))
  with check (user_has_empresa_access(empresa_id));

-- 5) O tipo de quadro ----------------------------------------------------------
insert into public.quadro_modelos (codigo, nome, tipo, descricao, doc_tipo, ordem) values
  ('concursos', 'Concursos Públicos', 'concursos',
   'Do anúncio à adjudicação: análise, decisão, documentos, submissão.', 'concurso', 6)
on conflict (codigo) do nothing;

insert into public.quadro_modelo_listas
  (modelo_codigo, estado_codigo, nome, cor, posicao, campos_obrigatorios, final, bloqueada) values
  ('concursos','detetado',        'Detetado',           '#94a3b8', 0, '[]'::jsonb, false, false),
  ('concursos','proposta_previa', 'Proposta prévia',    '#f59e0b', 1, '[]'::jsonb, false, false),
  ('concursos','decisao',         'Decisão',            '#ef4444', 2, '[]'::jsonb, false, false),
  ('concursos','precos_reais',    'Preços reais',       '#6366f1', 3, '[]'::jsonb, false, false),
  ('concursos','plano_execucao',  'Plano de execução',  '#8b5cf6', 4, '[]'::jsonb, false, false),
  ('concursos','documentos',      'Documentos',         '#0ea5e9', 5, '[]'::jsonb, false, false),
  ('concursos','validacao',       'Validação',          '#14b8a6', 6, '[]'::jsonb, false, false),
  ('concursos','assinatura',      'Assinatura',         '#22c55e', 7, '[]'::jsonb, false, false),
  ('concursos','submetido',       'Submetido',          '#16a34a', 8, '[]'::jsonb, false, false),
  ('concursos','resultado',       'Resultado',          '#334155', 9, '[]'::jsonb, true,  false),
  ('concursos','arquivado',       'Arquivado',          '#64748b',10, '[]'::jsonb, true,  false)
on conflict (modelo_codigo, estado_codigo) do nothing;
