
CREATE OR REPLACE FUNCTION public.soft_delete_supplier(p_supplier_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.suppliers
  SET deleted_at = now()
  WHERE id = p_supplier_id
    AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;
