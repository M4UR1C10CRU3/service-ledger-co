-- Kanban phase columns for Financeiro swim lanes
-- Non-destructive: ADD COLUMN IF NOT EXISTS only

-- Lane 1: Pagamentos a Fornecedores — driven by notas_encomenda (when estado = encomendada/recebida)
ALTER TABLE public.notas_encomenda
  ADD COLUMN IF NOT EXISTS fase_pagamento TEXT NOT NULL DEFAULT 'pendente'
    CHECK (fase_pagamento IN ('pendente', 'comprovativo_enviado', 'confirmado'));

-- Lanes 2 & 3: Recebimentos and Cobranças — driven by services table
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS fase_recebimento TEXT NOT NULL DEFAULT 'aguardando'
    CHECK (fase_recebimento IN ('aguardando', 'fatura_enviada', 'parcial', 'recebido'));

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS fase_cobranca TEXT NOT NULL DEFAULT 'em_debito'
    CHECK (fase_cobranca IN ('em_debito', 'primeira_cobranca', 'segunda_cobranca', 'em_acordo', 'liquidado'));

-- Indexes for filtering performance
CREATE INDEX IF NOT EXISTS idx_ne_estado_fase
  ON public.notas_encomenda (empresa_id, estado, fase_pagamento);

CREATE INDEX IF NOT EXISTS idx_services_fases
  ON public.services (service_id, fase_recebimento, fase_cobranca);
