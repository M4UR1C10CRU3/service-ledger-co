-- Criar tabela para registrar todas as liquidações de cada serviço
CREATE TABLE IF NOT EXISTS public.liquidacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_pagamento TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.liquidacoes ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações
CREATE POLICY "Allow all operations on liquidacoes" 
ON public.liquidacoes 
FOR ALL 
USING (true);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_liquidacoes_updated_at
BEFORE UPDATE ON public.liquidacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remover campos de liquidação da tabela services já que agora teremos uma tabela separada
ALTER TABLE public.services 
DROP COLUMN IF EXISTS data_liquidacao,
DROP COLUMN IF EXISTS liquidacao_total;