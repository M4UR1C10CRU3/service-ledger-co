import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Users } from 'lucide-react';
import { AcessoPortalBotao } from '@/components/school/AcessoPortalBotao';

/**
 * Contactos da empresa cliente com acesso ao portal.
 *
 * Vários por empresa, de propósito: o RH e o técnico de segurança precisam
 * ambos de entrar, e uma credencial partilhada não se revoga a um só nem diz
 * quem pediu o quê.
 */
export function ContactosCorpDialog({
  cliente,
  aberto,
  onFechar,
}: {
  cliente: { id: string; nome: string } | null;
  aberto: boolean;
  onFechar: () => void;
}) {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [novo, setNovo] = useState({ nome: '', email: '', cargo: '' });

  const { data: contactos = [], isLoading } = useQuery({
    queryKey: ['corp_contactos', cliente?.id],
    enabled: !!cliente?.id && aberto,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('school_corp_contactos')
        .select('id, nome, email, cargo, ativo, auth_user_id')
        .eq('cliente_id', cliente!.id)
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any)
        .from('school_corp_contactos')
        .insert({
          empresa_id: empresa!.id,
          cliente_id: cliente!.id,
          nome: novo.nome.trim(),
          email: novo.email.trim().toLowerCase(),
          cargo: novo.cargo.trim() || null,
        })
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Não foi gravado — sem permissão sobre esta empresa.');
    },
    onSuccess: () => {
      setNovo({ nome: '', email: '', cargo: '' });
      qc.invalidateQueries({ queryKey: ['corp_contactos', cliente?.id] });
      toast({ title: 'Contacto adicionado', description: 'Já pode conceder-lhe acesso ao portal.' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('school_corp_contactos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corp_contactos', cliente?.id] });
      toast({ title: 'Contacto removido', description: 'O acesso ao portal deixa de funcionar.' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={aberto} onOpenChange={o => !o && onFechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />Acesso ao portal — {cliente?.nome}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Quem tiver conta aqui entra no espaço desta empresa e vê os contratos, a
          calendarização, os formandos e os certificados <strong>dela</strong> — mais nada.
        </p>

        <div className="rounded border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Acesso</TableHead>
              <TableHead className="w-12" />
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : contactos.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  Ainda não há contactos com acesso.
                </TableCell></TableRow>
              ) : contactos.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-sm">{c.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.cargo ?? '—'}</TableCell>
                  <TableCell><AcessoPortalBotao email={c.email} ligado={!!c.auth_user_id} compacto /></TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                      onClick={() => remover.mutate(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end pt-2 border-t">
          <div className="space-y-1">
            <Label className="text-xs">Nome *</Label>
            <Input value={novo.nome} onChange={e => setNovo(p => ({ ...p, nome: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email *</Label>
            <Input type="email" value={novo.email} onChange={e => setNovo(p => ({ ...p, email: e.target.value }))} />
          </div>
          <Button
            onClick={() => criar.mutate()}
            disabled={!novo.nome.trim() || !novo.email.trim() || criar.isPending}>
            <Plus className="h-4 w-4 mr-2" />Adicionar
          </Button>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Cargo</Label>
            <Input value={novo.cargo} placeholder="Recursos Humanos, Segurança..."
              onChange={e => setNovo(p => ({ ...p, cargo: e.target.value }))} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
