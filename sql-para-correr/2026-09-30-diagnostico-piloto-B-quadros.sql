-- DIAGNÓSTICO DO PILOTO (B) — quadros de cada empresa e quanto são usados. SÓ LEITURA.
select e.nome as empresa,
       q.nome as quadro,
       coalesce(q.tipo, 'livre') as tipo,
       (select count(*) from quadro_listas l where l.quadro_id = q.id and not coalesce(l.arquivado, false)) as colunas,
       (select count(*) from quadro_cartoes c join quadro_listas l on l.id = c.lista_id
         where l.quadro_id = q.id and not c.arquivado) as cartoes_ativos,
       (select count(*) from quadro_cartoes c join quadro_listas l on l.id = c.lista_id
         where l.quadro_id = q.id and c.arquivado) as cartoes_arquivados,
       (select max(c.atualizado_em)::date from quadro_cartoes c join quadro_listas l on l.id = c.lista_id
         where l.quadro_id = q.id) as ultimo_movimento,
       (select count(*) from quadro_automacoes a where a.quadro_id = q.id) as automacoes
from quadros q
join empresas e on e.id = q.empresa_id
where e.slug in ('tudocasa','tudocasa-matrizcharme','obrajusta-gestao','obrajusta','resiserv')
  and not coalesce(q.arquivado, false)
order by e.nome, q.nome;
