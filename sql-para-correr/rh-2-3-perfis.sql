-- RH (01/10/2026) — PASSO 3 de 3: perfis de atividade (que critérios e com que peso, em %) e ligação às Funções.
-- Só insere; não altera perfis já existentes. Os pesos de cada perfil somam 100.
INSERT INTO public.rh_aval_perfis (grupo_id, codigo, nome, descricao, criterios, ordem)
SELECT g.id, p.codigo, p.nome, p.descricao, p.criterios::jsonb, p.ordem
FROM public.empresa_grupos g
CROSS JOIN (VALUES
 ('operacional', 'Operacional de obra / oficina', 'Canalização, eletricidade, construção, montagem, manutenção.',
  '[{"codigo":"conhecimento_tecnico","peso":15},{"codigo":"retrabalho","peso":15},{"codigo":"coordenacao_motora","peso":10},
    {"codigo":"atencao_cuidado","peso":10},{"codigo":"seguranca","peso":10},{"codigo":"produtividade","peso":10},
    {"codigo":"cuidado_equipamentos","peso":8},{"codigo":"pontualidade","peso":7},{"codigo":"limpeza_local","peso":5},
    {"codigo":"proatividade","peso":5},{"codigo":"prestabilidade","peso":5}]', 1),
 ('atendimento', 'Atendimento ao cliente / loja', 'Balcão, loja, receção, apoio telefónico.',
  '[{"codigo":"atendimento","peso":20},{"codigo":"informacao_cliente","peso":15},{"codigo":"comunicacao","peso":10},
    {"codigo":"prestabilidade","peso":10},{"codigo":"proatividade","peso":10},{"codigo":"atencao_cuidado","peso":10},
    {"codigo":"pontualidade","peso":10},{"codigo":"registo_sistema","peso":10},{"codigo":"organizacao","peso":5}]', 2),
 ('administrativo', 'Administrativo / comercial', 'Propostas, compras, faturação, cobranças, documentação.',
  '[{"codigo":"organizacao","peso":15},{"codigo":"atencao_cuidado","peso":15},{"codigo":"registo_sistema","peso":15},
    {"codigo":"retrabalho","peso":10},{"codigo":"comunicacao","peso":10},{"codigo":"produtividade","peso":10},
    {"codigo":"proatividade","peso":10},{"codigo":"autonomia","peso":10},{"codigo":"pontualidade","peso":5}]', 3),
 ('tecnico', 'Técnico especializado', 'E-commerce, marketing, técnicos com autonomia própria.',
  '[{"codigo":"conhecimento_tecnico","peso":20},{"codigo":"autonomia","peso":15},{"codigo":"retrabalho","peso":10},
    {"codigo":"produtividade","peso":10},{"codigo":"comunicacao","peso":10},{"codigo":"aprendizagem","peso":10},
    {"codigo":"proatividade","peso":10},{"codigo":"organizacao","peso":10},{"codigo":"pontualidade","peso":5}]', 4),
 ('chefia', 'Chefia / coordenação', 'Quem coordena equipas ou processos.',
  '[{"codigo":"lideranca","peso":20},{"codigo":"comunicacao","peso":15},{"codigo":"organizacao","peso":15},
    {"codigo":"autonomia","peso":15},{"codigo":"proatividade","peso":10},{"codigo":"produtividade","peso":10},
    {"codigo":"conhecimento_tecnico","peso":10},{"codigo":"prestabilidade","peso":5}]', 5)
) AS p(codigo, nome, descricao, criterios, ordem)
WHERE g.nome = 'Grupo Obrajusta / Tudo Casa'
ON CONFLICT (grupo_id, codigo) DO NOTHING;

-- Funções existentes → perfil (só onde ainda não há perfil escolhido).
UPDATE public.rh_funcoes f
SET perfil_avaliacao_id = p.id
FROM public.rh_aval_perfis p
WHERE p.grupo_id = f.grupo_id
  AND f.perfil_avaliacao_id IS NULL
  AND p.codigo = CASE
        WHEN f.codigo = 'tecnico_admin_comercial' THEN 'chefia'
        WHEN f.codigo IN ('tecnico_ecommerce', 'tecnico_marketing') THEN 'tecnico'
        WHEN f.nivel = 'operacional' THEN 'operacional'
        ELSE 'administrativo' END;

SELECT p.nome AS perfil,
       (SELECT sum((c->>'peso')::int) FROM jsonb_array_elements(p.criterios) c) AS soma_pesos,
       (SELECT string_agg(f.nome, ', ') FROM public.rh_funcoes f WHERE f.perfil_avaliacao_id = p.id) AS funcoes
FROM public.rh_aval_perfis p ORDER BY p.ordem;
