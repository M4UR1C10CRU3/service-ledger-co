import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useClientes } from '@/hooks/useClientes';
import { useToast } from '@/hooks/use-toast';
import type { Nucleo } from '@/hooks/useNucleos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarClock, KeyRound, Plus } from 'lucide-react';

/**
 * Ativos dos clientes — o que a Webtech gere em nome de cada cliente e que
 * renova: domínios, alojamento, repositórios (Produto Digital); VPS,
 * servidores, rede, licenças (Infraestrutura & Cloud). Mesma tabela
 * (lb_ativos), cada núcleo vê os seus tipos.
 *
 * O que interessa ver primeiro é o que está para renovar: a lista ordena por
 * data e pinta a amarelo o que renova em 30 dias e a vermelho o que já passou.
 *
 * Nunca se guarda uma palavra-passe aqui. O campo «Onde estão os acessos» diz
 * só onde procurar (o cofre), e o formulário lembra-o.
 */
export const TIPOS_ATIVO: Record<string, string> = {
  dominio: 'Domínio', alojamento: 'Alojamento', repositorio: 'Repositório', ambiente: 'Ambiente',
  email: 'Email', certificado: 'Certificado', vps: 'VPS', servidor: 'Servidor', rede: 'Rede',
  equipamento: 'Equipamento', licenca: 'Licença', outro: 'Outro',
};

interface Ativo {
  id: string; cliente_id: string | null; cliente_nome: string | null; nucleo_id: string | null;
  tipo: string; nome: string; fornecedor: string | null; referencia: string | null; localizacao: string | null;
  acesso_onde: string | null; renovacao: string | null; periodicidade: string | null; renovacao_automatica: boolean;
  custo: number | null; preco_cliente: number | null; moeda: string | null; estado: string; notas: string | null;
}

const vazio = (nucleoId: string, tipo: string): Partial<Ativo> => ({
  tipo, nome: '', nucleo_id: nucleoId, cliente_id: null, fornecedor: '', referencia: '', localizacao: '',
  acesso_onde: '', renovacao: '', periodicidade: 'anual', renovacao_automatica: false,
  custo: null, preco_cliente: null, moeda: 'EUR', estado: 'ativo', notas: '',
});

function diasAte(data: string | null) {
  if (!data) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.round((new Date(data + 'T00:00:00').getTime() - hoje.getTime()) / 864e5);
}

export function AtivosClientes({ nucleo, tipos, titulo }: { nucleo: Nucleo; tipos: string[]; titulo: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { empresa } = useEmpresa();
  const { clientes } = useClientes();
  const [form, setForm] = useState<Partial<Ativo> | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const chave = ['lb_ativos', empresa?.id, tipos.join(',')];

  const { data, isLoading } = useQuery({
    queryKey: chave,
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from('lb_ativos' as any) as any)
        .select('*').eq('empresa_id', empresa!.id).in('tipo', tipos).eq('estado', 'ativo')
        .order('renovacao', { ascending: true, nullsFirst: false });
      // Sem a tabela (SQL por aplicar), mostra-se o aviso em vez de partir a página.
      if (error) return { ativos: [] as Ativo[], semTabela: true };
      return { ativos: (data || []) as Ativo[], semTabela: false };
    },
  });

  const ativos = data?.ativos ?? [];
  const aRenovar = useMemo(() => ativos.filter(a => { const d = diasAte(a.renovacao); return d != null && d <= 30; }), [ativos]);

  const guardar = async () => {
    if (!empresa || !form?.nome?.trim()) return;
    setAGuardar(true);
    const c = clientes.find(x => x.id === form.cliente_id);
    const linha = {
      empresa_id: empresa.id, tipo: form.tipo, nome: form.nome!.trim(), nucleo_id: form.nucleo_id ?? nucleo.id,
      cliente_id: form.cliente_id ?? null, cliente_nome: c?.nome ?? form.cliente_nome ?? null,
      fornecedor: form.fornecedor || null, referencia: form.referencia || null, localizacao: form.localizacao || null,
      acesso_onde: form.acesso_onde || null, renovacao: form.renovacao || null, periodicidade: form.periodicidade || null,
      renovacao_automatica: !!form.renovacao_automatica, custo: form.custo ?? null, preco_cliente: form.preco_cliente ?? null,
      moeda: form.moeda || null, notas: form.notas || null, atualizado_em: new Date().toISOString(),
    };
    const q = form.id
      ? (supabase.from('lb_ativos' as any) as any).update(linha).eq('id', form.id).eq('empresa_id', empresa.id)
      : (supabase.from('lb_ativos' as any) as any).insert(linha);
    const { error } = await q;
    setAGuardar(false);
    if (error) { toast({ title: 'Não foi possível guardar', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Ativo guardado' });
    setForm(null);
    qc.invalidateQueries({ queryKey: ['lb_ativos'] });
  };

  const cancelar = async (a: Ativo) => {
    const { error } = await (supabase.from('lb_ativos' as any) as any)
      .update({ estado: 'cancelado', atualizado_em: new Date().toISOString() }).eq('id', a.id).eq('empresa_id', empresa!.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { setForm(null); qc.invalidateQueries({ queryKey: ['lb_ativos'] }); }
  };

  const set = (k: keyof Ativo, v: any) => setForm(f => ({ ...f!, [k]: v }));

  return (
    <Card><CardContent className="p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><CalendarClock className="h-4 w-4 text-vertical" />{titulo}</h2>
          <p className="text-xs text-muted-foreground">
            {aRenovar.length ? `${aRenovar.length} a renovar nos próximos 30 dias` : 'Nada a renovar nos próximos 30 dias'}
          </p>
        </div>
        <Button size="sm" onClick={() => setForm(vazio(nucleo.id, tipos[0]))} disabled={data?.semTabela}>
          <Plus className="h-3.5 w-3.5 mr-1" />Novo ativo
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">A carregar...</p>
        : data?.semTabela ? <p className="text-sm text-muted-foreground">Os ativos ficam ativos quando o SQL dos ativos for aplicado.</p>
        : ativos.length === 0 ? <p className="text-sm text-muted-foreground py-2">Ainda não há ativos registados.</p>
        : (
          <div className="divide-y divide-border">
            {ativos.map(a => {
              const d = diasAte(a.renovacao);
              const cor = d == null ? '' : d < 0 ? 'text-destructive' : d <= 30 ? 'text-vertical' : 'text-muted-foreground';
              return (
                <div key={a.id} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded-md"
                     onClick={() => setForm({ ...a, renovacao: a.renovacao ?? '' })}>
                  <Badge variant="outline" className="shrink-0">{TIPOS_ATIVO[a.tipo] ?? a.tipo}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.cliente_nome || 'Sem cliente'}{a.fornecedor ? ` · ${a.fornecedor}` : ''}</p>
                  </div>
                  <span className={`text-xs font-mono tabular-nums text-right ${cor}`}>
                    {a.renovacao ? new Date(a.renovacao + 'T00:00:00').toLocaleDateString('pt-PT') : 'sem data'}
                    {d != null && <><br />{d < 0 ? `há ${-d} dias` : d === 0 ? 'hoje' : `em ${d} dias`}{a.renovacao_automatica ? ' · auto' : ''}</>}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      <Dialog open={!!form} onOpenChange={v => { if (!v) setForm(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form?.id ? 'Editar ativo' : 'Novo ativo'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tipos.map(t => <SelectItem key={t} value={t}>{TIPOS_ATIVO[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id ?? ''} onValueChange={v => set('cliente_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Escolher cliente" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nome *</Label><Input value={form.nome ?? ''} onChange={e => set('nome', e.target.value)} placeholder="ex.: clientex.pt · VPS produção" /></div>
                <div><Label>Fornecedor</Label><Input value={form.fornecedor ?? ''} onChange={e => set('fornecedor', e.target.value)} placeholder="ex.: Hostinger, GitHub, Microsoft" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Referência</Label><Input value={form.referencia ?? ''} onChange={e => set('referencia', e.target.value)} placeholder="URL, IP, n.º de série, ID" /></div>
                <div><Label>Localização</Label><Input value={form.localizacao ?? ''} onChange={e => set('localizacao', e.target.value)} placeholder="cloud, datacenter, escritório do cliente" /></div>
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />Onde estão os acessos</Label>
                <Input value={form.acesso_onde ?? ''} onChange={e => set('acesso_onde', e.target.value)} placeholder="ex.: Bitwarden → Cliente X → Hostinger" />
                <p className="text-xs text-muted-foreground mt-1">Só o sítio onde procurar. Nunca escrevas aqui uma palavra-passe, chave ou token.</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Renova em</Label><Input type="date" value={form.renovacao ?? ''} onChange={e => set('renovacao', e.target.value)} /></div>
                <div>
                  <Label>Periodicidade</Label>
                  <Select value={form.periodicidade ?? 'anual'} onValueChange={v => set('periodicidade', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['mensal', 'trimestral', 'anual', 'bienal', 'unica'].map(p => <SelectItem key={p} value={p}>{p === 'unica' ? 'única' : p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Switch checked={!!form.renovacao_automatica} onCheckedChange={v => set('renovacao_automatica', v)} />
                  <span className="text-sm">Renova sozinho</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Custo</Label><Input type="number" step="0.01" value={form.custo ?? ''} onChange={e => set('custo', e.target.value ? Number(e.target.value) : null)} /></div>
                <div><Label>Preço ao cliente</Label><Input type="number" step="0.01" value={form.preco_cliente ?? ''} onChange={e => set('preco_cliente', e.target.value ? Number(e.target.value) : null)} /></div>
                <div>
                  <Label>Moeda</Label>
                  <Select value={form.moeda ?? 'EUR'} onValueChange={v => set('moeda', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="EUR">EUR</SelectItem><SelectItem value="BRL">BRL</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notas</Label><Textarea rows={2} value={form.notas ?? ''} onChange={e => set('notas', e.target.value)} /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {form?.id && <Button variant="outline" className="mr-auto" onClick={() => cancelar(form as Ativo)}>Deixou de ser nosso</Button>}
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={aGuardar || !form?.nome?.trim()}>{aGuardar ? 'A guardar...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  );
}

export default AtivosClientes;
