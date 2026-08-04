-- ============================================================================
-- Numeração de documentos sem corrida
-- ----------------------------------------------------------------------------
-- Propostas e Pedidos de Orçamento numeravam-se assim: ler o maior número do
-- ano e somar um. Entre a leitura e a gravação não há nada que impeça outra
-- pessoa de fazer o mesmo — dois utilizadores a gravar no mesmo segundo ficam
-- com o mesmo número.
--
-- Com uma empresa e três pessoas isso quase nunca acontece. Com dezenas de
-- empresas a trabalhar em simultâneo deixa de ser hipótese remota, e um
-- documento com número repetido é um problema contabilístico, não um bug de
-- ecrã.
--
-- A correção é um contador por empresa/tipo/ano, incrementado numa única
-- instrução — a base garante que dois pedidos ao mesmo tempo recebem números
-- diferentes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.doc_sequencias (
  empresa_id UUID    NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo       TEXT    NOT NULL,   -- 'proposta', 'pedido_orcamento', ...
  ano        INTEGER NOT NULL,
  ultimo     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (empresa_id, tipo, ano)
);

ALTER TABLE public.doc_sequencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS doc_sequencias_empresa ON public.doc_sequencias;
CREATE POLICY doc_sequencias_empresa ON public.doc_sequencias
  FOR ALL
  USING      ((SELECT user_has_empresa_access(empresa_id)))
  WITH CHECK ((SELECT user_has_empresa_access(empresa_id)));

-- ── Continuar de onde os documentos já vão ──────────────────────────────────
-- Sem este arranque, o contador começava em 1 e a próxima proposta repetia um
-- número já emitido — que é exatamente o que viemos evitar.
INSERT INTO public.doc_sequencias (empresa_id, tipo, ano, ultimo)
SELECT empresa_id, 'proposta', ano, MAX(numero_sequencial)
FROM public.propostas
WHERE empresa_id IS NOT NULL AND ano IS NOT NULL
GROUP BY empresa_id, ano
ON CONFLICT (empresa_id, tipo, ano)
DO UPDATE SET ultimo = GREATEST(doc_sequencias.ultimo, EXCLUDED.ultimo);

INSERT INTO public.doc_sequencias (empresa_id, tipo, ano, ultimo)
SELECT empresa_id, 'pedido_orcamento', ano, MAX(numero_sequencial)
FROM public.pedidos_orcamento
WHERE empresa_id IS NOT NULL AND ano IS NOT NULL
GROUP BY empresa_id, ano
ON CONFLICT (empresa_id, tipo, ano)
DO UPDATE SET ultimo = GREATEST(doc_sequencias.ultimo, EXCLUDED.ultimo);

-- ── Reservar o próximo ──────────────────────────────────────────────────────
-- Uma só instrução: o INSERT ... ON CONFLICT DO UPDATE tranca a linha, e quem
-- chegar a seguir espera e recebe o número seguinte. É esta indivisibilidade
-- que resolve o problema — não adianta ler e escrever em passos separados,
-- por muito juntos que estejam.
CREATE OR REPLACE FUNCTION public.doc_proximo_numero(
  p_empresa_id UUID, p_tipo TEXT, p_ano INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numero INTEGER;
BEGIN
  IF NOT user_has_empresa_access(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem acesso a esta empresa.';
  END IF;

  INSERT INTO doc_sequencias (empresa_id, tipo, ano, ultimo)
  VALUES (p_empresa_id, p_tipo, p_ano, 1)
  ON CONFLICT (empresa_id, tipo, ano)
  DO UPDATE SET ultimo = doc_sequencias.ultimo + 1
  RETURNING ultimo INTO v_numero;

  RETURN v_numero;
END $$;

/**
 * Só para MOSTRAR no ecrã. Não reserva nada.
 *
 * O formulário mostra o número antes de a pessoa gravar, e se reservasse já,
 * cada formulário aberto e fechado deixava um buraco na numeração. O número
 * definitivo é atribuído no momento de gravar.
 */
CREATE OR REPLACE FUNCTION public.doc_numero_previsto(
  p_empresa_id UUID, p_tipo TEXT, p_ano INTEGER
) RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT ultimo FROM doc_sequencias
    WHERE empresa_id = p_empresa_id AND tipo = p_tipo AND ano = p_ano
  ), 0) + 1;
$$;

-- ============================================================================
-- As Notas de Encomenda e as Ordens de Serviço já numeram na base por trigger
-- e não precisam desta correção. Ficam de fora de propósito.
-- ============================================================================
