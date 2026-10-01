-- Agência Demo — bloco 1 de 3: empresa, grupo, assinatura e clientes fictícios.
-- Tudo o que está aqui é INVENTADO. Os domínios .example são reservados e
-- nunca corresponderão a ninguém real.
-- Pode ser corrido mais do que uma vez sem duplicar nada.
DO $$
DECLARE
  v_grupo   UUID;
  v_empresa UUID;
BEGIN
  INSERT INTO empresa_grupos (nome) VALUES ('Demonstração')
  ON CONFLICT (nome) DO NOTHING;
  SELECT id INTO v_grupo FROM empresa_grupos WHERE nome = 'Demonstração';

  INSERT INTO empresas (slug, nome, nome_legal, cor_primaria, cor_secundaria, cor_accent, grupo_id)
  VALUES ('demo-agencia', 'Agência Demo', 'Agência Demo — Demonstração Clariza',
          '#7c3aed', '#5b21b6', '#a78bfa', v_grupo)
  ON CONFLICT (slug) DO UPDATE SET grupo_id = EXCLUDED.grupo_id;
  SELECT id INTO v_empresa FROM empresas WHERE slug = 'demo-agencia';

  -- Vertical de agência ligado, em português de Portugal.
  INSERT INTO ag_empresas_vertical (empresa_id, pais) VALUES (v_empresa, 'PT')
  ON CONFLICT (empresa_id) DO NOTHING;

  -- Demonstração, não interna: expira sozinha em vez de virar acesso
  -- permanente por esquecimento.
  INSERT INTO assinaturas (grupo_id, plano_codigo, estado, demo_fim, cobrador)
  VALUES (v_grupo, 'business', 'demonstracao', now() + interval '90 days', 'manual')
  ON CONFLICT (grupo_id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM clientes WHERE grupo_id = v_grupo) THEN
    INSERT INTO clientes (nome, email, telefone, nif, morada_concelho, grupo_id) VALUES
      ('Padaria Nova Estrela',     'geral@novaestrela.example',  '210 000 111', '500111222', 'Cascais', v_grupo),
      ('Clínica Dentária Sorriso', 'marketing@sorriso.example',  '210 000 222', '500333444', 'Lisboa',  v_grupo),
      ('Ginásio Pulso',            'direcao@pulso.example',      '210 000 333', '500555666', 'Almada',  v_grupo),
      ('Móveis Carvalho & Filhos', 'comercial@carvalho.example', '210 000 444', '500777888', 'Braga',   v_grupo);
  END IF;
END $$;

SELECT slug, nome, grupo_id IS NOT NULL AS tem_grupo FROM empresas WHERE slug = 'demo-agencia';
