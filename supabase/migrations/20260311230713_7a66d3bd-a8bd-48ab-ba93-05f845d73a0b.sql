
-- Storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT DO NOTHING;

-- RLS for logos bucket
CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Authenticated users can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

-- Extend empresas with additional fields for settings
CREATE TABLE IF NOT EXISTS public.liberty_empresas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  nome_razao_social TEXT,
  nome_fantasia TEXT,
  nif TEXT,
  registo_comercial TEXT,
  capital_social TEXT,
  morada TEXT,
  codigo_postal TEXT,
  localidade TEXT,
  pais TEXT DEFAULT 'Portugal',
  telefone TEXT,
  email_comercial TEXT,
  email_geral TEXT,
  email_internacional TEXT,
  website TEXT,
  taxa_iva_padrao DECIMAL(5,2) DEFAULT 23.00,
  moeda_padrao TEXT DEFAULT 'EUR',
  prefixo_propostas TEXT DEFAULT 'BO',
  texto_condicoes TEXT,
  texto_pagamento TEXT,
  texto_validade TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.liberty_empresas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view liberty_empresas_config" ON public.liberty_empresas_config FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert liberty_empresas_config" ON public.liberty_empresas_config FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update liberty_empresas_config" ON public.liberty_empresas_config FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete liberty_empresas_config" ON public.liberty_empresas_config FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- User preferences table
CREATE TABLE IF NOT EXISTS public.liberty_configuracoes_utilizador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilizador_id UUID NOT NULL REFERENCES liberty_utilizadores(id) ON DELETE CASCADE UNIQUE,
  tema TEXT DEFAULT 'claro',
  densidade TEXT DEFAULT 'normal',
  tamanho_fonte INTEGER DEFAULT 14,
  sidebar_expandida BOOLEAN DEFAULT true,
  notif_resumo_diario BOOLEAN DEFAULT false,
  notif_hora_resumo TIME DEFAULT '08:00',
  notif_alertas_email BOOLEAN DEFAULT true,
  notif_email_destino TEXT,
  alertas_ativos JSONB DEFAULT '{}',
  dashboard_cards JSONB DEFAULT '[]',
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.liberty_configuracoes_utilizador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view liberty_configuracoes_utilizador" ON public.liberty_configuracoes_utilizador FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert liberty_configuracoes_utilizador" ON public.liberty_configuracoes_utilizador FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update liberty_configuracoes_utilizador" ON public.liberty_configuracoes_utilizador FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Webhooks table
CREATE TABLE IF NOT EXISTS public.liberty_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  evento TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  secret TEXT,
  ultimo_envio TIMESTAMPTZ,
  ultimo_estado TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.liberty_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view liberty_webhooks" ON public.liberty_webhooks FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert liberty_webhooks" ON public.liberty_webhooks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update liberty_webhooks" ON public.liberty_webhooks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete liberty_webhooks" ON public.liberty_webhooks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lec_empresa ON liberty_empresas_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lcu_utilizador ON liberty_configuracoes_utilizador(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_lw_empresa ON liberty_webhooks(empresa_id, ativo);
