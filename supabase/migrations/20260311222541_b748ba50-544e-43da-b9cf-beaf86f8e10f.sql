
-- Insert mauriciocruzbarreto.pt@gmail.com
INSERT INTO liberty_utilizadores (auth_user_id, nome, email, perfil, empresa_padrao, criado_por)
VALUES ('bb584adc-ad9d-4e04-8986-a39992d4b16b', 'Maurício Cruz Barreto', 'mauriciocruzbarreto.pt@gmail.com', 'operacional', NULL, '9fb76513-ac29-413b-a04a-d776283bc798')
ON CONFLICT DO NOTHING;

-- Associate with all empresas
INSERT INTO liberty_utilizador_empresas (utilizador_id, empresa_id)
SELECT lu.id, e.id
FROM liberty_utilizadores lu
CROSS JOIN empresas e
WHERE lu.auth_user_id = 'bb584adc-ad9d-4e04-8986-a39992d4b16b'
ON CONFLICT DO NOTHING;
