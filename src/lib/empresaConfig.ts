// Configuração específica de cada empresa para propostas e documentos

// Remetentes de email por departamento (formato Resend: "Nome <email@dominio.com>")
// REQUISITO: o domínio (@lojatudocasa.com, @obrajusta.pt, etc.) deve estar
// verificado no painel Resend → Domains antes de enviar com estes endereços.
export interface EmpresaEmailRemetentes {
  comercial:      string;   // propostas, confirmações ao cliente
  compras:        string;   // notas de encomenda ao fornecedor
  financeiro:     string;   // cobranças, lembretes de pagamento
  contabilidade:  string;   // faturas, avisos contabilísticos
}

export interface EmpresaDocConfig {
  nomeDocumento: string;       // Nome que aparece no cabeçalho dos documentos
  morada: string;
  codigoPostal: string;
  localidade: string;
  contribuinte: string;
  emails: string;
  telefones: string;
  prefixoProposta: string;     // Prefixo para numeração de propostas
  prefixoPo: string;           // Prefixo para numeração de Pedidos de Orçamento
  emailsRodape: string;        // Emails no rodapé do PDF
  emailRemetentes: EmpresaEmailRemetentes;
}

// ── Helpers de remetentes ─────────────────────────────────────────────────────

function tcRemetentes(nomeEmpresa: string): EmpresaEmailRemetentes {
  return {
    comercial:     `${nomeEmpresa} — Comercial <comercial@lojatudocasa.com>`,
    compras:       `${nomeEmpresa} — Compras <compras@lojatudocasa.com>`,
    financeiro:    `${nomeEmpresa} — Financeiro <financeiro@lojatudocasa.com>`,
    contabilidade: `${nomeEmpresa} — Contabilidade <contabilidade@lojatudocasa.com>`,
  };
}

function ojRemetentes(nomeEmpresa: string): EmpresaEmailRemetentes {
  return {
    comercial:     `${nomeEmpresa} — Comercial <comercial@obrajusta.pt>`,
    compras:       `${nomeEmpresa} — Compras <compras@obrajusta.pt>`,
    financeiro:    `${nomeEmpresa} — Financeiro <financeiro@obrajusta.pt>`,
    contabilidade: `${nomeEmpresa} — Contabilidade <contabilidade@obrajusta.pt>`,
  };
}

// Resiserv não tem domínio próprio verificável no Resend — usa remetente partilhado
// até ao momento em que seja criado/verificado um domínio de envio.
const resisRemetentes: EmpresaEmailRemetentes = {
  comercial:     'Resiserv <onboarding@resend.dev>',
  compras:       'Resiserv <onboarding@resend.dev>',
  financeiro:    'Resiserv <onboarding@resend.dev>',
  contabilidade: 'Resiserv <onboarding@resend.dev>',
};

// ── Configs por empresa ───────────────────────────────────────────────────────

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
    prefixoPo: 'MCTCPO',
    emailsRodape: 'contacto@lojatudocasa.com  |  comercial@lojatudocasa.com',
    emailRemetentes: tcRemetentes('Tudo Casa Matrizcharme'),
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
    prefixoPo: 'WMTCPO',
    emailsRodape: 'contacto@lojatudocasa.com  |  comercial@lojatudocasa.com',
    emailRemetentes: tcRemetentes('Tudo Casa Warm'),
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
    prefixoPo: 'OJMIIECPO',
    emailsRodape: 'contacto@obrajusta.pt  |  comercial@obrajusta.pt',
    emailRemetentes: ojRemetentes('Obrajusta II'),
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
    prefixoPo: 'OJGPO',
    emailsRodape: 'contacto@obrajusta.pt  |  comercial@obrajusta.pt',
    emailRemetentes: ojRemetentes('Obrajusta Gestão'),
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
    prefixoPo: 'RSPO',
    emailsRodape: 'resiserv@gmail.com',
    emailRemetentes: resisRemetentes,
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
  prefixoPo: 'PO',
  emailsRodape: '',
  emailRemetentes: {
    comercial:     'Clariza Manager <onboarding@resend.dev>',
    compras:       'Clariza Manager <onboarding@resend.dev>',
    financeiro:    'Clariza Manager <onboarding@resend.dev>',
    contabilidade: 'Clariza Manager <onboarding@resend.dev>',
  },
};

export function getEmpresaDocConfig(slug?: string): EmpresaDocConfig {
  if (!slug) return defaultConfig;
  return configs[slug] || defaultConfig;
}

export function formatPropostaNumber(slug: string | undefined, ano: number, seq: number): string {
  const cfg = getEmpresaDocConfig(slug);
  const prefix = cfg.prefixoProposta;
  if (prefix === 'MCTCEC' || prefix === 'WMTCEC' || prefix === 'OJMIIEC' || prefix === 'OJGEC' || prefix === 'RSEC') {
    return `${prefix} ${ano}/${seq}`;
  }
  return `${ano}${prefix}${seq}/${seq}`;
}

export function formatPoNumber(slug: string | undefined, ano: number, seq: number): string {
  const cfg = getEmpresaDocConfig(slug);
  return `${cfg.prefixoPo} ${ano}/${seq}`;
}
