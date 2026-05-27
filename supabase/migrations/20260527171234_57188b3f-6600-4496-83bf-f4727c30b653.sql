
-- ============================================================
-- 1. TEMPLATES
-- ============================================================
CREATE TABLE public.os_checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_checklist_templates TO authenticated;
GRANT ALL ON public.os_checklist_templates TO service_role;

ALTER TABLE public.os_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates visíveis a autenticados"
  ON public.os_checklist_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Templates criar autenticados"
  ON public.os_checklist_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Templates editar autenticados"
  ON public.os_checklist_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Templates apagar autenticados"
  ON public.os_checklist_templates FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 2. ITENS DO TEMPLATE
-- ============================================================
CREATE TABLE public.os_checklist_template_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.os_checklist_templates(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  titulo TEXT NOT NULL,
  responsavel_padrao TEXT,
  dias_offset INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_oscti_template ON public.os_checklist_template_itens(template_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_checklist_template_itens TO authenticated;
GRANT ALL ON public.os_checklist_template_itens TO service_role;

ALTER TABLE public.os_checklist_template_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Itens template select autenticados"
  ON public.os_checklist_template_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Itens template insert autenticados"
  ON public.os_checklist_template_itens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Itens template update autenticados"
  ON public.os_checklist_template_itens FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Itens template delete autenticados"
  ON public.os_checklist_template_itens FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 3. LIGAÇÃO ENTRE OS E TEMPLATE
-- ============================================================
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS template_id UUID NULL REFERENCES public.os_checklist_templates(id);

-- ============================================================
-- 4. SEED dos 4 templates iniciais
-- ============================================================
DO $$
DECLARE
  t_venda    UUID := gen_random_uuid();
  t_atend    UUID := gen_random_uuid();
  t_urgente  UUID := gen_random_uuid();
  t_encom    UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.os_checklist_templates (id, nome, descricao, ordem) VALUES
    (t_venda,   'Venda Direta em Loja ao Cliente',           'Fluxo de venda balcão presencial', 1),
    (t_atend,   'Atendimento para Orçamentação',             'Levantamento e elaboração de proposta', 2),
    (t_urgente, 'Intervenção Imediata Urgente',              'Intervenção rápida sem fase comercial', 3),
    (t_encom,   'Encomenda de Material / Proposta Aprovada', 'Execução após adjudicação', 4);

  -- VENDA DIRETA EM LOJA
  INSERT INTO public.os_checklist_template_itens (template_id, ordem, titulo, responsavel_padrao, dias_offset) VALUES
    (t_venda, 0, 'Realizar o atendimento ao cliente em loja e identificar o que ele precisa', 'Loja', 0),
    (t_venda, 1, 'Fazer sugestões de produtos quando houver mais de uma opção e stock do material', 'Loja', 0),
    (t_venda, 2, 'Abrir e digitalizar serviço', 'Loja', 0),
    (t_venda, 3, 'Emitir direto a fatura (se necessário)', 'Loja', 0),
    (t_venda, 4, 'Elaborar a proposta', 'Comercial', 1),
    (t_venda, 5, 'Efetuar a venda do material para o cliente em loja', 'Loja', 0),
    (t_venda, 6, 'Receber o pagamento (multibanco ou numerário) e fazer lançamentos no movimento do caixa', 'Loja', 0),
    (t_venda, 7, 'Inserir lançamento na plataforma Liberty', 'Loja', 1),
    (t_venda, 8, 'Arquivar toda a documentação adequadamente', 'Loja', 2);

  -- ATENDIMENTO PARA ORÇAMENTAÇÃO
  INSERT INTO public.os_checklist_template_itens (template_id, ordem, titulo, responsavel_padrao, dias_offset) VALUES
    (t_atend, 0, 'Abrir e digitalizar serviço', 'Comercial', 0),
    (t_atend, 1, 'Visitar cliente para tirar medidas / levantamento técnico', 'Produção', 2),
    (t_atend, 2, 'Repassar dados para elaboração da proposta', 'Comercial', 3),
    (t_atend, 3, 'Elaborar a proposta', 'Comercial', 4),
    (t_atend, 4, 'Aguarda visita do cliente em loja para apresentar e definir produtos', 'Loja', 5),
    (t_atend, 5, 'Confirmar a aprovação dos artigos enviados ao cliente', 'Comercial', 6),
    (t_atend, 6, 'Validação da proposta com o Diretor', 'Diretor', 7),
    (t_atend, 7, 'Enviar proposta ao cliente para aprovação', 'Comercial', 7),
    (t_atend, 8, 'Combinar prazo com o cliente para ter feedback', 'Comercial', 10);

  -- INTERVENÇÃO IMEDIATA URGENTE
  INSERT INTO public.os_checklist_template_itens (template_id, ordem, titulo, responsavel_padrao, dias_offset) VALUES
    (t_urgente, 0, 'Abrir e digitalizar serviço na rede', 'Comercial', 0),
    (t_urgente, 1, 'Enviar equipa de produção para o local', 'Produção', 0),
    (t_urgente, 2, 'Repassar informações quanto à conclusão do serviço', 'Produção', 1),
    (t_urgente, 3, 'Elaborar proposta para fechamento do serviço', 'Comercial', 2),
    (t_urgente, 4, 'Validar proposta com o Diretor', 'Diretor', 2),
    (t_urgente, 5, 'Abrir serviço para a saída de materiais', 'Loja', 1),
    (t_urgente, 6, 'Emitir fatura se necessário', 'Financeiro', 3),
    (t_urgente, 7, 'Enviar cobrança (fatura) para o cliente', 'Financeiro', 3),
    (t_urgente, 8, 'Inserir o serviço nas plataformas de débitos', 'Financeiro', 4),
    (t_urgente, 9, 'Arquivar toda documentação adequadamente', 'Comercial', 5),
    (t_urgente, 10, 'Acompanhar processo', 'Comercial', 7);

  -- ENCOMENDA DE MATERIAL / PROPOSTA APROVADA
  INSERT INTO public.os_checklist_template_itens (template_id, ordem, titulo, responsavel_padrao, dias_offset) VALUES
    (t_encom, 0, 'Contactar os fornecedores e formalizar a encomenda dos materiais', 'Compras', 1),
    (t_encom, 1, 'Validar faturas proforma com o Diretor', 'Diretor', 2),
    (t_encom, 2, 'Solicitar pagamento das encomendas ao Dep. Financeiro', 'Financeiro', 2),
    (t_encom, 3, 'Informar a chegada do material em loja ao Diretor e ao cliente', 'Loja', 7),
    (t_encom, 4, 'Agendar a entrega e instalação do equipamento no cliente', 'Produção', 8),
    (t_encom, 5, 'Informar após a conclusão dos serviços para fechamento', 'Produção', 12),
    (t_encom, 6, 'Emitir fatura para efeitos de garantia', 'Financeiro', 13),
    (t_encom, 7, 'Fechar o serviço e enviar fatura e cobrança ao cliente', 'Financeiro', 14),
    (t_encom, 8, 'Inserir em todas as plataformas de monitoramento de débitos', 'Financeiro', 14),
    (t_encom, 9, 'Realizar levantamento de custos de obra / serviço', 'Comercial', 15);
END $$;
