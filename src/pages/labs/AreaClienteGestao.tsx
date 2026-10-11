import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useClientes } from '@/hooks/useClientes';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Copy, KeyRound, MessageCircle, Plus } from 'lucide-react';

/**
 * Área de cliente — gestão dos links pessoais (Clariza Labs).
 *
 * Criar um acesso gera, NO BROWSER, um token aleatório de 256 bits; à base de
 * dados só vai o SHA-256 dele. O link completo aparece uma única vez, para
 * copiar ou mandar por WhatsApp — depois disso nem a Webtech o consegue ver
 * (se o cliente o perder, cria-se outro e revoga-se o antigo).
 */
const BASE = 'https://labs.webtechinformatica.com/cliente/';

function gerarToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha256hex(s: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export default function AreaClienteGestao() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { empresa } = useEmpresa();
  const { clientes } = useClientes();
  const [novo, setNovo] = useState<{ clienteId: string | null; dias: number } | null>(null);
  const [link, setLink] = useState<{ url: string; nome: string; telefone: string | null } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['lb_portal_acessos', empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from('lb_portal_acessos' as any) as any)
        .select('id, cliente_id, cliente_nome, expira_em, revogado_em, ultimo_acesso_em, criado_em')
        .eq('empresa_id', empresa!.id).order('criado_em', { ascending: false });
      if (error) return { lista: [] as any[], semTabela: true };
      return { lista: (data || []) as any[], semTabela: false };
    },
  });

  const criar = async () => {
    if (!empresa || !novo?.clienteId) return;
    const c = clientes.find(x => x.id === novo.clienteId) as any;
    const token = gerarToken();
    const { error } = await (supabase.from('lb_portal_acessos' as any) as any).insert({
      empresa_id: empresa.id, cliente_id: novo.clienteId, cliente_nome: c?.nome ?? null,
      token_hash: await sha256hex(token),
      expira_em: new Date(Date.now() + novo.dias * 864e5).toISOString(),
    });
    if (error) { toast({ title: 'Não foi possível criar o acesso', description: error.message, variant: 'destructive' }); return; }
    setNovo(null);
    setLink({ url: BASE + token, nome: c?.nome ?? 'cliente', telefone: c?.telefone ?? null });
    qc.invalidateQueries({ queryKey: ['lb_portal_acessos'] });
  };

  const revogar = async (id: string) => {
    const { error } = await (supabase.from('lb_portal_acessos' as any) as any)
      .update({ revogado_em: new Date().toISOString() }).eq('id', id).eq('empresa_id', empresa!.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else qc.invalidateQueries({ queryKey: ['lb_portal_acessos'] });
  };

  const wa = (l: NonNullable<typeof link>) => {
    let n = (l.telefone ?? '').replace(/\D/g, '');
    if (n.length === 9) n = `351${n}`;
    const texto = `Olá ${l.nome.split(' ')[0]}! Esta é a tua área de cliente da Webtech Labs, onde acompanhas as reparações, os projetos e as renovações: ${l.url}`;
    return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
  };

  const estado = (a: any) => a.revogado_em ? 'Revogado' : new Date(a.expira_em) < new Date() ? 'Expirado' : 'Ativo';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="ds-eyebrow mb-2">Comercial</p>
          <h1 className="text-3xl font-bold">Área de cliente</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Cada cliente recebe um link pessoal: vê as assistências (e aprova orçamentos), os projetos, as renovações e os resultados de Growth, e abre pedidos de suporte. Sem conta nem palavra-passe.
          </p>
        </div>
        <Button onClick={() => setNovo({ clienteId: null, dias: 180 })} disabled={data?.semTabela}><Plus className="h-4 w-4 mr-2" />Criar acesso</Button>
      </div>

      <Card><CardContent className="p-5">
        {isLoading ? <p className="text-sm text-muted-foreground">A carregar...</p>
          : data?.semTabela ? <p className="text-sm text-muted-foreground">A área de cliente fica ativa quando o SQL da área de cliente for aplicado.</p>
          : data!.lista.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há acessos criados.</p>
          : (
            <div className="divide-y divide-border">
              {data!.lista.map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2.5 flex-wrap">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium flex-1">{a.cliente_nome}</span>
                  <span className="text-xs text-muted-foreground">criado {new Date(a.criado_em).toLocaleDateString('pt-PT')} · expira {new Date(a.expira_em).toLocaleDateString('pt-PT')}</span>
                  <span className="text-xs text-muted-foreground">{a.ultimo_acesso_em ? `visto ${new Date(a.ultimo_acesso_em).toLocaleDateString('pt-PT')}` : 'nunca aberto'}</span>
                  <Badge variant="outline">{estado(a)}</Badge>
                  {estado(a) === 'Ativo' && <Button size="sm" variant="ghost" onClick={() => revogar(a.id)}>Revogar</Button>}
                </div>
              ))}
            </div>
          )}
      </CardContent></Card>

      <Dialog open={!!novo} onOpenChange={v => { if (!v) setNovo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo acesso à área de cliente</DialogTitle></DialogHeader>
          {novo && (
            <div className="space-y-4">
              <div><Label>Cliente</Label>
                <Select value={novo.clienteId ?? ''} onValueChange={v => setNovo(n => ({ ...n!, clienteId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Escolher cliente" /></SelectTrigger>
                  <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>Válido durante (dias)</Label><Input type="number" value={novo.dias} onChange={e => setNovo(n => ({ ...n!, dias: Math.max(1, Number(e.target.value) || 180) }))} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovo(null)}>Cancelar</Button>
            <Button onClick={criar} disabled={!novo?.clienteId}>Criar link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!link} onOpenChange={v => { if (!v) setLink(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Link de {link?.nome}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Copia-o agora: por segurança, não volta a aparecer. Se se perder, cria outro e revoga este.</p>
          <Input readOnly value={link?.url ?? ''} onFocus={e => e.currentTarget.select()} className="font-mono text-xs" />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(link!.url); toast({ title: 'Link copiado' }); }}><Copy className="h-4 w-4 mr-2" />Copiar</Button>
            {link?.telefone && <Button onClick={() => window.open(wa(link), '_blank', 'noopener')}><MessageCircle className="h-4 w-4 mr-2" />Enviar por WhatsApp</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
