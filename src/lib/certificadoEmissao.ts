import QRCode from 'qrcode';
import { addMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { generateCertificadoPDF, type CertificadoPDFData } from '@/lib/generateCertificadoPDF';

/**
 * Emissão de certificados do Clariza School.
 *
 * Existe para haver UM caminho só. Antes a emissão individual e a emissão em
 * lote montavam os dados cada uma à sua maneira, e foi assim que a metodologia
 * do curso deixou de chegar ao PDF sem ninguém dar por isso: só um dos dois
 * caminhos a passava. Tudo o que sai impresso passa por aqui.
 */

const BUCKET = 'school-certificados';

export interface CertConfigEmpresa {
  id: string;
  nome: string;
  cert_prefixo: string | null;
  cert_arte_frente_path: string | null;
  cert_arte_verso_path: string | null;
  cert_texto_institucional: string | null;
  cert_rodape: string | null;
  cert_url_verificacao: string | null;
  cert_cargo_diretor: string | null;
  nome_diretor: string | null;
  assinatura_diretor_path: string | null;
}

/** Configuração de certificado da empresa. Lida da BD, não de constantes. */
export async function carregarConfigCertificado(empresaId: string): Promise<CertConfigEmpresa | null> {
  const { data, error } = await (supabase.from('empresas') as any)
    .select('id, nome, cert_prefixo, cert_arte_frente_path, cert_arte_verso_path, cert_texto_institucional, cert_rodape, cert_url_verificacao, cert_cargo_diretor, nome_diretor, assinatura_diretor_path')
    .eq('id', empresaId)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível ler a configuração de certificados: ${error.message}`);
  return (data as CertConfigEmpresa) ?? null;
}

/**
 * Uma imagem pode viver em dois sítios: num caminho do Storage (carregada pelo
 * utilizador) ou num ficheiro servido pela app. O caminho absoluto começa por
 * "/" e vai direto; o resto assume-se Storage.
 */
export async function resolverImagem(
  path: string | null | undefined,
  bucket = 'school-documentos',
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('/') || /^https?:/.test(path)) return path;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** @deprecated usar resolverImagem */
export const resolverAssinatura = (p: string | null | undefined) => resolverImagem(p);

/**
 * Endereço público onde um certificado se confirma.
 *
 * Tem de ser fixo, e não o sítio onde o browser calha estar. Este link vai
 * impresso no certificado e dentro do código QR: um certificado emitido a
 * partir do ambiente de testes ficava com um QR a apontar para o ambiente de
 * testes — para sempre, mesmo depois de o aluno o receber. Emitido a partir do
 * `localhost` de quem desenvolve, ficava com um QR que só abre nessa máquina.
 *
 * Define-se em VITE_URL_PUBLICA. Sem essa variável, cai no endereço atual, que
 * é o comportamento certo em desenvolvimento e o menos mau em qualquer caso.
 */
const URL_PUBLICA = (import.meta.env.VITE_URL_PUBLICA as string | undefined)?.replace(/\/+$/, '');

export function urlVerificacao(codigo: string): string {
  const base = URL_PUBLICA || window.location.origin;
  return `${base}/verificar/${encodeURIComponent(codigo)}`;
}

async function gerarQR(codigo: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(urlVerificacao(codigo), { width: 240, margin: 0 });
  } catch {
    return null;   // sem QR o certificado continua verificável pelo código
  }
}

export interface FonteCertificado {
  codigo: string;
  aluno: { nome: string; cpf?: string | null };
  curso: {
    nome: string;
    categoria?: string | null;
    carga_horaria?: number | null;
    horas_teoricas?: number | null;
    horas_praticas?: number | null;
    conteudo_programatico?: { modulo: string; horas: number }[] | null;
    objetivo?: string | null;
    metodologia?: string | null;
    reconhecimento?: string | null;
    aprovacao_minima?: number | null;
    validade_meses?: number | null;
    /** Fotografia de fundo do curso, impressa como marca de água na frente. */
    template_cert_path?: string | null;
  };
  docente?: { nome?: string | null; assinatura_path?: string | null } | null;
  turma?: { inicio?: string | null; fim?: string | null; empresa_aplicacao?: string | null } | null;
  emitido_em: string;
  validade_em?: string | null;
  config: CertConfigEmpresa;
}

/** Junta tudo o que vai ser impresso. Uma única definição, sem variantes. */
export async function montarDadosCertificado(f: FonteCertificado): Promise<CertificadoPDFData> {
  const [assDocente, assDiretor, fundoCurso, qr] = await Promise.all([
    resolverImagem(f.docente?.assinatura_path),
    resolverImagem(f.config.assinatura_diretor_path),
    resolverImagem(f.curso.template_cert_path, 'school-files'),
    gerarQR(f.codigo),
  ]);

  const modulos = Array.isArray(f.curso.conteudo_programatico) ? f.curso.conteudo_programatico : [];

  return {
    aluno_nome: f.aluno.nome,
    aluno_cpf: f.aluno.cpf ?? null,
    curso_nome: f.curso.nome,
    curso_categoria: f.curso.categoria ?? null,
    carga_horaria: f.curso.carga_horaria ?? null,
    horas_teoricas: f.curso.horas_teoricas ?? null,
    horas_praticas: f.curso.horas_praticas ?? null,
    data_inicio: f.turma?.inicio ?? null,
    data_conclusao: f.turma?.fim ?? null,
    emitido_em: f.emitido_em,
    validade_em: f.validade_em ?? null,
    docente_nome: f.docente?.nome ?? null,
    docente_assinatura_url: assDocente,
    codigo: f.codigo,
    empresa_nome: f.config.nome,
    empresa_aplicacao: f.turma?.empresa_aplicacao ?? null,
    conteudo_programatico: modulos,
    objetivo: f.curso.objetivo ?? null,
    metodologia: f.curso.metodologia ?? null,
    reconhecimento: f.curso.reconhecimento ?? null,
    aprovacao_minima: f.curso.aprovacao_minima ?? null,
    validade_anos: f.curso.validade_meses ? Math.round(f.curso.validade_meses / 12) : null,
    modulos_count: modulos.length || null,

    marca_agua: fundoCurso,
    arte_frente: f.config.cert_arte_frente_path,
    arte_verso: f.config.cert_arte_verso_path,
    texto_institucional: f.config.cert_texto_institucional,
    rodape: f.config.cert_rodape,
    diretor_nome: f.config.nome_diretor,
    diretor_cargo: f.config.cert_cargo_diretor,
    diretor_assinatura_url: assDiretor,
    url_verificacao: f.config.cert_url_verificacao,
    qr_verificacao: qr,
  };
}

/** Código único gerado pela base de dados — atómico, sem colisões possíveis. */
export async function gerarCodigoCertificado(empresaId: string): Promise<{ codigo: string; sequencial: number }> {
  const { data, error } = await (supabase.rpc as any)('school_gerar_codigo_certificado', {
    p_empresa_id: empresaId,
  });
  if (error) throw new Error(`Não foi possível gerar a codificação: ${error.message}`);
  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha?.codigo) throw new Error('A base de dados não devolveu uma codificação.');
  return { codigo: linha.codigo, sequencial: linha.sequencial };
}

export function calcularValidade(emitidoEm: string, validadeMeses?: number | null): string | null {
  if (!validadeMeses) return null;
  return addMonths(new Date(emitidoEm + 'T00:00:00'), validadeMeses).toISOString().split('T')[0];
}

/**
 * Sobe o PDF e devolve o caminho no Storage.
 *
 * Guardamos o CAMINHO, não uma URL. O bucket é privado, portanto uma URL
 * pública seria um link que devolve 403 — era o que estava a acontecer. A URL
 * assinada é criada no momento em que alguém quer abrir o ficheiro.
 */
export async function guardarPDF(empresaId: string, codigo: string, blob: Blob): Promise<string> {
  const ano = new Date().getFullYear();
  const path = `${empresaId}/${ano}/${codigo}.pdf`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'application/pdf', upsert: true });
  // Falhar aqui em silêncio deixava o certificado registado a apontar para um
  // ficheiro que não existe. Passa a ser erro.
  if (error) throw new Error(`Falha ao guardar o PDF: ${error.message}`);
  return path;
}

export async function urlAssinadaPDF(path: string, segundos = 3600): Promise<string | null> {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;   // registos antigos com URL gravada
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, segundos);
  return data?.signedUrl ?? null;
}

/**
 * O instantâneo. Congela no certificado tudo o que ficou impresso, para que
 * editar o curso amanhã não reescreva o que já foi certificado hoje.
 */
export function instantaneo(f: FonteCertificado, dados: CertificadoPDFData) {
  return {
    aluno_nome:       dados.aluno_nome,
    aluno_cpf:        dados.aluno_cpf,
    curso_nome:       dados.curso_nome,
    curso_categoria:  dados.curso_categoria,
    carga_horaria:    dados.carga_horaria,
    horas_teoricas:   dados.horas_teoricas,
    horas_praticas:   dados.horas_praticas,
    modulos_json:     dados.conteudo_programatico,
    objetivo:         dados.objetivo,
    metodologia:      dados.metodologia,
    reconhecimento:   dados.reconhecimento,
    aprovacao_minima: dados.aprovacao_minima,
    validade_meses:   f.curso.validade_meses ?? null,
    docente_nome:     dados.docente_nome,
    diretor_nome:     dados.diretor_nome,
    diretor_cargo:    dados.diretor_cargo,
    empresa_nome:     dados.empresa_nome,
    local_aplicacao:  dados.empresa_aplicacao,
    data_inicio:      dados.data_inicio,
    data_conclusao:   dados.data_conclusao,
  };
}

/** Gera o PDF a partir da fonte já montada. */
export async function produzirPDF(f: FonteCertificado): Promise<{ blob: Blob; dados: CertificadoPDFData }> {
  const dados = await montarDadosCertificado(f);
  const blob = await generateCertificadoPDF(dados);
  return { blob, dados };
}
