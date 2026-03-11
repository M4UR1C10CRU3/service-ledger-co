
-- Insert Lorena Brito
INSERT INTO liberty_utilizadores (auth_user_id, nome, email, perfil, empresa_padrao, criado_por)
VALUES ('7e6a38bb-0bfc-473e-837f-381cb1a506c0', 'Lorena Brito', 'lorenabrito.port@gmail.com', 'operacional', NULL, '9fb76513-ac29-413b-a04a-d776283bc798');

-- Insert Daniel Garcia
INSERT INTO liberty_utilizadores (auth_user_id, nome, email, perfil, empresa_padrao, criado_por)
VALUES ('4c958a03-9405-49bc-be88-7d6e95dd645e', 'Daniel Garcia', 'comercial4@lojatudocasa.com', 'operacional', NULL, '9fb76513-ac29-413b-a04a-d776283bc798');

-- Insert Ricardo Pessoa (gestao.obrajusta@gmail.com)
INSERT INTO liberty_utilizadores (auth_user_id, nome, email, perfil, empresa_padrao, criado_por)
VALUES ('6f62346a-d9f9-42da-a879-d5bf236e1663', 'Ricardo Pessoa', 'gestao.obrajusta@gmail.com', 'operacional', NULL, '9fb76513-ac29-413b-a04a-d776283bc798');

-- Associate all 3 users with all empresas
INSERT INTO liberty_utilizador_empresas (utilizador_id, empresa_id)
SELECT lu.id, e.id
FROM liberty_utilizadores lu
CROSS JOIN empresas e
WHERE lu.auth_user_id IN (
  '7e6a38bb-0bfc-473e-837f-381cb1a506c0',
  '4c958a03-9405-49bc-be88-7d6e95dd645e',
  '6f62346a-d9f9-42da-a879-d5bf236e1663'
);

-- Also associate Maurício with all empresas (if not already)
INSERT INTO liberty_utilizador_empresas (utilizador_id, empresa_id)
SELECT lu.id, e.id
FROM liberty_utilizadores lu
CROSS JOIN empresas e
WHERE lu.auth_user_id = '9fb76513-ac29-413b-a04a-d776283bc798'
ON CONFLICT DO NOTHING;
