-- Agência Demo — bloco 2 de 3: as etapas do kanban de jobs.
-- As exigências são progressivas de propósito: o job nasce só com um título e
-- só se pede quem faz e para quando quando alguém o começa mesmo a trabalhar.
DO $$
DECLARE
  v_empresa UUID;
BEGIN
  SELECT id INTO v_empresa FROM empresas WHERE slug = 'demo-agencia';
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Corra primeiro o bloco 1.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ag_job_etapas WHERE empresa_id = v_empresa) THEN
    INSERT INTO ag_job_etapas (empresa_id, nome, cor, ordem, final, estado_codigo, campos_obrigatorios) VALUES
      (v_empresa, 'Briefing',  '#94a3b8', 0, FALSE, 'briefing',  '[]'::jsonb),
      (v_empresa, 'Pesquisa',  '#6366f1', 1, FALSE, 'pesquisa',  '["responsavel_id"]'::jsonb),
      (v_empresa, 'Criação',   '#f59e0b', 2, FALSE, 'criacao',   '["responsavel_id","prazo"]'::jsonb),
      (v_empresa, 'Revisão',   '#06b6d4', 3, FALSE, 'revisao',   '[]'::jsonb),
      (v_empresa, 'Aprovação', '#a855f7', 4, FALSE, 'aprovacao', '[]'::jsonb),
      (v_empresa, 'Concluído', '#22c55e', 5, TRUE,  'concluido', '[]'::jsonb);
  END IF;
END $$;

SELECT nome, ordem, final, campos_obrigatorios
FROM ag_job_etapas
WHERE empresa_id = (SELECT id FROM empresas WHERE slug = 'demo-agencia')
ORDER BY ordem;
