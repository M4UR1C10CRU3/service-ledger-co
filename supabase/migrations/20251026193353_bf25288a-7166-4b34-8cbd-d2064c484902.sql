-- Limpar duplicatas mantendo apenas o registro mais antigo de cada service_id
DELETE FROM public.services 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY service_id ORDER BY created_at ASC) as rn
    FROM public.services
  ) t 
  WHERE t.rn > 1
);

-- Adicionar constraint UNIQUE no service_id para prevenir duplicatas futuras
ALTER TABLE public.services 
ADD CONSTRAINT services_service_id_unique UNIQUE (service_id);