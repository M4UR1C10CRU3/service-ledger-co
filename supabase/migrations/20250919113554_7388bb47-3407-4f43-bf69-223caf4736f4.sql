-- Create services table to store data permanently
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id TEXT NOT NULL,
  data TEXT NOT NULL,
  servico TEXT NOT NULL,
  cliente TEXT NOT NULL,
  resumo TEXT,
  proposta TEXT,
  fatura TEXT,
  valor_com_iva DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_sem_iva DECIMAL(10,2) NOT NULL DEFAULT 0,
  liquidado DECIMAL(10,2) NOT NULL DEFAULT 0,
  a_realizar BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create backups table to store periodic backups
CREATE TABLE public.backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_data JSONB NOT NULL,
  backup_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  services_count INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security (though this is internal data, keeping it secure)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now since this is internal data)
CREATE POLICY "Allow all operations on services" 
ON public.services 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on backups" 
ON public.backups 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_services_service_id ON public.services(service_id);
CREATE INDEX idx_services_cliente ON public.services(cliente);
CREATE INDEX idx_backups_timestamp ON public.backups(backup_timestamp);