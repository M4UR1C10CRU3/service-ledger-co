-- Migration: Fix liberty_check_permission security issue
-- The original function returned TRUE when no liberty_utilizadores record was found
-- (labelled "backwards compat") — this allowed any authenticated user without a
-- platform record to bypass all permission checks. Changed to RETURN FALSE so
-- users without an active liberty_utilizadores record are always denied.

CREATE OR REPLACE FUNCTION public.liberty_check_permission(
  p_modulo TEXT,
  p_acao TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil TEXT;
  v_permissao BOOLEAN;
  v_utilizador_id UUID;
BEGIN
  SELECT id, perfil INTO v_utilizador_id, v_perfil
  FROM public.liberty_utilizadores
  WHERE auth_user_id = auth.uid()
    AND ativo = true
    AND eliminado = false
  LIMIT 1;

  -- SECURITY FIX: If no liberty_utilizadores record found, DENY access.
  -- (Previously returned TRUE for "backwards compat" — this was a security risk
  --  allowing any authenticated user to bypass permission checks.)
  IF v_utilizador_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Administrador always has full access
  IF v_perfil = 'administrador' THEN
    RETURN TRUE;
  END IF;

  SELECT
    CASE p_acao
      WHEN 'ver'      THEN perm_ver
      WHEN 'criar'    THEN perm_criar
      WHEN 'editar'   THEN perm_editar
      WHEN 'eliminar' THEN perm_eliminar
      ELSE FALSE
    END
  INTO v_permissao
  FROM public.liberty_utilizador_permissoes
  WHERE utilizador_id = v_utilizador_id
    AND modulo = p_modulo
  LIMIT 1;

  RETURN COALESCE(v_permissao, FALSE);
END;
$$;
