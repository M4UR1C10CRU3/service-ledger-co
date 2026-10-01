-- Agência Demo — bloco 4: ligar a conta de demonstração à empresa.
--
-- CORRER DEPOIS de criar demo@clarizaplatform.com no painel
-- (Authentication → Users → Add user, com Auto Confirm ligado).
--
-- Liga a conta EXCLUSIVAMENTE à Agência Demo. Perfil de administrador dentro
-- dela — não para lhe dar poder, mas porque o menu esconde módulos a quem não
-- tem permissão, e um visitante com metade do menu não fica a conhecer nada.
-- Como a empresa está isolada no seu próprio grupo, ser administrador ali não
-- lhe dá acesso a mais nada em lado nenhum.
DO $$
DECLARE
  v_auth    UUID;
  v_empresa UUID;
  v_util    UUID;
  v_mod     TEXT;
BEGIN
  SELECT id INTO v_auth FROM auth.users WHERE email = 'demo@clarizaplatform.com';
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Conta demo@clarizaplatform.com ainda não existe em Authentication.';
  END IF;

  SELECT id INTO v_empresa FROM empresas WHERE slug = 'demo-agencia';
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Corra primeiro os blocos 1 a 3.';
  END IF;

  INSERT INTO liberty_utilizadores (auth_user_id, nome, email, cargo, perfil, ativo, eliminado)
  VALUES (v_auth, 'Visitante', 'demo@clarizaplatform.com', 'Demonstração', 'administrador', TRUE, FALSE)
  ON CONFLICT (auth_user_id) DO UPDATE
    SET ativo = TRUE, eliminado = FALSE, perfil = 'administrador';
  SELECT id INTO v_util FROM liberty_utilizadores WHERE auth_user_id = v_auth;

  -- Uma empresa e uma só.
  DELETE FROM liberty_utilizador_empresas WHERE utilizador_id = v_util;
  INSERT INTO liberty_utilizador_empresas (utilizador_id, empresa_id)
  VALUES (v_util, v_empresa);

  DELETE FROM liberty_utilizador_permissoes WHERE utilizador_id = v_util;
  FOREACH v_mod IN ARRAY ARRAY[
    'clientes','propostas','followup','compras','fornecedores','stocks','produtos',
    'vendas','ordens_servico','financeiro_receitas','financeiro_despesas',
    'financeiro_debitos','financeiro_fluxo','rh_colaboradores','rh_ponto',
    'rh_subempreiteiros','rh_recrutamento','rh_avaliacoes','relatorios',
    'auditoria','configuracoes','utilizadores'
  ] LOOP
    INSERT INTO liberty_utilizador_permissoes
      (utilizador_id, empresa_id, modulo, perm_ver, perm_criar, perm_editar, perm_eliminar)
    VALUES (v_util, v_empresa, v_mod, TRUE, TRUE, TRUE, FALSE);
  END LOOP;
END $$;

-- Prova: a conta alcança UMA empresa, e é a de demonstração.
SELECT u.email, u.perfil, e.slug AS empresa, e.nome
FROM liberty_utilizadores u
JOIN liberty_utilizador_empresas ue ON ue.utilizador_id = u.id
JOIN empresas e ON e.id = ue.empresa_id
WHERE u.email = 'demo@clarizaplatform.com';
