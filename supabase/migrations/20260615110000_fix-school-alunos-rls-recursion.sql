-- Corrigir recursão infinita em school_alunos RLS
-- A policy school_alunos_select referenciava school_matriculas,
-- que por sua vez referencia school_alunos → loop infinito.
-- A policy school_school_alunos_empresa (ALL, SECURITY DEFINER) já cobre
-- o acesso por empresa_id, tornando o sub-clause recursivo desnecessário.

DROP POLICY IF EXISTS school_alunos_select ON public.school_alunos;

CREATE POLICY school_alunos_select ON public.school_alunos
  FOR SELECT USING (
    empresa_id IN (
      SELECT lue.empresa_id
      FROM liberty_utilizador_empresas lue
      JOIN liberty_utilizadores lu ON lu.id = lue.utilizador_id
      WHERE lu.auth_user_id = auth.uid()
    )
    OR auth_user_id = auth.uid()
  );
