
-- Tabela de funções/cargos
CREATE TABLE public.job_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_job_positions_empresa ON public.job_positions(empresa_id);
CREATE INDEX idx_job_positions_active ON public.job_positions(is_active);

-- RLS
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view job_positions"
ON public.job_positions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert job_positions"
ON public.job_positions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update job_positions"
ON public.job_positions FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete job_positions"
ON public.job_positions FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER update_job_positions_updated_at
BEFORE UPDATE ON public.job_positions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Inserir funções padrão (sem empresa_id = globais)
INSERT INTO public.job_positions (name, description) VALUES
('Pedreiro', 'Profissional especializado em construção e alvenaria'),
('Servente', 'Auxiliar de obras e serviços gerais'),
('Técnico Comercial', 'Responsável por vendas e atendimento comercial'),
('Técnico de Obras', 'Supervisão e acompanhamento técnico de obras'),
('Assistente Administrativo', 'Suporte administrativo e gestão documental'),
('Comercial Externo de Vendas', 'Representante comercial externo'),
('Engenheiro', 'Engenheiro especializado'),
('Arquiteto', 'Profissional de arquitetura e projetos'),
('Chefe de Equipa', 'Coordenador e líder de equipa');

-- Tabela de colaboradores
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  
  -- Dados Pessoais
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  birth_date DATE,
  photo_url TEXT,
  
  -- Morada
  street TEXT,
  street_number TEXT,
  freguesia TEXT,
  concelho TEXT,
  codigo_postal TEXT,
  
  -- Dados Profissionais
  job_position_id UUID REFERENCES public.job_positions(id),
  department TEXT,
  monthly_salary NUMERIC(10,2),
  nif TEXT,
  activities_summary TEXT,
  admission_date DATE,
  
  -- Benefícios
  benefits JSONB DEFAULT '{"vale_transporte": false, "vale_alimentacao": false, "plano_saude": false, "seguro_vida": false, "outros": ""}'::jsonb,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_employees_empresa ON public.employees(empresa_id);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_employees_position ON public.employees(job_position_id);

-- RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view employees"
ON public.employees FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert employees"
ON public.employees FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update employees"
ON public.employees FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete employees"
ON public.employees FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Storage bucket para fotos de colaboradores
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-photos', 'employee-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view employee photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-photos');

CREATE POLICY "Authenticated users can upload employee photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update employee photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'employee-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete employee photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'employee-photos' AND auth.uid() IS NOT NULL);
