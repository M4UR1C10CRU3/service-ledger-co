
-- Tabela de entregas (uploads) por dia do calendário editorial
CREATE TABLE public.marketing_editorial_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  ano INT NOT NULL,
  mes INT NOT NULL,
  dia INT NOT NULL,
  nome TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | aprovado | rejeitado
  comentario_aprovacao TEXT,
  uploaded_by UUID,
  uploaded_by_nome TEXT,
  aprovado_por UUID,
  aprovado_por_nome TEXT,
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_med_empresa_periodo ON public.marketing_editorial_entregas(empresa_id, ano, mes, dia);

ALTER TABLE public.marketing_editorial_entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read med" ON public.marketing_editorial_entregas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert med" ON public.marketing_editorial_entregas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update med" ON public.marketing_editorial_entregas
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete med" ON public.marketing_editorial_entregas
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER med_set_updated_at
  BEFORE UPDATE ON public.marketing_editorial_entregas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket (privado) + políticas
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-editorial', 'marketing-editorial', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read med bucket" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'marketing-editorial');
CREATE POLICY "auth upload med bucket" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'marketing-editorial');
CREATE POLICY "auth update med bucket" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'marketing-editorial');
CREATE POLICY "auth delete med bucket" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'marketing-editorial');
