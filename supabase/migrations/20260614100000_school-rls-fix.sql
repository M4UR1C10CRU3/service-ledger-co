-- ============================================================
-- Fix RLS school_* tables: usar liberty_utilizador_empresas
-- em vez de get_user_empresa_id() (que usa apenas empresa_padrao)
-- Não-destrutivo: CREATE OR REPLACE + DROP IF EXISTS antes de recriar
-- ============================================================

-- Função auxiliar: verifica se o utilizador autenticado tem acesso à empresa
CREATE OR REPLACE FUNCTION public.user_has_empresa_access(eid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM liberty_utilizador_empresas lue
    JOIN liberty_utilizadores lu ON lu.id = lue.utilizador_id
    WHERE lu.auth_user_id = auth.uid()
      AND lue.empresa_id = eid
  )
$$;

-- ── school_alunos ────────────────────────────────────────────
DROP POLICY IF EXISTS school_school_alunos_empresa ON public.school_alunos;
CREATE POLICY school_school_alunos_empresa ON public.school_alunos
  FOR ALL USING (user_has_empresa_access(empresa_id));

-- ── school_certificados ──────────────────────────────────────
DROP POLICY IF EXISTS school_school_certificados_empresa ON public.school_certificados;
CREATE POLICY school_school_certificados_empresa ON public.school_certificados
  FOR ALL USING (user_has_empresa_access(empresa_id));

-- ── school_clientes_corp ─────────────────────────────────────
DROP POLICY IF EXISTS school_school_clientes_corp_empresa ON public.school_clientes_corp;
CREATE POLICY school_school_clientes_corp_empresa ON public.school_clientes_corp
  FOR ALL USING (user_has_empresa_access(empresa_id));

-- ── school_cursos ────────────────────────────────────────────
DROP POLICY IF EXISTS school_school_cursos_empresa ON public.school_cursos;
CREATE POLICY school_school_cursos_empresa ON public.school_cursos
  FOR ALL USING (user_has_empresa_access(empresa_id));

-- ── school_docentes ──────────────────────────────────────────
DROP POLICY IF EXISTS school_school_docentes_empresa ON public.school_docentes;
CREATE POLICY school_school_docentes_empresa ON public.school_docentes
  FOR ALL USING (user_has_empresa_access(empresa_id));

-- ── school_docentes_documentos ───────────────────────────────
DROP POLICY IF EXISTS school_school_docentes_documentos_empresa ON public.school_docentes_documentos;
CREATE POLICY school_school_docentes_documentos_empresa ON public.school_docentes_documentos
  FOR ALL USING (user_has_empresa_access(empresa_id));

-- ── school_matriculas ────────────────────────────────────────
DROP POLICY IF EXISTS school_school_matriculas_empresa ON public.school_matriculas;
CREATE POLICY school_school_matriculas_empresa ON public.school_matriculas
  FOR ALL USING (user_has_empresa_access(empresa_id));

-- ── school_turmas ────────────────────────────────────────────
DROP POLICY IF EXISTS school_school_turmas_empresa ON public.school_turmas;
CREATE POLICY school_school_turmas_empresa ON public.school_turmas
  FOR ALL USING (user_has_empresa_access(empresa_id));
