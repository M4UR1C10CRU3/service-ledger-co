-- Criar tabela de empresas
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  nome_legal TEXT,
  logo_path TEXT,
  cor_primaria TEXT NOT NULL DEFAULT '#3b82f6',
  cor_secundaria TEXT DEFAULT '#000000',
  cor_accent TEXT DEFAULT '#ffd700',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Policies para empresas (todos autenticados podem ver)
CREATE POLICY "Authenticated users can view empresas"
  ON public.empresas FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Inserir as duas empresas iniciais
INSERT INTO public.empresas (slug, nome, nome_legal, logo_path, cor_primaria, cor_secundaria, cor_accent) VALUES
('obrajusta', 'Obrajusta', 'OBRAJUSTA II, Lda', '/assets/logo-obrajusta.png', '#3b82f6', '#1e40af', '#60a5fa'),
('tudocasa', 'Tudo Casa', 'Tudo Casa - Warm Lda', '/assets/logo-tudocasa.png', '#ff6b00', '#000000', '#ffd700');

-- Adicionar coluna empresa_id na tabela services
ALTER TABLE public.services 
ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);

-- Atribuir todos os serviços existentes à Obrajusta
UPDATE public.services 
SET empresa_id = (SELECT id FROM public.empresas WHERE slug = 'obrajusta');

-- Tornar empresa_id NOT NULL após migrar dados existentes
ALTER TABLE public.services 
ALTER COLUMN empresa_id SET NOT NULL;

-- Adicionar empresa_id na tabela profiles para associar usuários a empresas
ALTER TABLE public.profiles 
ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);

-- Trigger para updated_at na tabela empresas
CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();