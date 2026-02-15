
-- Redes Sociais e Nacionalidade
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS linkedin text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS nacionalidade text;

-- Documentação
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS cartao_cidadao text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS autorizacao_residencia text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS passaporte text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS niss text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS utente text;

-- País na morada
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Portugal';
