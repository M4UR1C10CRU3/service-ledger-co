-- Fix the Ferragens do Tua purchase where IVA was incorrectly added on top of an already-IVA-included value
-- Original: bruto=28, iva_value=6.44, liquido=34.44 (WRONG - 28 already included IVA)
-- Correct:  bruto=22.76, iva_value=5.24, liquido=28.00

UPDATE public.accounts_payable
SET valor_bruto = 22.76,
    iva_rate = 23,
    iva_value = 5.24,
    valor_liquido = 28.00,
    updated_at = now()
WHERE id = '47133c4d-5ac0-4b12-a9c7-34292cd5c9f1';