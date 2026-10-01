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
