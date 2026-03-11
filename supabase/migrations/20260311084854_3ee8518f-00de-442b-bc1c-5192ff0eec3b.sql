
-- Table: liberty_utilizadores
CREATE TABLE public.liberty_utilizadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cargo TEXT,
  perfil TEXT NOT NULL DEFAULT 'operacional',
  ativo BOOLEAN DEFAULT true,
  eliminado BOOLEAN DEFAULT false,
  empresa_padrao UUID,
  ultimo_acesso TIMESTAMPTZ,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Table: liberty_utilizador_empresas
CREATE TABLE public.liberty_utilizador_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilizador_id UUID NOT NULL REFERENCES public.liberty_utilizadores(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(utilizador_id, empresa_id)
);

-- Table: liberty_utilizador_permissoes
CREATE TABLE public.liberty_utilizador_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilizador_id UUID NOT NULL REFERENCES public.liberty_utilizadores(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  modulo TEXT NOT NULL,
  perm_ver BOOLEAN DEFAULT false,
  perm_criar BOOLEAN DEFAULT false,
  perm_editar BOOLEAN DEFAULT false,
  perm_eliminar BOOLEAN DEFAULT false,
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(utilizador_id, empresa_id, modulo)
);

-- Indexes
CREATE INDEX idx_lu_auth_user ON public.liberty_utilizadores(auth_user_id);
CREATE INDEX idx_lu_ativo ON public.liberty_utilizadores(ativo, eliminado);
CREATE INDEX idx_lue_utilizador ON public.liberty_utilizador_empresas(utilizador_id);
CREATE INDEX idx_lue_empresa ON public.liberty_utilizador_empresas(empresa_id);
CREATE INDEX idx_lup_utilizador ON public.liberty_utilizador_permissoes(utilizador_id, empresa_id);
CREATE INDEX idx_lup_modulo ON public.liberty_utilizador_permissoes(utilizador_id, modulo);

-- RLS
ALTER TABLE public.liberty_utilizadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liberty_utilizador_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liberty_utilizador_permissoes ENABLE ROW LEVEL SECURITY;

-- RLS policies for liberty_utilizadores
CREATE POLICY "Authenticated users can view liberty_utilizadores"
ON public.liberty_utilizadores FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert liberty_utilizadores"
ON public.liberty_utilizadores FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update liberty_utilizadores"
ON public.liberty_utilizadores FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete liberty_utilizadores"
ON public.liberty_utilizadores FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

-- RLS policies for liberty_utilizador_empresas
CREATE POLICY "Authenticated users can view liberty_utilizador_empresas"
ON public.liberty_utilizador_empresas FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert liberty_utilizador_empresas"
ON public.liberty_utilizador_empresas FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update liberty_utilizador_empresas"
ON public.liberty_utilizador_empresas FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete liberty_utilizador_empresas"
ON public.liberty_utilizador_empresas FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

-- RLS policies for liberty_utilizador_permissoes
CREATE POLICY "Authenticated users can view liberty_utilizador_permissoes"
ON public.liberty_utilizador_permissoes FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert liberty_utilizador_permissoes"
ON public.liberty_utilizador_permissoes FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update liberty_utilizador_permissoes"
ON public.liberty_utilizador_permissoes FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete liberty_utilizador_permissoes"
ON public.liberty_utilizador_permissoes FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

-- Permission check function (SECURITY DEFINER)
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

  -- If no liberty_utilizadores record found, allow access (backwards compat)
  IF v_utilizador_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Administrador always has access
  IF v_perfil = 'administrador' THEN
    RETURN TRUE;
  END IF;

  SELECT
    CASE p_acao
      WHEN 'ver' THEN perm_ver
      WHEN 'criar' THEN perm_criar
      WHEN 'editar' THEN perm_editar
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
