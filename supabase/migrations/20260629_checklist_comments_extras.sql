-- Campos extra nos itens de checklist (responsável, hora, prazo)
ALTER TABLE cartao_checklist_items
  ADD COLUMN IF NOT EXISTS responsavel_id   uuid,
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS hora             time without time zone,
  ADD COLUMN IF NOT EXISTS data_limite      date;

-- Campos de resposta nos comentários (thread simples)
ALTER TABLE cartao_comentarios
  ADD COLUMN IF NOT EXISTS reply_to_id         uuid REFERENCES cartao_comentarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_autor_nome text,
  ADD COLUMN IF NOT EXISTS reply_to_texto      text;
