-- E-commerce › Encomendas da loja (Tudo Casa - Warm) — 14/10/2026
-- Encomenda PAGA no WooCommerce → cartão automático no quadro «Encomendas da loja».
-- Escrita só pelas funções wc-encomenda e ecommerce-agente (service role); leitura por quem tem acesso à empresa.
-- Idempotente: pode correr-se mais de uma vez.

-- 1. Configuração por empresa (que quadro/lista recebe os cartões, quem é avisado)
CREATE TABLE IF NOT EXISTS public.ecommerce_config (
  empresa_id        UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  quadro_id         UUID REFERENCES public.quadros(id) ON DELETE SET NULL,
  lista_entrada_id  UUID REFERENCES public.quadro_listas(id) ON DELETE SET NULL,
  responsaveis      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ "id": liberty_utilizadores.id, "nome" }]: membros do cartão, avisados por e-mail
  criado_por        UUID REFERENCES auth.users(id),       -- autor dos cartões automáticos
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecommerce_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ecommerce_config select" ON public.ecommerce_config;
CREATE POLICY "ecommerce_config select" ON public.ecommerce_config
  FOR SELECT USING (public.user_has_empresa_access(empresa_id));

-- 2. Encomendas recebidas da loja
CREATE TABLE IF NOT EXISTS public.ecommerce_encomendas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  wc_order_id      BIGINT NOT NULL,
  numero           TEXT NOT NULL,
  estado_wc        TEXT,
  data_encomenda   TIMESTAMPTZ,
  pago_em          TIMESTAMPTZ,
  cliente_nome     TEXT,
  cliente_email    TEXT,
  cliente_telefone TEXT,
  cliente_nif      TEXT,
  morada_faturacao JSONB,
  morada_envio     JSONB,
  envio            TEXT,
  pagamento        TEXT,
  total            NUMERIC(12,2),
  itens            JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ sku, nome, qtd, total, fornecedor }]
  cartao_id        UUID REFERENCES public.quadro_cartoes(id) ON DELETE SET NULL,
  pasta_relativa   TEXT,                                  -- «Ano 2026\10 - Outubro\Encomenda #… - … - 8,33€ - 14 10 2026»
  pasta_criada_em  TIMESTAMPTZ,
  folha_path       TEXT,                                  -- bucket cartao-anexos
  anexos_enviados  JSONB NOT NULL DEFAULT '[]'::jsonb,    -- nomes de ficheiros da pasta já levados ao cartão
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, wc_order_id)
);
CREATE INDEX IF NOT EXISTS idx_ecom_encomendas_pasta ON public.ecommerce_encomendas (empresa_id, pasta_criada_em);
ALTER TABLE public.ecommerce_encomendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ecommerce_encomendas select" ON public.ecommerce_encomendas;
CREATE POLICY "ecommerce_encomendas select" ON public.ecommerce_encomendas
  FOR SELECT USING (public.user_has_empresa_access(empresa_id));

-- 3. Quadro «Encomendas da loja» na Tudo Casa - Warm, com as colunas do processo, e configuração
DO $$
DECLARE
  v_emp    UUID;
  v_quadro UUID;
  v_lista  UUID;
  v_resp   UUID := 'ea257446-4084-4fde-a88f-5a24587b0241';  -- Maurício Barreto (liberty_utilizadores.id: membro e avisos)
  v_autor  UUID := '9fb76513-ac29-413b-a04a-d776283bc798';  -- auth.users do mesmo utilizador (criado_por)
  v_nomes  TEXT[] := ARRAY[
    'Paga · por organizar',
    'Encomendado ao fornecedor',
    'Pago ao fornecedor',
    'Recebido · a preparar',
    'Pronto para envio ou levantamento',
    'Enviado ou levantado',
    'Concluído'];
  i INT;
BEGIN
  SELECT id INTO v_emp FROM public.empresas WHERE slug = 'tudocasa';
  IF v_emp IS NULL THEN RAISE EXCEPTION 'empresa tudocasa não encontrada'; END IF;

  SELECT id INTO v_quadro FROM public.quadros
   WHERE empresa_id = v_emp AND nome = 'Encomendas da loja' AND NOT arquivado LIMIT 1;
  IF v_quadro IS NULL THEN
    INSERT INTO public.quadros (empresa_id, nome, descricao, cor, criado_por)
    VALUES (v_emp, 'Encomendas da loja',
            'Encomendas pagas da loja online (lojatudocasa.com). Cada cartão abre sozinho quando a encomenda fica paga.',
            '#ff6b00', v_autor)
    RETURNING id INTO v_quadro;
    FOR i IN 1 .. array_length(v_nomes, 1) LOOP
      INSERT INTO public.quadro_listas (quadro_id, nome, posicao) VALUES (v_quadro, v_nomes[i], i - 1);
    END LOOP;
  END IF;

  SELECT id INTO v_lista FROM public.quadro_listas
   WHERE quadro_id = v_quadro AND NOT arquivado ORDER BY posicao LIMIT 1;

  INSERT INTO public.ecommerce_config (empresa_id, quadro_id, lista_entrada_id, responsaveis, criado_por)
  VALUES (v_emp, v_quadro, v_lista, jsonb_build_array(jsonb_build_object('id', v_resp, 'nome', 'Maurício Barreto')), v_autor)
  ON CONFLICT (empresa_id) DO UPDATE
    SET quadro_id = EXCLUDED.quadro_id, lista_entrada_id = EXCLUDED.lista_entrada_id, atualizado_em = now();
END $$;
