-- ============================================================================
-- Grupos empresariais — a fundação do âmbito de dados
-- ----------------------------------------------------------------------------
-- Decisão do utilizador (2026-08-02): o isolamento NÃO é por empresa, é por
-- grupo. As cinco empresas do grupo partilham fornecedores, clientes,
-- colaboradores e utilizadores DE PROPÓSITO — poupa-lhes entrar e sair da
-- sessão várias vezes por dia. A Elo Giro e a ITC não partilham nada.
--
-- Esta migration é DELIBERADAMENTE inofensiva: cria o conceito e diz quem
-- pertence a quê. Não altera uma única política de segurança, não filtra
-- nada e não muda o que quer que seja para quem está a usar a aplicação
-- neste momento. Mexer nas políticas é o passo seguinte, tabela a tabela,
-- depois de isto estar de pé e verificado.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.empresa_grupos (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.empresa_grupos IS
  'Conjunto de empresas que partilham dados-mestre. Uma empresa sozinha é o seu próprio grupo.';

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES public.empresa_grupos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS empresas_grupo_idx ON public.empresas(grupo_id);

ALTER TABLE public.empresa_grupos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS empresa_grupos_leitura ON public.empresa_grupos;
CREATE POLICY empresa_grupos_leitura ON public.empresa_grupos
  FOR SELECT TO authenticated USING (TRUE);

-- ── Os grupos que existem hoje ──────────────────────────────────────────────
-- Por slug, nunca por nome: há duas empresas chamadas "Tudo Casa".
INSERT INTO public.empresa_grupos (nome) VALUES
  ('Grupo Obrajusta / Tudo Casa'),
  ('Elo Giro'),
  ('ITC')
ON CONFLICT (nome) DO NOTHING;

UPDATE public.empresas SET grupo_id = g.id
FROM public.empresa_grupos g
WHERE g.nome = 'Grupo Obrajusta / Tudo Casa'
  AND public.empresas.slug IN
    ('obrajusta-gestao', 'obrajusta', 'resiserv', 'tudocasa', 'tudocasa-matrizcharme');

UPDATE public.empresas SET grupo_id = g.id
FROM public.empresa_grupos g
WHERE g.nome = 'Elo Giro' AND public.empresas.slug = 'elo-giro';

UPDATE public.empresas SET grupo_id = g.id
FROM public.empresa_grupos g
WHERE g.nome = 'ITC' AND public.empresas.slug = 'itc';

-- ── Quem vê o quê ───────────────────────────────────────────────────────────
-- Irmã de user_has_empresa_access, mas ao nível do grupo: tem acesso quem
-- tiver acesso a QUALQUER empresa do mesmo grupo.
--
-- Repare no cuidado com o grupo nulo: uma empresa sem grupo NÃO passa a
-- partilhar com as outras empresas sem grupo. Sem esta guarda, uma empresa
-- nova criada antes de lhe ser atribuído grupo veria os dados de todas as
-- outras na mesma situação — exatamente o problema que viemos corrigir.
CREATE OR REPLACE FUNCTION public.user_has_grupo_access(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM empresas r
    WHERE r.id = p_empresa_id
      AND (
        user_has_empresa_access(r.id)
        OR (
          r.grupo_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM empresas m
            WHERE m.grupo_id = r.grupo_id
              AND user_has_empresa_access(m.id)
          )
        )
      )
  );
$$;

COMMENT ON FUNCTION public.user_has_grupo_access IS
  'TRUE se o utilizador tem acesso a alguma empresa do mesmo grupo. Para dados-mestre partilhados (fornecedores, clientes, colaboradores). Documentos continuam a usar user_has_empresa_access.';

-- ============================================================================
-- Nada acima altera comportamento. O passo seguinte — aplicar isto às
-- políticas de fornecedores, clientes e colaboradores — fica para quando
-- estiver decidido a quem pertencem os clientes que já existem, porque a
-- tabela `clientes` nunca guardou essa informação.
-- ============================================================================
