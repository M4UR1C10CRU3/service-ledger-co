-- =============================================================================
-- Dois instrutores que tinham assinatura mas nao tinham cadastro
--
-- Na pasta de assinaturas do ITC havia cinco ficheiros. Tres correspondiam a
-- instrutores registados (Eder Barbosa, Marcos Ferreira, Renevaldo Machado) e
-- foram ligados. Os outros dois nao existiam no cadastro:
--
--   Eber Sousa.png  — a propria assinatura le-se "Eber Sousa da Rocha"
--   Fabio Costa.png — assinatura ilegivel; vale o nome do ficheiro
--
-- Procurei-os entre os 14 registados por Eber, Sousa, Souza, Rocha, Fabio e
-- Costa. Aparecem "Ivan Pereira de Sousa", "Divaldo dos Santos Souza" e "Eder
-- Barbosa da Costa" — nenhum e o mesmo: nomes proprios diferentes, e o Eder ja
-- tem assinatura propria.
--
-- Ficam com o nome e a assinatura. O resto fica por preencher de proposito.
-- =============================================================================

insert into public.school_docentes (empresa_id, nome, assinatura_path, ativo, cursos_ids)
select 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b', v.nome, v.assinatura, true, '{}'
from (values
  ('Eber Sousa da Rocha', '/assets/certificado/itc/sig-eber-sousa.png'),
  ('Fábio Costa',         '/assets/certificado/itc/sig-fabio-costa.png')
) as v(nome, assinatura)
where not exists (
  select 1 from public.school_docentes d
  where d.empresa_id = 'b5553b17-ee58-4e87-8f3f-e0a0e5c7f28b'
    and d.nome = v.nome
);
