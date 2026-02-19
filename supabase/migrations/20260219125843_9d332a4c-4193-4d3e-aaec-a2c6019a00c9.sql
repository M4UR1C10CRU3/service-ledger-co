
-- Rename existing Obrajusta
UPDATE public.empresas 
SET nome = 'Obrajusta II', nome_legal = 'Obrajusta II - Construção, Lda', updated_at = now()
WHERE id = '11b58be4-d44b-4063-a462-b6b724b3f221';

-- New: Obrajusta (clone with same colors/logo)
INSERT INTO public.empresas (slug, nome, nome_legal, cor_primaria, cor_secundaria, cor_accent)
VALUES ('obrajusta-gestao', 'Obrajusta', 'Obrajusta - Gestão de Obra, Lda', '#3b82f6', '#1e40af', '#60a5fa');

-- New: Tudo Casa - Matrizchamer (clone with same colors/logo as Tudo Casa)
INSERT INTO public.empresas (slug, nome, nome_legal, cor_primaria, cor_secundaria, cor_accent)
VALUES ('tudocasa-matrizchamer', 'Tudo Casa', 'Tudo Casa - Matrizchamer, Lda', '#ff6b00', '#000000', '#ffd700');

-- New: Resiserv (green theme from logo)
INSERT INTO public.empresas (slug, nome, nome_legal, cor_primaria, cor_secundaria, cor_accent)
VALUES ('resiserv', 'Resiserv', 'Resiserv - Serviços, Reciclagem e Gestão de Resíduos, Lda', '#6B8E23', '#2E5016', '#8BC34A');
