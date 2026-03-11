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
    morada: 'Av. Olimpio Guedes Andrade, 891 - Apartado. 117',
    codigoPostal: '5370-520',
    localidade: 'Mirandela',
    contribuinte: '515344893',
    emails: 'contacto@obrajusta.pt | comercial@obrajusta.pt',
    telefones: 'Telefone/ Whatsapp 278 248 163 | Telemóvel 937 500 554',
    prefixoProposta: 'OJMIIEC',
    emailsRodape: 'contacto@obrajusta.pt  |  comercial@obrajusta.pt',
  },
  'obrajusta-gestao': {
    nomeDocumento: 'OBRAJUSTA GESTÃO DE OBRA, LDA',
    morada: 'Av. Olimpio Guedes Andrade, 891 - Apartado. 117',
    codigoPostal: '5370-520',
    localidade: 'Mirandela',
    contribuinte: '510419801',
    emails: 'contacto@obrajusta.pt | comercial@obrajusta.pt',
    telefones: 'Telefone/ Whatsapp 278 248 163 | Telemóvel 937 500 554',
    prefixoProposta: 'OJGEC',
    emailsRodape: 'contacto@obrajusta.pt  |  comercial@obrajusta.pt',
  },
  resiserv: {
    nomeDocumento: 'RESISERV — SERVIÇOS, RECICLAGEM E GESTÃO DE RESÍDUOS, LDA',
    morada: 'Lugar de Latães - Apartado 76',
    codigoPostal: '5340-296',
    localidade: 'Zona Industrial - Macedo de Cavaleiros',
    contribuinte: '509313221',
    emails: 'resiserv@gmail.com',
    telefones: 'Telemóvel 937 500 553',
    prefixoProposta: 'RSEC',
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
  const prefix = cfg.prefixoProposta;
  if (prefix === 'MCTCEC' || prefix === 'WMTCEC' || prefix === 'OJMIIEC' || prefix === 'OJGEC') {
    return `${prefix} ${ano}/${seq}`;
  }
  return `${ano}${prefix}${seq}/${seq}`;
}
