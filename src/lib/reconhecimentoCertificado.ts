/**
 * Reconhecimento impresso no verso do certificado do ITC, escolhido pelo CLIENTE do aluno (02/10/2026).
 *
 * Regra do ITC:
 *  - clientes do Grupo Ipiranga (Ipiranga, Etecon, Bureau Veritas, Transdourada, Caramuru, Cianport)
 *      → «credenciada pelo Grupo Ipiranga» + logótipo Ipiranga. Tem prioridade: a Etecon é de engenharia,
 *        mas é do grupo Ipiranga.
 *  - clientes do setor elétrico e de engenharia (pelo segmento ou pelo nome)
 *      → o texto do curso tal como está (com a Diretriz do Grupo Equatorial, nos cursos que a têm)
 *        + logótipo Equatorial (sempre, mesmo nos cursos cujo texto não a cita).
 *  - todos os outros clientes e os alunos particulares
 *      → só o reconhecimento do CEE-AP e o alinhamento à norma, sem grupo e sem logótipo.
 *
 * O texto de cada curso continua a ser escrito no curso; aqui só se tira ou troca a frase do grupo, que é
 * sempre a mesma: «… e à Diretriz de Treinamento e Homologação de Instituição de Ensino e Instrutores do
 * Grupo Equatorial (Versão 2 — abril/2023)». Textos em português do Brasil (o ITC é brasileiro).
 */

export type GrupoReconhecimento = 'equatorial' | 'ipiranga' | 'nenhum';

/**
 * Cursos de bombeiros (02/10/2026): Bombeiro Civil, Brigada de Incêndio/Emergência e Proteção Contra Incêndios.
 * Nestes, o topo do certificado leva o brasão do Corpo de Bombeiros Militar do Amapá em vez da Mais.com.
 */
export const eCursoDeBombeiros = (nomeCurso?: string | null) =>
  /bombeiro\s+civil|brigada|prote[cç][aã]o\s+contra\s+inc[eê]ndio/i.test(nomeCurso || '');

/**
 * Alvará do CBMAP (Certificação de Vistoria de Alvará/Certificação de Funcionamento) — atesta as INSTALAÇÕES do
 * ITC, não é credenciamento para formar. Por isso o texto diz «estabelecimento certificado», nunca «credenciado».
 * Documento: «ALVARÁ DO CORPO DE BOMBEIROS - ITC 2026.pdf» (código de autenticidade WA37.S4G1O.7PO9T.ZEVP).
 * Como o TRT: fora da validade, a frase deixa de ser impressa.
 */
export const ALVARA_CBMAP = { numero: '2161/2026', processo: '003772/2026', validoAte: '2027-08-11' } as const;

/** Frase do alvará para os cursos de bombeiros, ou null se a data de emissão estiver fora da validade. */
export function fraseAlvaraCbmap(emitidoEmISO?: string | null): string | null {
  const dia = (emitidoEmISO || new Date().toISOString()).slice(0, 10);
  if (dia > ALVARA_CBMAP.validoAte) return null;
  const [a, m, d] = ALVARA_CBMAP.validoAte.split('-');
  return `Estabelecimento certificado pelo CBMAP — Alvará/Certificação de Funcionamento nº ${ALVARA_CBMAP.numero} (Proc. ${ALVARA_CBMAP.processo}), válido até ${d}/${m}/${a}.`;
}

/** Arte da frente para o curso: a variante «-bombeiros» da arte do ITC nos cursos de bombeiros. */
export function arteFrenteParaCurso(artePadrao: string | null | undefined, nomeCurso?: string | null): string | null {
  if (!artePadrao) return artePadrao ?? null;
  if (eCursoDeBombeiros(nomeCurso) && /\/certificado\/itc\/cert_page_1_branco\.png$/.test(artePadrao)) {
    return artePadrao.replace(/\.png$/, '-bombeiros.png');
  }
  return artePadrao;
}

export interface ClienteDoAluno { nome?: string | null; segmento?: string | null }

const GRUPO_IPIRANGA = /ipiranga|etecon|bureau|transdourada|caramuru|cianport/i;
const SETOR_ELETRICO_ENGENHARIA = /energ|el[eé]tric|transmiss|engenharia|eletromec/i;

/** Classifica o cliente. Sem cliente (aluno particular) → 'nenhum'. */
export function grupoDoCliente(cliente?: ClienteDoAluno | null): GrupoReconhecimento {
  const nome = (cliente?.nome || '').trim();
  const segmento = (cliente?.segmento || '').trim();
  if (!nome && !segmento) return 'nenhum';
  if (GRUPO_IPIRANGA.test(nome)) return 'ipiranga';
  if (SETOR_ELETRICO_ENGENHARIA.test(segmento) || SETOR_ELETRICO_ENGENHARIA.test(nome)) return 'equatorial';
  return 'nenhum';
}

/** A frase da Equatorial, com o « e à» que a liga ao resto. Tolerante a espaços e ao travessão. */
const FRASE_EQUATORIAL = /\s*,?\s*e\s+à\s+Diretriz\s+de\s+Treinamento[^.]*?Grupo\s+Equatorial(\s*\([^)]*\))?/i;

export const invocaEquatorial = (texto?: string | null) => /Grupo\s+Equatorial/i.test(texto || '');

/** Texto do curso sem a referência ao Grupo Equatorial (pontuação final garantida). */
export function semGrupo(texto: string): string {
  let t = texto.replace(FRASE_EQUATORIAL, '').replace(/\s+\./g, '.').trim();
  if (t && !/[.!?]$/.test(t)) t += '.';
  return t;
}

const PADRAO =
  'Certificado reconhecido pelo Conselho Estadual de Educação do Amapá (CEE-AP), em conformidade com as Normas Regulamentadoras do Ministério do Trabalho e Emprego.';

/**
 * Texto e logótipo do reconhecimento para este certificado.
 * `logo`: qual o selo a imprimir na caixa RECONHECIMENTO, ou null para nenhum.
 */
export function reconhecimentoParaCertificado(
  textoCurso: string | null | undefined,
  cliente?: ClienteDoAluno | null,
): { texto: string; logo: 'equatorial' | 'ipiranga' | null; grupo: GrupoReconhecimento } {
  const base = (textoCurso || '').trim() || PADRAO;
  const grupo = grupoDoCliente(cliente);
  if (grupo === 'equatorial') {
    // Selo da Equatorial SEMPRE para estes clientes (como era antes em todos), mesmo nos cursos cujo texto não
    // a cita — p. ex. Bombeiro Civil para a Energisa (decisão do utilizador, 02/10/2026).
    return { texto: base, logo: 'equatorial', grupo };
  }
  const neutro = semGrupo(base);
  if (grupo === 'ipiranga') {
    return { texto: `${neutro} Instituição de ensino credenciada pelo Grupo Ipiranga.`, logo: 'ipiranga', grupo };
  }
  return { texto: neutro, logo: null, grupo };
}
