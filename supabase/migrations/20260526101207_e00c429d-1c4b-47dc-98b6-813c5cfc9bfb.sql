
CREATE TABLE public.pedidos_orcamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  numero_po TEXT NOT NULL,
  numero_sequencial INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  cliente_id UUID,
  cliente_nome TEXT NOT NULL,
  cliente_morada TEXT,
  cliente_nif TEXT,
  cliente_telefone TEXT,
  cliente_email TEXT,
  vendedor_id UUID,
  vendedor_nome TEXT,
  titulo TEXT,
  descricao_necessidade TEXT,
  obra TEXT,
  duracao_obra TEXT,
  local_execucao TEXT,
  estado TEXT NOT NULL DEFAULT 'recebido',
  validade_dias INTEGER DEFAULT 5,
  validade_texto TEXT,
  condicoes_pagamento TEXT,
  condicoes_gerais TEXT,
  observacoes TEXT,
  proposta_id UUID,
  numero_proposta TEXT,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_emissao TIME DEFAULT CURRENT_TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pedidos_orcamento_empresa ON public.pedidos_orcamento(empresa_id);
CREATE INDEX idx_pedidos_orcamento_ano ON public.pedidos_orcamento(ano);

CREATE TABLE public.po_linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.pedidos_orcamento(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  tipo_linha TEXT NOT NULL DEFAULT 'artigo',
  referencia TEXT,
  designacao TEXT,
  quantidade NUMERIC(10,3) DEFAULT 1,
  unidade TEXT DEFAULT 'und',
  observacao_linha TEXT
);

CREATE INDEX idx_po_linhas_po ON public.po_linhas(po_id);

ALTER TABLE public.pedidos_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_linhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth view pedidos_orcamento" ON public.pedidos_orcamento FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth insert pedidos_orcamento" ON public.pedidos_orcamento FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update pedidos_orcamento" ON public.pedidos_orcamento FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth delete pedidos_orcamento" ON public.pedidos_orcamento FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth view po_linhas" ON public.po_linhas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth insert po_linhas" ON public.po_linhas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update po_linhas" ON public.po_linhas FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth delete po_linhas" ON public.po_linhas FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_pedidos_orcamento_updated_at
BEFORE UPDATE ON public.pedidos_orcamento
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES public.pedidos_orcamento(id);
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS numero_po TEXT;
