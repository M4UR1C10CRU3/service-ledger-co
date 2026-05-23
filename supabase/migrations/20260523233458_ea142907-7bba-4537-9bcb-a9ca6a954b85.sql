
-- ============================================
-- E-commerce: Inteligência Competitiva
-- ============================================

-- 1. Relatórios de análise competitiva
CREATE TABLE public.ecommerce_relatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  data_analise DATE NOT NULL DEFAULT CURRENT_DATE,
  resumo TEXT,
  relatorio JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ecom_relatorios_empresa ON public.ecommerce_relatorios(empresa_id, data_analise DESC);
ALTER TABLE public.ecommerce_relatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view ecommerce_relatorios" ON public.ecommerce_relatorios FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert ecommerce_relatorios" ON public.ecommerce_relatorios FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update ecommerce_relatorios" ON public.ecommerce_relatorios FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete ecommerce_relatorios" ON public.ecommerce_relatorios FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_ecom_relatorios_updated BEFORE UPDATE ON public.ecommerce_relatorios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Produtos monitorizados (watchlist)
CREATE TABLE public.ecommerce_produtos_monitorizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  referencia_interna TEXT,
  nome TEXT NOT NULL,
  categoria TEXT,
  preco_atual NUMERIC(12,4),
  precos_concorrentes JSONB NOT NULL DEFAULT '[]'::jsonb,
  proxima_revisao DATE,
  notas TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ecom_produtos_empresa ON public.ecommerce_produtos_monitorizados(empresa_id);
CREATE INDEX idx_ecom_produtos_revisao ON public.ecommerce_produtos_monitorizados(empresa_id, proxima_revisao);
ALTER TABLE public.ecommerce_produtos_monitorizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view ecommerce_produtos_monitorizados" ON public.ecommerce_produtos_monitorizados FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert ecommerce_produtos_monitorizados" ON public.ecommerce_produtos_monitorizados FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update ecommerce_produtos_monitorizados" ON public.ecommerce_produtos_monitorizados FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete ecommerce_produtos_monitorizados" ON public.ecommerce_produtos_monitorizados FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_ecom_produtos_updated BEFORE UPDATE ON public.ecommerce_produtos_monitorizados
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Ajustes de preço (log auditável)
CREATE TABLE public.ecommerce_ajustes_preco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  produto_id UUID REFERENCES public.ecommerce_produtos_monitorizados(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  referencia_interna TEXT,
  preco_anterior NUMERIC(12,4) NOT NULL,
  preco_novo NUMERIC(12,4) NOT NULL,
  variacao_eur NUMERIC(12,4) GENERATED ALWAYS AS (preco_novo - preco_anterior) STORED,
  variacao_pct NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE WHEN preco_anterior = 0 THEN NULL
    ELSE ((preco_novo - preco_anterior) / preco_anterior) * 100
    END
  ) STORED,
  justificacao TEXT,
  data_ajuste DATE NOT NULL DEFAULT CURRENT_DATE,
  ajustado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ecom_ajustes_empresa ON public.ecommerce_ajustes_preco(empresa_id, data_ajuste DESC);
CREATE INDEX idx_ecom_ajustes_produto ON public.ecommerce_ajustes_preco(produto_id);
ALTER TABLE public.ecommerce_ajustes_preco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view ecommerce_ajustes_preco" ON public.ecommerce_ajustes_preco FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert ecommerce_ajustes_preco" ON public.ecommerce_ajustes_preco FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update ecommerce_ajustes_preco" ON public.ecommerce_ajustes_preco FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete ecommerce_ajustes_preco" ON public.ecommerce_ajustes_preco FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- SEED: Tudo Casa - Warm, Lda
-- ============================================
INSERT INTO public.ecommerce_produtos_monitorizados
  (empresa_id, referencia_interna, nome, categoria, preco_atual, precos_concorrentes, proxima_revisao, notas)
VALUES
  ('71bf4313-33ef-4cf0-991c-022cdde3f88a', 'TC-AQ-001', 'Aquecedor a óleo 2000W', 'Aquecimento', 79.90,
    '[{"concorrente":"Worten","preco":84.99},{"concorrente":"Leroy Merlin","preco":82.50},{"concorrente":"Amazon ES","preco":76.40}]'::jsonb,
    CURRENT_DATE + INTERVAL '14 days', 'Procura sazonal alta no inverno.'),
  ('71bf4313-33ef-4cf0-991c-022cdde3f88a', 'TC-VT-014', 'Ventoinha de coluna 45W', 'Climatização', 34.50,
    '[{"concorrente":"Worten","preco":36.99},{"concorrente":"Continente","preco":32.99}]'::jsonb,
    CURRENT_DATE + INTERVAL '7 days', 'Concorrência agressiva no verão.'),
  ('71bf4313-33ef-4cf0-991c-022cdde3f88a', 'TC-UT-203', 'Tacho inox 24cm', 'Cozinha', 28.00,
    '[{"concorrente":"IKEA","preco":29.95},{"concorrente":"Worten","preco":31.50}]'::jsonb,
    CURRENT_DATE + INTERVAL '30 days', 'Margem confortável.');

INSERT INTO public.ecommerce_relatorios
  (empresa_id, titulo, data_analise, resumo, relatorio)
VALUES
  ('71bf4313-33ef-4cf0-991c-022cdde3f88a',
   'Análise competitiva — Maio 2026',
   CURRENT_DATE - INTERVAL '2 days',
   '3 produtos analisados. Posicionamento médio: 2º lugar em 2 categorias.',
   '{"produtos_analisados":3,"posicao_media":2.0,"recomendacoes":["Manter preço do aquecedor","Avaliar promoção na ventoinha","Subir 5% no tacho"],"competidores":["Worten","Leroy Merlin","IKEA","Continente","Amazon ES"]}'::jsonb);

INSERT INTO public.ecommerce_ajustes_preco
  (empresa_id, produto_nome, referencia_interna, preco_anterior, preco_novo, justificacao, data_ajuste)
VALUES
  ('71bf4313-33ef-4cf0-991c-022cdde3f88a', 'Aquecedor a óleo 2000W', 'TC-AQ-001', 82.90, 79.90, 'Alinhamento com Amazon ES.', CURRENT_DATE - INTERVAL '5 days'),
  ('71bf4313-33ef-4cf0-991c-022cdde3f88a', 'Ventoinha de coluna 45W', 'TC-VT-014', 32.99, 34.50, 'Recuperação de margem após estabilização do câmbio.', CURRENT_DATE - INTERVAL '10 days');
