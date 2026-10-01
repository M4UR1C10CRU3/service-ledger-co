-- ============================================================================
-- QUADROS — motor único de processos para todo o Clariza
-- ============================================================================
-- CONTEXTO. O Clariza tinha duas soluções a fazer o mesmo: os Workflows
-- (Comercial, Compras, Produção, Financeiro) e os Quadros. Os Workflows tinham
-- o processo pensado — colunas, estados, regras — mas ZERO colaboração: nem
-- comentar, nem anexar, nem atribuir. Os Quadros tinham tudo isso e nenhuma
-- ligação ao negócio. A equipa escolheu os Quadros e abandonou os Workflows.
--
-- CONSEQUÊNCIA. Como o cartão é texto livre, nada se pode automatizar: não se
-- envia uma encomenda a um fornecedor que o sistema não sabe quem é.
--
-- ESTA MIGRATION resolve as duas coisas de uma vez:
--   1. O quadro passa a ter TIPO, e as colunas passam a ter REGRAS —
--      exatamente as que estavam pensadas nos Workflows, aqui herdadas.
--   2. O cartão ganha ESTRUTURA (cliente, fornecedor, valor, responsável),
--      que é o que torna a automação possível.
--   3. Entra o motor de AUTOMAÇÕES: quando X acontece, faz Y.
--
-- PRINCÍPIO QUE NÃO SE NEGOCEIA: a estrutura é PROGRESSIVA. O cartão cria-se
-- com um título, como hoje. É a COLUNA que exige o que precisa, no momento em
-- que se tenta lá entrar. Foi a exigência à cabeça que matou os Workflows.
-- E um quadro do tipo 'livre' continua sempre a existir, sem regra nenhuma.
--
-- NÃO-DESTRUTIVO: só acrescenta. Os quadros e cartões atuais continuam a
-- funcionar exatamente como estão — passam a ser do tipo 'livre'.
-- ============================================================================

-- ── 1. O quadro ganha tipo ──────────────────────────────────────────────────
ALTER TABLE public.quadros
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'livre',
  ADD COLUMN IF NOT EXISTS modelo_codigo TEXT;

-- ── 2. As colunas ganham as regras que estavam nos Workflows ────────────────
ALTER TABLE public.quadro_listas
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS estado_codigo TEXT,
  ADD COLUMN IF NOT EXISTS campos_obrigatorios JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS final BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bloqueada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cor TEXT;

-- Backfill do empresa_id a partir do quadro (a tabela não o tinha; herdava
-- pela ligação, o que impede políticas de segurança diretas).
UPDATE public.quadro_listas l
SET empresa_id = q.empresa_id
FROM public.quadros q
WHERE l.quadro_id = q.id AND l.empresa_id IS NULL;

-- ── 3. O cartão ganha estrutura — é isto que destranca a automação ─────────
ALTER TABLE public.quadro_cartoes
  ADD COLUMN IF NOT EXISTS cliente_id       UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_id      UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsavel_id   UUID REFERENCES public.liberty_utilizadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsavel_nome TEXT,
  ADD COLUMN IF NOT EXISTS contacto_email   TEXT,
  -- Campos específicos de cada tipo, sem obrigar a uma tabela por tipo
  ADD COLUMN IF NOT EXISTS dados            JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Ligação a um documento real quando o cartão o representa
  ADD COLUMN IF NOT EXISTS doc_tipo         TEXT,
  ADD COLUMN IF NOT EXISTS doc_id           UUID,
  -- Rasto de movimento, para as automações de "parado há N dias"
  ADD COLUMN IF NOT EXISTS movido_em        TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS quadro_cartoes_doc_idx ON public.quadro_cartoes(doc_tipo, doc_id);
CREATE INDEX IF NOT EXISTS quadro_cartoes_movido_idx ON public.quadro_cartoes(movido_em);

-- Trigger: sempre que o cartão muda de coluna, marca a data do movimento.
CREATE OR REPLACE FUNCTION public.quadro_marca_movimento()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lista_id IS DISTINCT FROM OLD.lista_id THEN
    NEW.movido_em := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS quadro_cartoes_movimento ON public.quadro_cartoes;
CREATE TRIGGER quadro_cartoes_movimento
  BEFORE UPDATE ON public.quadro_cartoes
  FOR EACH ROW EXECUTE FUNCTION public.quadro_marca_movimento();

