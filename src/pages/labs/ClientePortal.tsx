import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ativarTemaLabs } from '@/lib/labsTema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, X } from 'lucide-react';

/**
 * Área de cliente da Webtech Labs — /cliente/:token (pública, sem conta).
 *
 * O token do link é a chave: a página chama lb_portal_dados(token), que o
 * valida na base de dados e devolve só o que é deste cliente, campo a campo
 * (nunca custos, notas internas nem acessos). O cliente pode aprovar ou
 * recusar um orçamento de assistência e abrir um pedido de suporte.
 *
 * Fala com o cliente por tu, como o site, e veste a identidade da Webtech.
 */
const FASE: Record<string, string> = {
  rececao: 'Recebido na loja', diagnostico: 'Em diagnóstico', orcamento: 'Orçamento à espera da tua resposta',
  aprovado: 'Aprovado · na fila de reparação', em_reparacao: 'Em reparação', pronto: 'Pronto a levantar',
  entregue: 'Entregue', recusado: 'Orçamento recusado',
};
const SUP: Record<string, string> = { aberto: 'Aberto', em_curso: 'Em curso', aguarda_cliente: 'À espera da tua resposta', resolvido: 'Resolvido', fechado: 'Fechado' };
const TIPO: Record<string, string> = { dominio: 'Domínio', alojamento: 'Alojamento', email: 'Email', certificado: 'Certificado', vps: 'VPS', servidor: 'Servidor', licenca: 'Licença', rede: 'Rede', equipamento: 'Equipamento', repositorio: 'Repositório', ambiente: 'Ambiente', outro: 'Serviço' };

const dinheiro = (v: number | null, moeda = 'EUR') =>
  v == null ? '—' : new Intl.NumberFormat(moeda === 'BRL' ? 'pt-BR' : 'pt-PT', { style: 'currency', currency: moeda }).format(v);
const data = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function ClientePortal() {
  const { token = '' } = useParams();
  const [d, setD] = useState<any>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [aDecidir, setADecidir] = useState<string | null>(null);
  const [pedido, setPedido] = useState({ titulo: '', descricao: '' });
  const [aEnviar, setAEnviar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = async () => {
    const { data: r, error } = await (supabase.rpc as any)('lb_portal_dados', { p_token: token });
    setD(error ? { ok: false, erro: 'Não foi possível abrir a tua área. Tenta daqui a pouco.' } : r);
    setACarregar(false);
  };
  useEffect(() => { ativarTemaLabs(); carregar(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const decidir = async (id: string, aprovar: boolean) => {
    setADecidir(id);
    const { data: r } = await (supabase.rpc as any)('lb_portal_decidir_orcamento', { p_token: token, p_assistencia: id, p_aprovar: aprovar });
    setADecidir(null);
    setAviso(r?.ok ? (aprovar ? 'Obrigado! Vamos avançar com a reparação.' : 'Registado. Podes levantar o equipamento quando quiseres.') : r?.erro ?? 'Não foi possível registar.');
    carregar();
  };

  const pedirSuporte = async () => {
    setAEnviar(true);
    const { data: r } = await (supabase.rpc as any)('lb_portal_pedir_suporte', { p_token: token, p_titulo: pedido.titulo, p_descricao: pedido.descricao });
    setAEnviar(false);
    if (r?.ok) { setPedido({ titulo: '', descricao: '' }); setAviso(`Pedido ${r.numero} aberto. Respondemos o mais depressa possível.`); carregar(); }
    else setAviso(r?.erro ?? 'Não foi possível abrir o pedido.');
  };

  const Bloco = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
    <section className="rounded-[18px] border border-border bg-card p-5 md:p-6 space-y-3">
      <h2 className="text-xl font-bold">{titulo}</h2>
      {children}
    </section>
  );

  return (
    <div className="min-h-screen">
      <header className="max-w-4xl mx-auto px-4 md:px-6 py-6 flex items-center justify-between">
        <a href="https://www.webtechinformatica.com"><img src="/assets/labs/logo-webtech-labs.png" alt="Webtech Labs" className="h-8 w-auto" /></a>
        <span className="text-[11px] font-mono tracking-[.08em] text-muted-foreground uppercase">Área de cliente</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 pb-16 space-y-5">
        {aCarregar ? <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />A abrir…</p>
          : !d?.ok ? (
            <div className="rounded-[18px] border border-border bg-card p-6">
              <h1 className="text-3xl font-bold mb-2">Link inválido.</h1>
              <p className="text-muted-foreground">{d?.erro}</p>
              <p className="text-muted-foreground mt-3">Fala connosco: <a className="text-vertical" href="https://wa.me/351920495969">WhatsApp</a> ou comercial@webtechinformatica.com.</p>
            </div>
          ) : (
            <>
              <div>
                <p className="ds-eyebrow mb-2">{d.empresa}</p>
                <h1 className="text-4xl md:text-5xl font-bold">Olá, {String(d.cliente ?? '').split(' ')[0]}.</h1>
                <p className="text-muted-foreground mt-2">Aqui vês tudo o que estamos a fazer contigo, sempre atualizado.</p>
              </div>

              {aviso && <div className="rounded-[14px] bg-vertical text-vertical-foreground px-4 py-3 text-sm font-medium">{aviso}</div>}

              {d.assistencias.length > 0 && (
                <Bloco titulo="Assistências">
                  <div className="divide-y divide-border">
                    {d.assistencias.map((a: any) => (
                      <div key={a.id} className="py-3 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-sm text-vertical">OS {a.os}</span>
                          <span className="font-medium flex-1">{a.equipamento || 'Equipamento'}</span>
                          <Badge variant="outline">{FASE[a.fase] ?? a.fase}</Badge>
                        </div>
                        {a.diagnostico && <p className="text-sm text-muted-foreground">{a.diagnostico}</p>}
                        {a.fase === 'orcamento' && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm">Orçamento: <b>{dinheiro(a.orcamento)}</b></span>
                            <Button size="sm" onClick={() => decidir(a.id, true)} disabled={!!aDecidir}>
                              {aDecidir === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}Aprovar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => decidir(a.id, false)} disabled={!!aDecidir}><X className="h-3.5 w-3.5 mr-1" />Recusar</Button>
                          </div>
                        )}
                        {a.garantia_ate && <p className="text-xs text-muted-foreground">Garantia até {data(a.garantia_ate)}</p>}
                      </div>
                    ))}
                  </div>
                </Bloco>
              )}

              {d.projetos.length > 0 && (
                <Bloco titulo="Projetos">
                  <div className="divide-y divide-border">
                    {d.projetos.map((p: any, i: number) => (
                      <div key={i} className="py-3 flex items-center gap-3 flex-wrap">
                        <span className="font-medium flex-1">{p.nome}</span>
                        <span className="text-sm text-muted-foreground tabular-nums">{p.feitas}/{p.fases} fases</span>
                        {p.prazo && <span className="text-sm text-muted-foreground">entrega {data(p.prazo)}</span>}
                      </div>
                    ))}
                  </div>
                </Bloco>
              )}

              {d.renovacoes.length > 0 && (
                <Bloco titulo="Os teus serviços e renovações">
                  <div className="divide-y divide-border">
                    {d.renovacoes.map((r: any, i: number) => (
                      <div key={i} className="py-2.5 flex items-center gap-3 flex-wrap text-sm">
                        <Badge variant="outline">{TIPO[r.tipo] ?? r.tipo}</Badge>
                        <span className="flex-1">{r.nome}</span>
                        <span className="text-muted-foreground">{r.renovacao ? `renova a ${data(r.renovacao)}${r.automatica ? ' (automático)' : ''}` : '—'}</span>
                        {r.preco != null && <span className="tabular-nums">{dinheiro(r.preco, r.moeda ?? 'EUR')}</span>}
                      </div>
                    ))}
                  </div>
                </Bloco>
              )}

              {d.growth.length > 0 && (
                <Bloco titulo="Resultados das campanhas">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead><tr className="text-xs text-muted-foreground text-left"><th className="py-2 font-medium">Mês</th><th className="font-medium">Conta</th><th className="font-medium text-right">Investimento</th><th className="font-medium text-right">Leads</th><th className="font-medium text-right">Custo por lead</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {d.growth.map((g: any, i: number) => (
                          <tr key={i}>
                            <td className="py-2 capitalize">{new Date(g.mes + 'T00:00:00').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</td>
                            <td>{g.conta}</td>
                            <td className="text-right tabular-nums">{dinheiro(Number(g.investimento), g.moeda)}</td>
                            <td className="text-right tabular-nums">{g.leads ?? '—'}</td>
                            <td className="text-right tabular-nums">{g.leads ? dinheiro(Number(g.investimento) / g.leads, g.moeda) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Bloco>
              )}

              <Bloco titulo="Suporte">
                {d.suporte.length > 0 && (
                  <div className="divide-y divide-border">
                    {d.suporte.map((s: any, i: number) => (
                      <div key={i} className="py-2.5 flex items-center gap-3 text-sm flex-wrap">
                        <span className="font-mono text-muted-foreground">{s.numero}</span>
                        <span className="flex-1">{s.titulo}</span>
                        <Badge variant="outline">{SUP[s.estado] ?? s.estado}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2 pt-2">
                  <p className="text-sm text-muted-foreground">Precisas de ajuda? Abre um pedido e respondemos o mais depressa possível.</p>
                  <Input value={pedido.titulo} onChange={e => setPedido(p => ({ ...p, titulo: e.target.value }))} placeholder="O que se passa? (ex.: a impressora não imprime)" maxLength={200} />
                  <Textarea rows={3} value={pedido.descricao} onChange={e => setPedido(p => ({ ...p, descricao: e.target.value }))} placeholder="Conta-nos os detalhes (opcional)" maxLength={4000} />
                  <Button onClick={pedirSuporte} disabled={aEnviar || !pedido.titulo.trim()}>{aEnviar ? 'A enviar…' : 'Abrir pedido'}</Button>
                </div>
              </Bloco>
            </>
          )}
      </main>
      <footer className="max-w-4xl mx-auto px-4 md:px-6 pb-10 text-xs text-muted-foreground font-mono tracking-[.06em]">
        Webtech Labs · Mirandela, PT ⇄ BR · uma solução Clariza
      </footer>
    </div>
  );
}
