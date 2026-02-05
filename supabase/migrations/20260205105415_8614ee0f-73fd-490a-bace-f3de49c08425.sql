-- Transferir serviços WMTCEC da Obrajusta para Tudo Casa
UPDATE public.services 
SET empresa_id = '71bf4313-33ef-4cf0-991c-022cdde3f88a'
WHERE servico LIKE 'WMTCEC%' 
  AND empresa_id = '11b58be4-d44b-4063-a462-b6b724b3f221';