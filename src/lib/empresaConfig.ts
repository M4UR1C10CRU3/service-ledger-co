// Configuração específica de cada empresa para propostas e documentos

export interface EmpresaDocConfig {
  nomeDocumento: string;       // Nome que aparece no cabeçalho dos documentos
  morada: string;
  codigoPostal: string;
  localidade: string;
  contribuinte: string;
  emails: string;
  telefones: string;
  prefixoProposta: string;     // Prefixo para numeração de propostas
  emailsRodape: string;        // Emails no rodapé do PDF
}

const configs: Record<string, EmpresaDocConfig> = {
  'tudocasa-matrizcharme': {
    nomeDocumento: 'TUDO CASA — MATRIZCHARME LDA',
    morada: 'Rua Eng. Machado Vaz Nº 8',
    codigoPostal: '5370-440',
    localidade: 'Mirandela',
    contribuinte: '510885250',
    emails: 'contacto@lojatudocasa.com | comercial@lojatudocasa.com',
    telefones: 'Telefone/ Whatsapp 278 105 314 | Telemóvel 933 260 068',
    prefixoProposta: 'MCTCEC',
    emailsRodape: 'contacto@lojatudocasa.com  |  comercial@lojatudocasa.com',
  },
  tudocasa: {
    nomeDocumento: 'TUDO CASA — WARM LDA',
    morada: 'Rua Eng. Machado Vaz Nº 8',
    codigoPostal: '5370-440',
    localidade: 'Mirandela',
    contribuinte: '518307174',
    emails: 'contacto@lojatudocasa.com | comercial@lojatudocasa.com',
    telefones: 'Telefone/ Whatsapp 278 105 314 | Telemóvel 933 260 068',
    prefixoProposta: 'WMTCEC',
    emailsRodape: 'contacto@lojatudocasa.com  |  comercial@lojatudocasa.com',
  },
  obrajusta: {
    nomeDocumento: 'OBRAJUSTA II — CONSTRUÇÃO LDA',
    morada: 'Rua Eng. Machado Vaz Nº 8',
    codigoPostal: '5370-440',
    localidade: 'Mirandela',
    contribuinte: '516410740',
    emails: 'obrajusta2@gmail.com',
    telefones: '',
    prefixoProposta: 'BO',
    emailsRodape: 'obrajusta2@gmail.com',
  },
  'obrajusta-gestao': {
    nomeDocumento: 'OBRAJUSTA — GESTÃO DE OBRA LDA',
    morada: 'Rua Eng. Machado Vaz Nº 8',
    codigoPostal: '5370-440',
    localidade: 'Mirandela',
    contribuinte: '516410740',
    emails: 'obrajusta2@gmail.com',
    telefones: '',
    prefixoProposta: 'BO',
    emailsRodape: 'obrajusta2@gmail.com',
  },
  resiserv: {
    nomeDocumento: 'RESISERV — SERVIÇOS, RECICLAGEM E GESTÃO DE RESÍDUOS LDA',
    morada: 'Rua Eng. Machado Vaz Nº 8',
    codigoPostal: '5370-440',
    localidade: 'Mirandela',
    contribuinte: '516410740',
    emails: 'resiserv@gmail.com',
    telefones: '',
    prefixoProposta: 'BO',
    emailsRodape: 'resiserv@gmail.com',
  },
};

// Default fallback
const defaultConfig: EmpresaDocConfig = {
  nomeDocumento: 'EMPRESA',
  morada: '',
  codigoPostal: '',
  localidade: '',
  contribuinte: '',
  emails: '',
  telefones: '',
  prefixoProposta: 'BO',
  emailsRodape: '',
};

export function getEmpresaDocConfig(slug?: string): EmpresaDocConfig {
  if (!slug) return defaultConfig;
  return configs[slug] || defaultConfig;
}

export function formatPropostaNumber(slug: string | undefined, ano: number, seq: number): string {
  const cfg = getEmpresaDocConfig(slug);
  if (cfg.prefixoProposta === 'MCTCEC') {
    return `MCTCEC ${ano}/${seq}`;
  }
  return `${ano}${cfg.prefixoProposta}${seq}/${seq}`;
}
