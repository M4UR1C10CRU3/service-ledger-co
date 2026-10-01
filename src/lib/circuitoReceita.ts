/**
 * Circuito do dinheiro que entra — Fase 1 (30/09/2026).
 *
 * O registo único do que se cobra é a tabela `services` (Vendas / Serviços).
 * É dela que leem as Receitas, os Débitos, as Cobranças, o Workflow
 * Financeiro, o Dashboard Geral — e agora também o Dashboard Executivo e o
 * Relatório Gerencial. As liquidações que lá se registam já entram sozinhas no
 * Fluxo de Caixa, por gatilho na base.
 *
 * A equipa usa UM registo por trabalho (tipo 'fatura'): valor total da
 * proposta, faturas lançadas dentro do próprio registo (`numero_fatura` no
 * formato "FT 1/2026|500; FT 2/2026|300") e as liquidações penduradas nele.
 * Aqui segue-se exatamente esse formato — nada de estruturas novas.
 *
 * Nada neste ficheiro apaga dados. Cada escrita confirma que gravou (uma
 * escrita recusada pela RLS devolve sucesso com 0 linhas).
 */
import { supabase } from '@/integrations/supabase/client';
import { parseInvoiceEntries, serializeInvoiceEntries, calcTotalFaturado } from '@/components/InvoiceHistoryInput';

const sb = supabase as any;

const pad = (n: number) => String(n).padStart(2, '0');
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const isoParaPT = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const arred = (v: number) => Math.round(v * 100) / 100;

/** Mesmo formato de id que o formulário de Vendas/Serviços usa (Date.now()), sem colisões na mesma sessão. */
let ultimoId = 0;
function novoServiceId(): string {
  let id = Date.now();
  if (id <= ultimoId) id = ultimoId + 1;
  ultimoId = id;
  return String(id);
}

async function contactoCliente(clienteId: string | null | undefined): Promise<{ email: string | null; telefone: string | null }> {
  if (!clienteId) return { email: null, telefone: null };
  const { data } = await sb.from('clientes').select('email, telefone').eq('id', clienteId).maybeSingle();
  return { email: data?.email ?? null, telefone: data?.telefone ?? null };
}

/** Procura o registo de Vendas/Serviços que já menciona esta proposta (evita duplicar o que alguém lançou à mão). */
async function registoDaProposta(empresaId: string, numeroProposta: string): Promise<string | null> {
  if (!numeroProposta?.trim()) return null;
  const { data } = await sb.from('services')
    .select('service_id, proposta')
    .eq('empresa_id', empresaId)
    .ilike('proposta', `%${numeroProposta.trim()}%`)
    .limit(5);
  const alvo = numeroProposta.trim().toLowerCase();
  const exato = (data ?? []).find((r: any) =>
    String(r.proposta || '').split(';').map((p: string) => p.trim().toLowerCase()).includes(alvo));
  return exato?.service_id ?? null;
}

export interface PropostaParaRegisto {
  id: string;
  numeroProposta: string;
  titulo?: string | null;
  clienteId?: string | null;
  clienteNome?: string | null;
  totalComIva: number;
  totalSemIva: number;
}

/**
 * Adjudicação → registo do trabalho em Vendas/Serviços, marcado «Pendente»
 * (a realizar). Liga a OS criada e as prestações do plano de pagamentos.
 * Se já existir um registo com o número desta proposta, reaproveita-o.
 * Devolve o service_id, ou null se não foi possível gravar.
 */
export async function registarTrabalhoAdjudicado(
  empresaId: string, proposta: PropostaParaRegisto, osId?: string | null,
): Promise<{ serviceId: string | null; reaproveitado: boolean }> {
  let serviceId = await registoDaProposta(empresaId, proposta.numeroProposta);
  const reaproveitado = !!serviceId;

  if (!serviceId) {
    const { email, telefone } = await contactoCliente(proposta.clienteId);
    const hoje = hojeISO();
    const titulo = (proposta.titulo || '').trim() || `Proposta ${proposta.numeroProposta}`;
    serviceId = novoServiceId();
    const { data, error } = await sb.from('services').insert({
      service_id: serviceId,
      data: isoParaPT(hoje),
      data_date: hoje,
      servico: titulo,
      cliente: proposta.clienteNome || '—',
      cliente_id: proposta.clienteId || null,
      resumo: titulo.slice(0, 40),
      proposta: proposta.numeroProposta,
      fatura: '',
      valor_com_iva: arred(proposta.totalComIva || 0),
      valor_sem_iva: arred(proposta.totalSemIva || 0),
      liquidado: 0,
      a_realizar: true,
      tipo_servico: 'fatura',
      valor_faturado: 0,
      email, telefone,
      empresa_id: empresaId,
    }).select('service_id');
    if (error || !data?.length) {
      console.error('registarTrabalhoAdjudicado:', error);
      return { serviceId: null, reaproveitado: false };
    }
  }

  if (osId) {
    await sb.from('ordens_servico').update({ service_id: serviceId }).eq('id', osId).is('service_id', null);
    await sb.from('plano_pagamentos').update({ os_id: osId }).eq('proposta_id', proposta.id).is('os_id', null);
  }
  return { serviceId, reaproveitado };
}

export interface OsParaFaturar {
  id: string;
  titulo: string;
  clienteId: string | null;
  clienteNome: string;
  serviceId?: string | null;
  propostaNumero?: string | null;
}

/** Quanto falta faturar no registo ligado à OS (para pré-preencher o valor). */
export async function valorPorFaturar(serviceId: string | null | undefined): Promise<number | null> {
  if (!serviceId) return null;
  const { data } = await sb.from('services').select('valor_com_iva, numero_fatura').eq('service_id', serviceId).maybeSingle();
  if (!data) return null;
  const faturado = calcTotalFaturado(parseInvoiceEntries(data.numero_fatura || ''));
  return Math.max(0, arred(Number(data.valor_com_iva) - faturado));
}

/**
 * Faturar uma OS → acrescenta a fatura à lista de faturas do registo do
 * trabalho e passa-o a «Concluído». Se a OS não tiver registo (OS direta),
 * cria-o com o valor desta fatura.
 */
export async function registarFaturaDaOs(
  empresaId: string, os: OsParaFaturar,
  fatura: { numero: string; valorComIva: number; taxaIva: number; dataISO: string },
): Promise<{ ok: boolean; erro?: string }> {
  const numero = fatura.numero.trim();
  if (!numero) return { ok: false, erro: 'Indique o número da fatura.' };
  if (!(fatura.valorComIva > 0)) return { ok: false, erro: 'O valor da fatura tem de ser maior que zero.' };

  let serviceId = os.serviceId || null;
  if (!serviceId && os.propostaNumero) serviceId = await registoDaProposta(empresaId, os.propostaNumero);

  if (!serviceId) {
    const { email, telefone } = await contactoCliente(os.clienteId);
    serviceId = novoServiceId();
    const semIva = arred(fatura.valorComIva / (1 + (fatura.taxaIva || 0) / 100));
    const { data, error } = await sb.from('services').insert({
      service_id: serviceId,
      data: isoParaPT(fatura.dataISO),
      data_date: fatura.dataISO,
      servico: os.titulo,
      cliente: os.clienteNome || '—',
      cliente_id: os.clienteId || null,
      resumo: os.titulo.slice(0, 40),
      proposta: os.propostaNumero || '',
      fatura: '',
      valor_com_iva: arred(fatura.valorComIva),
      valor_sem_iva: semIva,
      liquidado: 0,
      a_realizar: false,
      tipo_servico: 'fatura',
      valor_faturado: arred(fatura.valorComIva),
      numero_fatura: serializeInvoiceEntries([{ numero, valor: arred(fatura.valorComIva) }]),
      email, telefone,
      empresa_id: empresaId,
    }).select('service_id');
    if (error || !data?.length) return { ok: false, erro: error?.message || 'Sem permissão para gravar em Vendas / Serviços.' };
    await sb.from('ordens_servico').update({ service_id: serviceId }).eq('id', os.id);
    return { ok: true };
  }

  const { data: reg, error: eLer } = await sb.from('services')
    .select('id, numero_fatura').eq('service_id', serviceId).maybeSingle();
  if (eLer || !reg) return { ok: false, erro: 'Não encontrei o registo do trabalho em Vendas / Serviços.' };

  const entradas = parseInvoiceEntries(reg.numero_fatura || '');
  if (entradas.some(e => e.numero.trim().toLowerCase() === numero.toLowerCase())) {
    return { ok: false, erro: `A fatura ${numero} já está registada neste trabalho.` };
  }
  entradas.push({ numero, valor: arred(fatura.valorComIva) });
  const { data: gravado, error } = await sb.from('services').update({
    numero_fatura: serializeInvoiceEntries(entradas),
    valor_faturado: arred(calcTotalFaturado(entradas)),
    a_realizar: false,
  }).eq('id', reg.id).select('id');
  if (error || !gravado?.length) return { ok: false, erro: error?.message || 'Sem permissão para atualizar Vendas / Serviços.' };

  if (!os.serviceId) await sb.from('ordens_servico').update({ service_id: serviceId }).eq('id', os.id);
  return { ok: true };
}

/**
 * Recebimentos → prestações do plano de pagamentos. Não havia forma de marcar
 * uma prestação como paga; passa a acompanhar sozinha o que se recebe no
 * registo do trabalho: as prestações cobertas pelo total recebido ficam
 * «Pago», por ordem de data prevista. Nunca lança erro — o recebimento já
 * ficou gravado, isto só acerta o calendário.
 */
export async function sincronizarPlanoComRecebimentos(serviceId: string): Promise<void> {
  try {
    const { data: os } = await sb.from('ordens_servico')
      .select('id, proposta_id').eq('service_id', serviceId).not('proposta_id', 'is', null).limit(1);
    const propostaId = os?.[0]?.proposta_id;
    if (!propostaId) return;

    const [{ data: liqs }, { data: prest }] = await Promise.all([
      sb.from('liquidacoes').select('valor, data_pagamento').eq('service_id', serviceId),
      sb.from('plano_pagamentos').select('id, valor, estado, data_prevista, data_pagamento, created_at')
        .eq('proposta_id', propostaId),
    ]);
    if (!prest?.length) return;

    const recebido = (liqs ?? []).reduce((s: number, l: any) => s + Number(l.valor || 0), 0);
    const ordenadas = [...prest].sort((a: any, b: any) =>
      (a.data_prevista || '9999').localeCompare(b.data_prevista || '9999') || a.created_at.localeCompare(b.created_at));

    let acumulado = 0;
    for (const p of ordenadas) {
      acumulado += Number(p.valor || 0);
      const coberta = acumulado <= recebido + 0.005;
      if (coberta && p.estado !== 'pago') {
        await sb.from('plano_pagamentos').update({ estado: 'pago', data_pagamento: hojeISO(), updated_at: new Date().toISOString() }).eq('id', p.id);
      } else if (!coberta && p.estado === 'pago') {
        await sb.from('plano_pagamentos').update({ estado: 'pendente', data_pagamento: null, updated_at: new Date().toISOString() }).eq('id', p.id);
      }
    }
  } catch (e) {
    console.error('sincronizarPlanoComRecebimentos:', e);
  }
}

/**
 * Cobranças calculadas a partir de Vendas / Serviços — a mesma fonte e as
 * mesmas regras da página Débitos, para que todos os painéis deem o mesmo
 * total. «Vencido» = em débito há mais de 30 dias (o primeiro escalão dos
 * Débitos é «até 30 dias»).
 */
export function resumoCobrancas(
  services: Array<{ executadoEmDebito: number; diasEmAtraso: number; liquidacoes?: Array<{ valor: number; dataPagamento: string }> }>,
  inicioISO?: string, fimISO?: string,
): { recebido: number; emDebito: number; emDebitoAte30: number; vencido: number } {
  let recebido = 0, emDebito = 0, vencido = 0;
  for (const s of services) {
    emDebito += s.executadoEmDebito || 0;
    if ((s.executadoEmDebito || 0) > 0 && s.diasEmAtraso > 30) vencido += s.executadoEmDebito;
    for (const l of s.liquidacoes ?? []) {
      const iso = (l.dataPagamento || '').includes('/')
        ? l.dataPagamento.split('/').reverse().map((p, i) => (i ? p.padStart(2, '0') : p)).join('-')
        : (l.dataPagamento || '').slice(0, 10);
      if ((!inicioISO || iso >= inicioISO) && (!fimISO || iso <= fimISO)) recebido += Number(l.valor) || 0;
    }
  }
  return { recebido: arred(recebido), emDebito: arred(emDebito), emDebitoAte30: arred(emDebito - vencido), vencido: arred(vencido) };
}
