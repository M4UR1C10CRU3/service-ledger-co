-- DIAGNÓSTICO DO PILOTO (A) — uso real de cada módulo, por empresa. SÓ LEITURA: não altera nada.
-- Cada célula: nº de registos · data do último registo.
with emp as (
  select id, slug from empresas
  where slug in ('tudocasa','tudocasa-matrizcharme','obrajusta-gestao','obrajusta','resiserv')
),
tab as (
  select c.table_name as t,
         max(case when c.column_name in ('created_at','criado_em') then c.column_name end) as col_data
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name in (
      'pedidos_orcamento','propostas','followup_oportunidades','plano_pagamentos',
      'ordens_servico','trabalhos_extra','services','notas_encomenda','accounts_payable',
      'account_payments','produtos','stock_movimentos','stock_atual','articles','suppliers',
      'cash_flows','employees','time_records','rh_avaliacoes','subempreiteiros','quadros',
      'quadro_listas','quadro_cartoes','quadro_automacoes','marketing_tarefas','adm_documentos',
      'email_history','liberty_utilizador_empresas','cost_centers')
  group by c.table_name
  having bool_or(c.column_name = 'empresa_id')
),
m as (
  select tab.t, emp.slug,
    (xpath('/row/n/text()', query_to_xml(format(
       'select count(*) as n from public.%I where empresa_id = %L', tab.t, emp.id), false, true, '')))[1]::text as n,
    case when tab.col_data is not null then
    (xpath('/row/d/text()', query_to_xml(format(
       'select max(%I)::date as d from public.%I where empresa_id = %L', tab.col_data, tab.t, emp.id), false, true, '')))[1]::text
    end as ult
  from tab cross join emp
)
select t as tabela,
  max(case when slug = 'tudocasa'              then n || coalesce(' · ' || ult, '') end) as "TC Warm",
  max(case when slug = 'tudocasa-matrizcharme' then n || coalesce(' · ' || ult, '') end) as "TC Matrizcharme",
  max(case when slug = 'obrajusta-gestao'      then n || coalesce(' · ' || ult, '') end) as "OJ Gestão",
  max(case when slug = 'obrajusta'             then n || coalesce(' · ' || ult, '') end) as "OJ II",
  max(case when slug = 'resiserv'              then n || coalesce(' · ' || ult, '') end) as "Resiserv"
from m
group by t
order by t;
