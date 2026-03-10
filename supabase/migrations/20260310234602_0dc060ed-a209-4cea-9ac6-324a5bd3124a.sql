
-- Tabela principal de propostas
CREATE TABLE public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  numero_proposta TEXT NOT NULL,
  numero_sequencial INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  cliente_nome TEXT,
  cliente_morada TEXT,
  cliente_nif TEXT,
  vendedor_id UUID,
  vendedor_nome TEXT,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_emissao TIME NOT NULL DEFAULT CURRENT_TIME,
  validade_dias INTEGER DEFAULT 30,
  data_validade DATE,
  estado TEXT NOT NULL DEFAULT 'rascunho',
  titulo TEXT,
  descricao_geral TEXT,
  taxa_iva DECIMAL(5,2) DEFAULT 23.00,
  total_sem_iva DECIMAL(12,2) DEFAULT 0,
  valor_iva DECIMAL(12,2) DEFAULT 0,
  total_com_iva DECIMAL(12,2) DEFAULT 0,
  condicoes_gerais TEXT DEFAULT 'O valor acima indicado é acrescido de IVA à taxa legal em vigor.',
  validade_texto TEXT DEFAULT 'Proposta tem validade de 30 dias, sujeita a rectificação após esse prazo.',
  duracao TEXT,
  condicoes_pagamento TEXT DEFAULT 'Pagamento até 60 dias após a emissão de fatura.',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, numero_proposta)
);

-- Tabela de linhas da proposta
CREATE TABLE public.propostas_linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  ordem INTEGER NOT NULL,
  tipo_linha TEXT NOT NULL,
  referencia TEXT,
  designacao TEXT,
  quantidade DECIMAL(10,3) DEFAULT 1,
  unidade TEXT DEFAULT 'und',
  preco_unitario DECIMAL(12,4) DEFAULT 0,
  desconto_pct DECIMAL(5,2) DEFAULT 0,
  total_linha DECIMAL(12,4) DEFAULT 0,
  produto_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_propostas_empresa ON public.propostas(empresa_id);
CREATE INDEX idx_propostas_cliente ON public.propostas(cliente_id);
CREATE INDEX idx_propostas_estado ON public.propostas(estado);
CREATE INDEX idx_propostas_linhas_proposta ON public.propostas_linhas(proposta_id);
CREATE INDEX idx_propostas_linhas_ordem ON public.propostas_linhas(proposta_id, ordem);

-- RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propostas_linhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view propostas" ON public.propostas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert propostas" ON public.propostas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update propostas" ON public.propostas FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete propostas" ON public.propostas FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view propostas_linhas" ON public.propostas_linhas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert propostas_linhas" ON public.propostas_linhas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update propostas_linhas" ON public.propostas_linhas FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete propostas_linhas" ON public.propostas_linhas FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER set_propostas_updated_at BEFORE UPDATE ON public.propostas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
