-- DIAGNÓSTICO DO PILOTO (C) — quem usa o quê: utilizadores por empresa, perfil e módulos com acesso. SÓ LEITURA.
select e.nome as empresa,
       u.nome as utilizador,
       u.perfil,
       coalesce(u.ativo, true) as ativo,
       (select count(*) from liberty_utilizador_permissoes p
         where p.utilizador_id = u.id and p.perm_ver) as modulos_visiveis,
       (select string_agg(p.modulo, ', ' order by p.modulo) from liberty_utilizador_permissoes p
         where p.utilizador_id = u.id and p.perm_ver) as modulos
from liberty_utilizador_empresas ue
join liberty_utilizadores u on u.id = ue.utilizador_id
join empresas e on e.id = ue.empresa_id
where e.slug in ('tudocasa','tudocasa-matrizcharme','obrajusta-gestao','obrajusta','resiserv')
order by e.nome, u.perfil, u.nome;
