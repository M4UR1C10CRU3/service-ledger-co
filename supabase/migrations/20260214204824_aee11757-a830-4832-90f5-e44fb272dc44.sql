
-- Create email_history table for tracking sent billing emails
CREATE TABLE public.email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  service_id TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  email_subject TEXT,
  email_type TEXT DEFAULT 'cobranca',
  valor_debito NUMERIC DEFAULT 0,
  dias_atraso INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view email_history"
ON public.email_history FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert email_history"
ON public.email_history FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete email_history"
ON public.email_history FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX idx_email_history_empresa ON public.email_history(empresa_id);
CREATE INDEX idx_email_history_service ON public.email_history(service_id);
