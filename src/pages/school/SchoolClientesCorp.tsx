import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Building2, Pencil, Trash2 } from 'lucide-react';
import { useSchoolClientesCorp, SchoolClienteCorp, SchoolClienteCorpInput } from '@/hooks/useSchoolClientesCorp';

const EMPTY: SchoolClienteCorpInput = {
  nome: '', cnpj: null, email: null, telefone: null,
  responsavel: null, cargo_responsavel: null, endereco: null, ativo: true,
};

export default function SchoolClientesCorp() {
  const { clientes, isLoading, createCliente, updateCliente, deleteCliente } = useSchoolClientesCorp();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClienteCorp | null>(null);
  const [form, setForm] = useState<SchoolClienteCorpInput>({ ...EMPTY });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    clientes.filter(c =>
      !search ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.cnpj ?? '').includes(search) ||
      (c.responsavel ?? '').toLowerCase().includes(search.toLowerCase())
    ), [clientes, search]);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setFormOpen(true); };
  const openEdit = (c: SchoolClienteCorp) => { setEditing(c); setForm({ nome: c.nome, cnpj: c.cnpj, email: c.email, telefone: c.telefone, responsavel: c.responsavel, cargo_responsavel: c.cargo_responsavel, endereco: c.endereco, ativo: c.ativo }); setFormOpen(true); };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    if (editing) updateCliente.mutate({ id: editing.id, ...form });
    else createCliente.mutate(form);
    setFormOpen(false);
  };

  const str = (v: string | null) => v || null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes Corporativos</h1>
          <p className="text-sm text-muted-foreground">{clientes.filter(c => c.ativo).length} cliente{clientes.filter(c => c.ativo).length !== 1 ? 's' : ''} activo{clientes.filter(c => c.ativo).length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Nome, CNPJ, responsável..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente corporativo registado'}
                </TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">{c.cnpj ?? '—'}</TableCell>
                  <TableCell className="text-sm">
                    {c.responsavel ? (<><span>{c.responsavel}</span>{c.cargo_responsavel && <span className="text-muted-foreground ml-1">· {c.cargo_responsavel}</span>}</>) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email ?? c.telefone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={c.ativo ? 'border-green-500/40 text-green-600 bg-green-500/10' : 'text-muted-foreground'}>
                      {c.ativo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente Corporativo'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Nome da Empresa *</Label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Petrobras S.A." />
            </div>
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input value={form.cnpj ?? ''} onChange={e => setForm(p => ({ ...p, cnpj: str(e.target.value) }))} placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.telefone ?? ''} onChange={e => setForm(p => ({ ...p, telefone: str(e.target.value) }))} placeholder="(96) 99999-9999" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: str(e.target.value) }))} placeholder="contato@empresa.com" />
            </div>
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Input value={form.responsavel ?? ''} onChange={e => setForm(p => ({ ...p, responsavel: str(e.target.value) }))} placeholder="Nome do responsável" />
            </div>
            <div className="space-y-1">
              <Label>Cargo</Label>
              <Input value={form.cargo_responsavel ?? ''} onChange={e => setForm(p => ({ ...p, cargo_responsavel: str(e.target.value) }))} placeholder="Ex: Gerente de SST" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Endereço</Label>
              <Input value={form.endereco ?? ''} onChange={e => setForm(p => ({ ...p, endereco: str(e.target.value) }))} placeholder="Rua, número, bairro, cidade" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} className="rounded" />
              <Label htmlFor="ativo">Cliente activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome.trim() || createCliente.isPending || updateCliente.isPending}>
              {editing ? 'Guardar' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover cliente corporativo?</AlertDialogTitle><AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteCliente.mutate(deleteId); setDeleteId(null); }}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
