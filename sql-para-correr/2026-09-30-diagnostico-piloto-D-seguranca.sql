-- DIAGNÓSTICO DO PILOTO (D) — cada tabela de negócio está fechada por empresa/grupo, ou ainda aberta? SÓ LEITURA.
select t.tablename as tabela,
       case
         when bool_or(p.qual ilike '%user_has_empresa_access%' or p.qual ilike '%user_has_grupo_access%') and
              not bool_or(p.qual ilike '%uid() is not null%' or p.qual = 'true')          then 'FECHADA'
         when bool_or(p.qual ilike '%uid() is not null%' or p.qual = 'true')            then 'ABERTA'
         when count(p.policyname) = 0                                                    then 'sem políticas'
         else 'outra regra'
       end as estado,
       string_agg(p.policyname || ' → ' || coalesce(left(p.qual, 60), '(só escrita)'), ' | ') as politicas
from pg_tables t
left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
  and t.tablename in ('services','liquidacoes','clientes','suppliers','employees','propostas','propostas_linhas',
    'pedidos_orcamento','po_linhas','followup_oportunidades','plano_pagamentos','ordens_servico',
    'notas_encomenda','notas_encomenda_items','accounts_payable','account_payments','produtos',
    'stock_atual','stock_movimentos','cash_flows','time_records','quadros','quadro_cartoes','cartao_comentarios')
group by t.tablename
order by 2, 1;
