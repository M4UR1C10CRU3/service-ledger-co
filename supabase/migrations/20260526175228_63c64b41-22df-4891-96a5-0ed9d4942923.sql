
DO $$
DECLARE
  v_sup_id uuid;
  v_emp_id uuid := '71bf4313-33ef-4cf0-991c-022cdde3f88a'; -- Tudo Casa
BEGIN
  INSERT INTO public.suppliers (
    empresa_id, tipo_pessoa, razao_social, cnpj_cpf, categoria,
    telefone, telefone_secundario, cep, logradouro, numero, cidade,
    pais, status, gamas, observacoes
  ) VALUES (
    v_emp_id, 'juridica', 'Guilherme Basto Sucessores, Lda', '500131872', 'materia_prima',
    '+351 965868379', '+351 278264630', '5370-347', 'Rua da República', '16', 'Mirandela',
    'Portugal', 'ativo', ARRAY['Ferragens e Outros','Tubagens e Artigos de Canalização'],
    'Nº interno: 118 | Moeda: Euro'
  ) RETURNING id INTO v_sup_id;

  INSERT INTO public.produtos (empresa_id, ref_interna, descricao, categoria, unidade, preco_custo, iva_custo, margem, fornecedor_1_id, origem) VALUES
    (v_emp_id, 'GBS-GYP-HIDRO-2500', 'Gyptec Placa Gesso Hidro 2500×1200', 'Construção / Pladur / Acabamentos', 'un', 11.30, 23, 50, v_sup_id, 'manual'),
    (v_emp_id, 'GBS-CANAL-48-055',  'Canal 48 – 3000 × 0,55',              'Construção / Pladur / Acabamentos', 'un',  1.63, 23, 50, v_sup_id, 'manual'),
    (v_emp_id, 'GBS-MONT-48-06',    'Montante 48 – 3000 × 0,6',            'Construção / Pladur / Acabamentos', 'un',  1.95, 23, 50, v_sup_id, 'manual'),
    (v_emp_id, 'GBS-SEMIN-PJ2H-25', 'SEMIN – Pasta Juntas 2 Horas 25 Kg',  'Construção / Pladur / Acabamentos', 'un', 13.41, 23, 50, v_sup_id, 'manual');
END $$;
