-- ============================================================
-- ETL: ITC Supabase (mohxhkwuoubxbelgndux) → Clariza (qeskzaodgfveidyeghbm)
--
-- INSTRUÇÕES:
-- 1. Aplicar primeiro a migration 20260614000000_school-tables.sql no Clariza
-- 2. Ir ao SQL Editor do Supabase ITC (mohxhkwuoubxbelgndux)
-- 3. Correr a QUERY DE EXTRACÇÃO abaixo para obter os dados
-- 4. Ir ao SQL Editor do Clariza (qeskzaodgfveidyeghbm)
-- 5. Substituir EMPRESA_ITC_ID pelo UUID real da empresa ITC no Clariza
-- 6. Correr a QUERY DE INSERÇÃO com os dados extraídos
--
-- REGRA: apenas INSERT — nunca UPDATE ou DELETE nos dados originais
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PARTE 1 — EXTRAIR do Supabase ITC
-- (Correr no SQL Editor de mohxhkwuoubxbelgndux)
-- ────────────────────────────────────────────────────────────

-- 1A. Cursos
SELECT
  id,
  nome,
  categoria,
  descricao,
  carga_horaria,
  sigla_certificado,
  validade_meses,
  horas_teoricas,
  horas_praticas,
  conteudo_programatico,
  objetivo,
  metodologia,
  reconhecimento,
  aprovacao_minima,
  url_site,
  ativo
FROM public.cursos
ORDER BY nome;

-- 1B. Docentes (Instrutores)
SELECT
  id,
  nome,
  email,
  telefone,
  foto_url,
  formacao,
  especializacao,
  tempo_experiencia,
  resumo_ia,
  cursos_ids,
  ativo
FROM public.docentes
ORDER BY nome;

-- 1C. Alunos
SELECT
  id,
  nome,
  email,
  cpf,
  telefone,
  data_nascimento,
  status,
  empresa_trabalho,
  foto_url,
  ativo
FROM public.alunos
ORDER BY nome;

-- 1D. Turmas
SELECT
  id,
  titulo,
  curso_id,
  docente_id,
  status,
  modalidade,
  inicio,
  fim,
  vagas,
  local
FROM public.turmas
ORDER BY created_at;

-- 1E. Matrículas
SELECT
  id,
  aluno_id,
  turma_id,
  status,
  data_matricula,
  nota_final,
  observacoes
FROM public.matriculas
ORDER BY data_matricula;

-- 1F. Certificados
SELECT
  id,
  aluno_id,
  turma_id,
  docente_id,
  codigo,
  emitido_em,
  validade_em,
  url_pdf
FROM public.certificados
ORDER BY emitido_em;

-- 1G. Documentos dos docentes (paths do Storage)
SELECT
  id,
  docente_id,
  tipo_documento,
  nome_ficheiro,
  storage_path,
  tamanho_bytes,
  mime_type,
  validade
FROM public.docentes_documentos
ORDER BY created_at;


-- ────────────────────────────────────────────────────────────
-- PARTE 2 — INSERIR no Clariza
-- (Correr no SQL Editor de qeskzaodgfveidyeghbm)
-- Substituir 'EMPRESA_ITC_ID' pelo UUID real
-- ────────────────────────────────────────────────────────────

-- IMPORTANTE: correr em transacção para garantir atomicidade
BEGIN;

-- 2A. Cursos — substituir os VALUES pelos dados da query 1A
-- INSERT INTO public.school_cursos (id, empresa_id, nome, categoria, descricao, carga_horaria, sigla_certificado, validade_meses, horas_teoricas, horas_praticas, conteudo_programatico, objetivo, metodologia, reconhecimento, aprovacao_minima, url_site, ativo)
-- VALUES
--   ('uuid-do-curso-1', 'EMPRESA_ITC_ID', 'NR-35 Supervisor', 'NR', null, 40, 'NR35', 24, 20, 20, '[]', null, null, null, 70, 'https://itctreinamentos.com.br/...', true),
--   ...
-- ON CONFLICT (id) DO NOTHING;

-- 2B. Docentes
-- INSERT INTO public.school_docentes (id, empresa_id, nome, email, telefone, foto_url, formacao, especializacao, tempo_experiencia, resumo_ia, cursos_ids, ativo)
-- VALUES (...)
-- ON CONFLICT (id) DO NOTHING;

-- 2C. Alunos
-- INSERT INTO public.school_alunos (id, empresa_id, nome, email, cpf, telefone, data_nascimento, status, empresa_trabalho, foto_url, ativo)
-- VALUES (...)
-- ON CONFLICT (id) DO NOTHING;

-- 2D. Turmas
-- INSERT INTO public.school_turmas (id, empresa_id, titulo, curso_id, docente_id, status, modalidade, inicio, fim, vagas, local)
-- VALUES (...)
-- ON CONFLICT (id) DO NOTHING;

-- 2E. Matrículas
-- INSERT INTO public.school_matriculas (id, empresa_id, aluno_id, turma_id, status, data_matricula, nota_final, observacoes)
-- VALUES (...)
-- ON CONFLICT (id) DO NOTHING;

-- 2F. Certificados
-- INSERT INTO public.school_certificados (id, empresa_id, aluno_id, turma_id, docente_id, codigo, emitido_em, validade_em, url_pdf)
-- VALUES (...)
-- ON CONFLICT (id) DO NOTHING;

-- 2G. Documentos dos docentes (referências de Storage — os ficheiros continuam no ITC até serem copiados)
-- INSERT INTO public.school_docentes_documentos (id, empresa_id, docente_id, tipo_documento, nome_ficheiro, storage_path, tamanho_bytes, mime_type, validade)
-- VALUES (...)
-- ON CONFLICT (id) DO NOTHING;

COMMIT;
