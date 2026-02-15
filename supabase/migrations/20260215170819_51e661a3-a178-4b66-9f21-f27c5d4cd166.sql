
-- ============================================
-- 1. Tabela de Centros de Custo
-- ============================================
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cost_centers"
  ON public.cost_centers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert cost_centers"
  ON public.cost_centers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cost_centers"
  ON public.cost_centers FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cost_centers"
  ON public.cost_centers FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_cost_centers_empresa ON public.cost_centers(empresa_id);
CREATE INDEX idx_cost_centers_active ON public.cost_centers(is_active);

-- Inserir centros de custo globais (empresa_id NULL)
INSERT INTO public.cost_centers (empresa_id, name, description) VALUES
(NULL, 'Água', 'Despesas com consumo de água'),
(NULL, 'Energia Elétrica', 'Despesas com consumo de energia elétrica'),
(NULL, 'Internet e Telecomunicações', 'Telefone, internet, pacotes de dados'),
(NULL, 'Arrendamento', 'Aluguel de imóveis e espaços'),
(NULL, 'Serviços Especializados', 'Consultoria, assessoria, serviços técnicos'),
(NULL, 'CTT e Envios', 'Correios e serviços de envio'),
(NULL, 'Gestão de Frota', 'Combustível, manutenção, seguro de veículos'),
(NULL, 'Logística', 'Transporte, armazenamento, distribuição'),
(NULL, 'Alimentação', 'Refeições, lanches, vale alimentação'),
(NULL, 'Consumíveis', 'Material de expediente, limpeza, higiene'),
(NULL, 'Pessoal', 'Salários, encargos, benefícios'),
(NULL, 'Aquisição de Bens para Revenda', 'Compra de produtos para venda'),
(NULL, 'Notário', 'Serviços notariais e registros'),
(NULL, 'Mobiliário', 'Móveis e equipamentos de escritório'),
(NULL, 'Equipamentos', 'Equipamentos diversos'),
(NULL, 'Gráfica e Comunicação Visual', 'Impressão, sinalização, publicidade');

-- ============================================
-- 2. Adicionar cost_center_id a accounts_payable
-- ============================================
ALTER TABLE public.accounts_payable ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id);
ALTER TABLE public.accounts_payable ADD COLUMN IF NOT EXISTS alert_sent BOOLEAN DEFAULT false;
ALTER TABLE public.accounts_payable ADD COLUMN IF NOT EXISTS alert_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.accounts_payable ADD COLUMN IF NOT EXISTS days_before_alert INTEGER DEFAULT 5;

-- ============================================
-- 3. Tabela de Configurações de Alertas
-- ============================================
CREATE TABLE IF NOT EXISTS public.alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  alert_email VARCHAR(255) NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  alert_whatsapp VARCHAR(20),
  whatsapp_enabled BOOLEAN DEFAULT false,
  days_before_due INTEGER DEFAULT 5,
  send_on_due_date BOOLEAN DEFAULT true,
  send_after_overdue BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alert_settings"
  ON public.alert_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert alert_settings"
  ON public.alert_settings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update alert_settings"
  ON public.alert_settings FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 4. Tabela de Logs de Alertas
-- ============================================
CREATE TABLE IF NOT EXISTS public.alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  account_payable_id UUID REFERENCES public.accounts_payable(id),
  alert_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alert_logs"
  ON public.alert_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert alert_logs"
  ON public.alert_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_alert_logs_account ON public.alert_logs(account_payable_id);
CREATE INDEX idx_alert_logs_sent ON public.alert_logs(sent_at);

-- Trigger updated_at for cost_centers
CREATE TRIGGER update_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger updated_at for alert_settings
CREATE TRIGGER update_alert_settings_updated_at
  BEFORE UPDATE ON public.alert_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
