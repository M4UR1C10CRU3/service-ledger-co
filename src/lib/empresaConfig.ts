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
  registoComercial?: string;
  capitalSocial?: string;
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

// ── Cadastro real da empresa (liberty_empresas_config) ─────────────────────────
// Fonte de verdade: preenchido pelo próprio utilizador em Configurações → Dados
// da Empresa. O mapa `configs` acima serve só de base/fallback (prefixos,
// remetentes de email) para quando ainda não há registo — nunca deve ser a
// fonte principal dos dados que aparecem nos documentos.
export interface LibertyEmpresaConfigRow {
  nome_razao_social?: string | null;
  nome_fantasia?: string | null;
  nif?: string | null;
  registo_comercial?: string | null;
  capital_social?: string | null;
  morada?: string | null;
  codigo_postal?: string | null;
  localidade?: string | null;
  telefone?: string | null;
  email_comercial?: string | null;
  email_geral?: string | null;
  email_internacional?: string | null;
  prefixo_propostas?: string | null;
  texto_condicoes?: string | null;
  texto_pagamento?: string | null;
  texto_validade?: string | null;
}

export function resolveEmpresaDocConfig(
  slug: string | undefined,
  nomeFallback: string | undefined,
  live: LibertyEmpresaConfigRow | null,
): EmpresaDocConfig {
  const base = getEmpresaDocConfig(slug);
  if (!live) {
    // Sem cadastro preenchido ainda — usa o nome real da empresa (nunca o de
    // outra empresa) com o resto dos dados do mapa fixo como ponto de partida.
    return { ...base, nomeDocumento: nomeFallback || base.nomeDocumento };
  }
  const emails = [live.email_comercial, live.email_geral, live.email_internacional]
    .filter((e, i, arr) => e && arr.indexOf(e) === i);
  return {
    ...base,
    nomeDocumento: live.nome_razao_social || live.nome_fantasia || nomeFallback || base.nomeDocumento,
    morada: live.morada || base.morada,
    codigoPostal: live.codigo_postal || base.codigoPostal,
    localidade: live.localidade || base.localidade,
    contribuinte: live.nif || base.contribuinte,
    telefones: live.telefone || base.telefones,
    emailsRodape: emails.length ? emails.join('  |  ') : base.emailsRodape,
    // O prefixo de numeração também vem do cadastro. Sem isto, uma empresa nova
    // (que por definição não está no mapa fixo acima) caía no genérico 'BO'.
    prefixoProposta: live.prefixo_propostas || base.prefixoProposta,
    registoComercial: live.registo_comercial || '',
    capitalSocial: live.capital_social || '',
  };
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

// ── Numeração no estilo PHC (clone visual) ─────────────────────────────────────
// O PHC imprime, no próprio documento, "Nº {sequencial} / {série} -- {ano}BO{série}/{sequencial}".
// O "série" é o número interno de filial/série do PHC para cada tipo de documento —
// fixo por tipo de documento, igual para todas as empresas (confirmado com o
// utilizador: não precisa de corresponder ao série real de cada empresa no PHC,
// só o formato visual importa).
export const PHC_SERIE = {
  proposta: 13,
  pedidoOrcamento: 16,
  notaEncomenda: 2,
} as const;

export function formatPhcNumeroDisplay(seq: number, ano: number, serie: number): string {
  return `${seq}&nbsp;/&nbsp;${serie}&nbsp;&nbsp;--&nbsp;${ano}BO${serie}/${seq}`;
}
