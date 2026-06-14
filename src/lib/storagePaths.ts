/**
 * Padrão canónico de paths no Supabase Storage.
 * Todos os uploads DEVEM usar estas funções — nunca construir paths inline.
 *
 * Estrutura: {empresa_id}/{entidade}/{registro_id}/{tipo}/{filename}
 *
 * Buckets existentes:
 *   employee-photos    — fotos de colaboradores
 *   cvs                — currículos de candidatos (recrutamento)
 *   subempreiteiros    — documentos de subempreiteiros
 *   logos              — logotipos de empresas
 *   proposta-pdfs      — propostas aceites (HTML)
 *   planeamento-anexos — anexos de cards de planeamento
 *   marketing-entregas — entregas de tarefas de marketing
 *
 * Buckets School (a criar):
 *   school-documentos  — diplomas, CVs, certificados de instrutores
 *   school-certificados — certificados de conclusão de curso (PDF)
 *   school-materiais   — materiais didácticos por curso
 *   school-fotos       — fotos de alunos e instrutores
 */

// ── Helpers ─────────────────────────────────────────────────────────────────

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
}

function ext(filename: string): string {
  return filename.split('.').pop() ?? 'bin';
}

// ── Colaboradores ────────────────────────────────────────────────────────────

export const employeePhotosPath = (empresaId: string, filename: string) =>
  `${empresaId}/${Date.now()}.${ext(filename)}`;

// ── Recrutamento ─────────────────────────────────────────────────────────────

export const cvPath = (empresaId: string, vagaId: string, filename: string) =>
  `${empresaId}/${vagaId}/${Date.now()}_${sanitize(filename)}`;

// ── Subempreiteiros ──────────────────────────────────────────────────────────

export const subempreiteiroDocPath = (empresaId: string, subId: string, filename: string) =>
  `${empresaId}/${subId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext(filename)}`;

// ── Empresas ─────────────────────────────────────────────────────────────────

export const logoPath = (empresaId: string, filename: string) =>
  `${empresaId}/logo.${ext(filename)}`;

// ── Propostas ────────────────────────────────────────────────────────────────

export const propostaPdfPath = (empresaId: string, numeroProposta: string) =>
  `${empresaId}/propostas/${numeroProposta.replace(/[:*?"<>|]/g, '-').trim()}.html`;

// ── Planeamento ──────────────────────────────────────────────────────────────

export const planeamentoAnexoPath = (empresaId: string, cardId: string, filename: string) =>
  `${empresaId}/${cardId}/${Date.now()}_${sanitize(filename)}`;

// ── Marketing ────────────────────────────────────────────────────────────────

export const marketingAnexoPath = (empresaId: string, tarefaId: string, filename: string) =>
  `${empresaId}/${tarefaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext(filename)}`;

export const marketingEntregaPath = (
  empresaId: string,
  year: number,
  month: number,
  dia: number,
  filename: string,
) =>
  `${empresaId}/${year}-${String(month).padStart(2, '0')}/dia-${dia}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext(filename)}`;

// ── School — Instrutores ──────────────────────────────────────────────────────

export const schoolInstrutorDocPath = (
  empresaId: string,
  instrutorId: string,
  tipo: 'diplomas' | 'certificados' | 'cv' | 'outros',
  filename: string,
) => `${empresaId}/instrutores/${instrutorId}/${tipo}/${Date.now()}_${sanitize(filename)}`;

export const schoolInstrutorFotoPath = (empresaId: string, instrutorId: string, filename: string) =>
  `${empresaId}/instrutores/${instrutorId}/foto.${ext(filename)}`;

// ── School — Alunos ───────────────────────────────────────────────────────────

export const schoolAlunoFotoPath = (empresaId: string, alunoId: string, filename: string) =>
  `${empresaId}/alunos/${alunoId}/foto.${ext(filename)}`;

// ── School — Certificados ─────────────────────────────────────────────────────

export const schoolCertificadoPath = (
  empresaId: string,
  ano: number,
  codigoUnico: string,
) => `${empresaId}/certificados/${ano}/${sanitize(codigoUnico)}.pdf`;

// ── School — Materiais Didácticos ─────────────────────────────────────────────

export const schoolMaterialPath = (empresaId: string, cursoId: string, filename: string) =>
  `${empresaId}/cursos/${cursoId}/materiais/${Date.now()}_${sanitize(filename)}`;
