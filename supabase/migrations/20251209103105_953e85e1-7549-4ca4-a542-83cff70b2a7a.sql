-- Criar tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  nif TEXT, -- Número de Contribuinte
  morada_rua TEXT,
  morada_numero TEXT,
  morada_complemento TEXT,
  morada_concelho TEXT,
  morada_codigo_postal TEXT,
  morada_distrito TEXT,
  morada_pais TEXT DEFAULT 'Portugal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view clientes" 
ON public.clientes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert clientes" 
ON public.clientes 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update clientes" 
ON public.clientes 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete clientes" 
ON public.clientes 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Adicionar referência do cliente na tabela de serviços
ALTER TABLE public.services ADD COLUMN cliente_id UUID REFERENCES public.clientes(id);