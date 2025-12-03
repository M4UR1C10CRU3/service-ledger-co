-- Vincular a fatura parcial ao contrato da MATIZ
UPDATE public.services 
SET contrato_id = '1764778892489' 
WHERE service_id = '1764779084028';

-- Atualizar o valor_faturado do contrato manualmente (caso o trigger não tenha sido acionado)
UPDATE public.services 
SET valor_faturado = (
  SELECT COALESCE(SUM(valor_com_iva), 0) 
  FROM public.services 
  WHERE contrato_id = '1764778892489' AND tipo_servico = 'fatura'
)
WHERE service_id = '1764778892489';