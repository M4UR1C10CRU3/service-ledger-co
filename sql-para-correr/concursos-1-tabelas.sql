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

