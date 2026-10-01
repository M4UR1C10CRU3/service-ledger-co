-- =============================================================================
-- QUADROS — modelos para agencia de marketing e producao audiovisual
--
-- Os 6 modelos que existem nasceram dos Workflows antigos e sao de comercio e
-- obra. O "Producao" que la esta e da ORDEM DE SERVICO a faturacao — obra, nao
-- audiovisual. Uma agencia abria o "Novo Quadro" e nao encontrava nada seu.
--
-- Estes modelos sao especificos do vertical Agency. Os transversais (compras,
-- comercial, cobrancas, recebimentos, pagamentos) continuam a aparecer a todos,
-- porque uma agencia tambem compra, vende, fatura e cobra.
--
-- Migracao ADITIVA: acrescenta duas colunas e semeia modelos novos. Nao apaga
-- nem altera nenhum dos modelos existentes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Ambito dos modelos por vertical
--
--    Duas colunas em vez de uma, porque sao duas perguntas diferentes: "e so
--    deste vertical?" e "e de todos MENOS deste?". Uma coluna so obrigava a
--    listar verticais e a mexer nela sempre que nascesse outro.
-- -----------------------------------------------------------------------------
alter table public.quadro_modelos
  add column if not exists vertical         text,
  add column if not exists excepto_vertical text;

comment on column public.quadro_modelos.vertical is
  'NULL = aparece em todos os verticais. Preenchido = so nesse vertical.';
comment on column public.quadro_modelos.excepto_vertical is
  'Vertical onde este modelo NAO deve aparecer. Ex.: a Producao de obra numa agencia.';

-- A Producao de obra deixa de aparecer numa agencia: ficaria ao lado da
-- Producao Audiovisual e as duas confundiam-se pelo nome.
update public.quadro_modelos
   set excepto_vertical = 'agency'
 where codigo = 'producao' and excepto_vertical is null;

-- -----------------------------------------------------------------------------
-- 2) Os modelos novos
--
--    Deliberadamente FORA: um modelo de "conteudo e redes sociais". Esse fluxo
--    ja existe no modulo Marketing (kanban, revisao, aprovacao, agendamento,
--    calendario editorial), aberto ao vertical Agency. Fazer um quadro igual
--    era criar dois sitios para o mesmo trabalho.
-- -----------------------------------------------------------------------------
insert into public.quadro_modelos (codigo, nome, tipo, descricao, doc_tipo, ordem, vertical) values
  ('ag_jobs',      'Jobs da Agência',        'agencia',
   'Os jobs tal como andam no fluxo da agência — do briefing à entrega.',        'ag_job', 10, 'agency'),
  ('ag_audiovis',  'Produção Audiovisual',   'agencia',
   'Da ideia à entrega do vídeo: guião, filmagem, montagem e cor.',              null,     11, 'agency'),
  ('ag_campanha',  'Campanha / Tráfego Pago','agencia',
   'Do briefing ao relatório: verba, criativos, otimização e resultado.',        null,     12, 'agency'),
  ('ag_onboard',   'Onboarding de Cliente',  'agencia',
   'Do contrato assinado ao primeiro plano entregue.',                           null,     13, 'agency')
on conflict (codigo) do nothing;

-- -----------------------------------------------------------------------------
-- 3) As colunas de cada modelo
--
--    `campos_obrigatorios` usa os campos que o cartao tem mesmo: cliente_id,
--    supplier_id, responsavel_id, contacto_email, valor. Pedem-se no momento em
--    que alguem tenta ENTRAR na coluna — nunca num formulario a` cabeca.
-- -----------------------------------------------------------------------------
insert into public.quadro_modelo_listas
  (modelo_codigo, estado_codigo, nome, cor, posicao, campos_obrigatorios, final, bloqueada) values

-- JOBS DA AGENCIA — as mesmas seis etapas do kanban de jobs, para o quadro e o
-- job falarem a mesma lingua. Os codigos batem certo com ag_job_etapas.
('ag_jobs','briefing',  'Briefing',   '#94a3b8',0,'["cliente_id"]'::jsonb,                 false,false),
('ag_jobs','pesquisa',  'Pesquisa',   '#6366f1',1,'["responsavel_id"]'::jsonb,             false,false),
('ag_jobs','criacao',   'Criação',    '#f59e0b',2,'["responsavel_id"]'::jsonb,             false,false),
('ag_jobs','revisao',   'Revisão',    '#06b6d4',3,'[]'::jsonb,                             false,false),
('ag_jobs','aprovacao', 'Aprovação',  '#a855f7',4,'["contacto_email"]'::jsonb,             false,false),
('ag_jobs','concluido', 'Concluído',  '#22c55e',5,'[]'::jsonb,                             true, false),

-- PRODUCAO AUDIOVISUAL — o ingest e backup e uma coluna de propósito: e o
-- passo que toda a gente salta e o unico que, falhando, perde a filmagem toda.
('ag_audiovis','briefing',   'Briefing',            '#94a3b8',0,'["cliente_id"]'::jsonb,        false,false),
('ag_audiovis','guiao',      'Guião / Storyboard',  '#6366f1',1,'["responsavel_id"]'::jsonb,    false,false),
('ag_audiovis','pre',        'Pré-produção',        '#8b5cf6',2,'[]'::jsonb,                    false,false),
('ag_audiovis','filmagem',   'Filmagem',            '#f59e0b',3,'["responsavel_id"]'::jsonb,    false,false),
('ag_audiovis','ingest',     'Ingest e cópia',      '#0ea5e9',4,'[]'::jsonb,                    false,false),
('ag_audiovis','montagem',   'Montagem',            '#06b6d4',5,'["responsavel_id"]'::jsonb,    false,false),
('ag_audiovis','cor_som',    'Cor e som',           '#14b8a6',6,'[]'::jsonb,                    false,false),
('ag_audiovis','rev_cliente','Revisão do cliente',  '#a855f7',7,'["contacto_email"]'::jsonb,    false,false),
('ag_audiovis','entregue',   'Entregue',            '#22c55e',8,'[]'::jsonb,                    true, false),

-- CAMPANHA / TRAFEGO PAGO — a verba e exigida para ENTRAR em "Ativa": e o
-- momento em que se comeca a gastar dinheiro de outra pessoa.
('ag_campanha','briefing',   'Briefing',        '#94a3b8',0,'["cliente_id"]'::jsonb,             false,false),
('ag_campanha','estrategia', 'Estratégia',      '#6366f1',1,'["responsavel_id"]'::jsonb,         false,false),
('ag_campanha','criativos',  'Criativos',       '#f59e0b',2,'[]'::jsonb,                         false,false),
('ag_campanha','setup',      'Configuração',    '#8b5cf6',3,'[]'::jsonb,                         false,false),
('ag_campanha','ativa',      'Ativa',           '#22c55e',4,'["valor"]'::jsonb,                  false,false),
('ag_campanha','otimizacao', 'Otimização',      '#0ea5e9',5,'[]'::jsonb,                         false,false),
('ag_campanha','relatorio',  'Relatório',       '#a855f7',6,'["contacto_email"]'::jsonb,         false,false),
('ag_campanha','encerrada',  'Encerrada',       '#64748b',7,'[]'::jsonb,                         true, false),

-- ONBOARDING DE CLIENTE — os acessos antes do plano: sem credenciais nao se
-- publica nada, e e sempre ai que o arranque encalha.
('ag_onboard','contrato',  'Contrato assinado',  '#94a3b8',0,'["cliente_id","valor"]'::jsonb,   false,false),
('ag_onboard','acessos',   'Acessos e credenciais','#f59e0b',1,'["responsavel_id"]'::jsonb,     false,false),
('ag_onboard','briefing',  'Briefing de marca',  '#6366f1',2,'["contacto_email"]'::jsonb,       false,false),
('ag_onboard','plano',     'Plano inicial',      '#8b5cf6',3,'[]'::jsonb,                        false,false),
('ag_onboard','kickoff',   'Kick-off',           '#06b6d4',4,'[]'::jsonb,                        false,false),
('ag_onboard','ativo',     'Em curso',           '#22c55e',5,'[]'::jsonb,                        true, false)

on conflict (modelo_codigo, estado_codigo) do nothing;
