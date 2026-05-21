export type SubTipo = 'individual' | 'coletiva';
export type SubEstado = 'ativo' | 'inativo';

export interface Subempreiteiro {
  id: string;
  empresaId: string;
  tipo: SubTipo;
  nome: string;
  email: string | null;
  telefone: string | null;
  telemovel: string | null;
  morada: string | null;
  codigoPostal: string | null;
  localidade: string | null;
  especialidade: string | null;
  notas: string | null;
  iban: string | null;
  swift: string | null;
  // Individual
  nif: string | null;
  ccNumero: string | null;
  ccValidade: string | null;
  dataNascimento: string | null;
  // Coletiva
  nipc: string | null;
  certidaoPermanenteCodigo: string | null;
  representanteNome: string | null;
  representanteNif: string | null;
  // Profissional
  alvaraNumero: string | null;
  alvaraValidade: string | null;
  seguroNumero: string | null;
  seguroValidade: string | null;
  // Estado
  ativo: boolean;
  eliminado: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SubDocumento {
  id: string;
  empresaId: string;
  subempreiteiroId: string;
  tipoDocumento: string;
  nomeFicheiro: string;
  storagePath: string;
  tamanhoBytes: number | null;
  mimeType: string | null;
  validade: string | null;
  notas: string | null;
  criadoEm: string;
}

export interface SubFormData {
  tipo: SubTipo;
  nome: string;
  email: string;
  telefone: string;
  telemovel: string;
  morada: string;
  codigoPostal: string;
  localidade: string;
  especialidade: string;
  notas: string;
  iban: string;
  swift: string;
  nif: string;
  ccNumero: string;
  ccValidade: string;
  dataNascimento: string;
  nipc: string;
  certidaoPermanenteCodigo: string;
  representanteNome: string;
  representanteNif: string;
  alvaraNumero: string;
  alvaraValidade: string;
  seguroNumero: string;
  seguroValidade: string;
}

export const EMPTY_SUB_FORM: SubFormData = {
  tipo: 'individual',
  nome: '', email: '', telefone: '', telemovel: '',
  morada: '', codigoPostal: '', localidade: '',
  especialidade: '', notas: '', iban: '', swift: '',
  nif: '', ccNumero: '', ccValidade: '', dataNascimento: '',
  nipc: '', certidaoPermanenteCodigo: '',
  representanteNome: '', representanteNif: '',
  alvaraNumero: '', alvaraValidade: '',
  seguroNumero: '', seguroValidade: '',
};

export const DOCS_INDIVIDUAL: Record<string, string> = {
  cc:             'Cartão de Cidadão',
  nif:            'Doc. NIF / NISS',
  certidao_at:    'Certidão Não Dívida AT',
  certidao_ss:    'Certidão Não Dívida SS',
  alvara:         'Alvará / Licença',
  seguro:         'Apólice de Seguro',
  contrato:       'Contrato Assinado',
  outro:          'Outro',
};

export const DOCS_COLETIVA: Record<string, string> = {
  certidao_permanente: 'Certidão Permanente',
  nipc:                'Cartão Identificação PC',
  certidao_at:         'Certidão Não Dívida AT',
  certidao_ss:         'Certidão Não Dívida SS',
  alvara:              'Alvará de Construção',
  seguro:              'Seguro Responsabilidade Civil',
  contrato:            'Contrato Assinado',
  outro:               'Outro',
};

export function getDocLabels(tipo: SubTipo) {
  return tipo === 'individual' ? DOCS_INDIVIDUAL : DOCS_COLETIVA;
}
