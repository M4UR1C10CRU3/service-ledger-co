ALTER TABLE public.pedidos_orcamento
  ADD COLUMN IF NOT EXISTS tipo_pedido text NOT NULL DEFAULT 'orcamentacao',
  ADD COLUMN IF NOT EXISTS os_id uuid,
  ADD COLUMN IF NOT EXISTS numero_os text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pedidos_orcamento_tipo_pedido_check') THEN
    ALTER TABLE public.pedidos_orcamento
      ADD CONSTRAINT pedidos_orcamento_tipo_pedido_check
      CHECK (tipo_pedido IN ('orcamentacao','intervencao_imediata'));
  END IF;
END $$;

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS po_id uuid,
  ADD COLUMN IF NOT EXISTS numero_po text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_orcamento_os_id_fkey') THEN
    ALTER TABLE public.pedidos_orcamento
      ADD CONSTRAINT pedidos_orcamento_os_id_fkey
      FOREIGN KEY (os_id) REFERENCES public.ordens_servico(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ordens_servico_po_id_fkey') THEN
    ALTER TABLE public.ordens_servico
      ADD CONSTRAINT ordens_servico_po_id_fkey
      FOREIGN KEY (po_id) REFERENCES public.pedidos_orcamento(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pedidos_orcamento_os_id ON public.pedidos_orcamento(os_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_po_id ON public.ordens_servico(po_id);