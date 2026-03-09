import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Supplier, SupplierFormData, emptySupplierForm, GAMAS_OPTIONS } from '@/types/supplier';
import { SupplierFormDialog } from '@/components/SupplierFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Search, Pencil, Trash2, Truck, Phone, Eye, ChevronLeft, ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 10;

export default function Fornecedores() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { empresa, getLogo, isLoading: empresaLoading } = useEmpresa();
  const { suppliers, isLoading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();

  useEffect(() => {
    if (empresaLoading) return;
    if (!empresa) {
      const saved = localStorage.getItem('selectedEmpresa');
      if (!saved) navigate('/empresa');
    }
  }, [empresa, navigate]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGama, setFilterGama] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>({ ...emptySupplierForm });

  const filtered = useMemo(() => {
    let result = suppliers;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.razaoSocial.toLowerCase().includes(q) ||
        s.cnpjCpf.includes(q)
      );
    }
    if (filterGama !== 'all') result = result.filter(s => (s.gamas || []).includes(filterGama));
    if (filterStatus !== 'all') result = result.filter(s => s.status === filterStatus);
    return result;
  }, [suppliers, searchTerm, filterGama, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchTerm, filterGama, filterStatus]);

  const resetForm = () => { setFormData({ ...emptySupplierForm }); setEditingSupplier(null); };

  const handleOpenForm = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        tipoPessoa: supplier.tipoPessoa,
        razaoSocial: supplier.razaoSocial,
        nomeFantasia: supplier.nomeFantasia || '',
        cnpjCpf: supplier.cnpjCpf,
        categoria: supplier.categoria,
        telefone: supplier.telefone || '',
        telefoneSecundario: supplier.telefoneSecundario || '',
        email: supplier.email || '',
        contatoPrincipal: supplier.contatoPrincipal || '',
        cep: supplier.cep || '',
        logradouro: supplier.logradouro || '',
        numero: supplier.numero || '',
        complemento: supplier.complemento || '',
        bairro: supplier.bairro || '',
        cidade: supplier.cidade || '',
        estado: supplier.estado || '',
        banco: supplier.banco || '',
        agencia: supplier.agencia || '',
        conta: supplier.conta || '',
        iban: supplier.iban || '',
        swiftBic: supplier.swiftBic || '',
        pais: supplier.pais || 'Portugal',
        gamas: supplier.gamas || [],
        observacoes: supplier.observacoes || '',
        status: supplier.status,
      });
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.razaoSocial.trim()) {
      toast({ title: 'Erro', description: formData.tipoPessoa === 'juridica' ? 'Nome Empresarial é obrigatório.' : 'Nome Completo é obrigatório.', variant: 'destructive' });
      return;
    }
    if (!formData.cnpjCpf.trim()) {
      toast({ title: 'Erro', description: 'NIF é obrigatório.', variant: 'destructive' });
      return;
    }

    if (editingSupplier) {
      const ok = await updateSupplier(editingSupplier.id, formData);
      toast(ok
        ? { title: 'Fornecedor actualizado', description: 'Dados actualizados com sucesso.' }
        : { title: 'Erro', description: 'Não foi possível actualizar.', variant: 'destructive' }
      );
    } else {
      const result = await addSupplier(formData);
      toast(result
        ? { title: 'Fornecedor guardado', description: 'Fornecedor adicionado com sucesso.' }
        : { title: 'Erro', description: 'Não foi possível guardar.', variant: 'destructive' }
      );
    }
    setIsFormOpen(false);
    resetForm();
  };

  const handleConfirmDelete = async () => {
    if (supplierToDelete) {
      const result = await deleteSupplier(supplierToDelete.id);
      if (result.success) {
        toast({ title: 'Fornecedor removido', description: 'Fornecedor removido com sucesso.' });
      } else {
        toast({ title: 'Erro', description: result.reason || 'Não foi possível remover.', variant: 'destructive' });
      }
    }
    setIsDeleteOpen(false);
    setSupplierToDelete(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Gestão de Fornecedores</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <Truck className="w-6 h-6 text-primary" />
              <CardTitle>Fornecedores</CardTitle>
              <span className="text-sm text-muted-foreground">({filtered.length})</span>
            </div>
            <Button onClick={() => handleOpenForm()} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Pesquisar por nome ou NIF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterGama} onValueChange={setFilterGama}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Gama" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Gamas</SelectItem>
                {GAMAS_OPTIONS.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Activo</SelectItem>
                <SelectItem value="inativo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">A carregar fornecedores...</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterGama !== 'all' || filterStatus !== 'all' ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor registado.'}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>NIF</TableHead>
                      <TableHead>Gamas</TableHead>
                      <TableHead>Telemóvel</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[120px]">Acções</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.razaoSocial}</TableCell>
                        <TableCell className="font-mono text-sm">{s.cnpjCpf}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {(s.gamas || []).slice(0, 3).map(g => (
                              <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                            ))}
                            {(s.gamas || []).length > 3 && (
                              <Badge variant="outline" className="text-xs">+{s.gamas.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.telefone ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {s.telefone}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.status === 'ativo' ? 'default' : 'outline'}>
                            {s.status === 'ativo' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setViewingSupplier(s); setIsDetailOpen(true); }} title="Ver detalhes">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenForm(s)} title="Editar">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setSupplierToDelete(s); setIsDeleteOpen(true); }} title="Remover">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <SupplierFormDialog
        open={isFormOpen}
        onOpenChange={(o) => { setIsFormOpen(o); if (!o) resetForm(); }}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isEditing={!!editingSupplier}
      />

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Fornecedor</DialogTitle>
          </DialogHeader>
          {viewingSupplier && (
            <div className="grid gap-3 text-sm">
              <DetailRow label="Nome" value={viewingSupplier.razaoSocial} />
              <DetailRow label="Tipo" value={viewingSupplier.tipoPessoa === 'juridica' ? 'Pessoa Colectiva' : 'Pessoa Singular'} />
              <DetailRow label="NIF" value={viewingSupplier.cnpjCpf} />
              <DetailRow label="Estado" value={viewingSupplier.status === 'ativo' ? 'Activo' : 'Inactivo'} />
              {viewingSupplier.telefone && <DetailRow label="Telemóvel" value={viewingSupplier.telefone} />}
              {viewingSupplier.telefoneSecundario && <DetailRow label="Tel. Fixo" value={viewingSupplier.telefoneSecundario} />}
              {viewingSupplier.email && <DetailRow label="E-mail" value={viewingSupplier.email} />}
              {viewingSupplier.contatoPrincipal && <DetailRow label="Contacto" value={viewingSupplier.contatoPrincipal} />}
              {(viewingSupplier.logradouro || viewingSupplier.cidade) && (
                <DetailRow label="Morada" value={[viewingSupplier.logradouro, viewingSupplier.numero, viewingSupplier.complemento, viewingSupplier.bairro, viewingSupplier.cidade, viewingSupplier.estado, viewingSupplier.cep].filter(Boolean).join(', ')} />
              )}
              {viewingSupplier.iban && <DetailRow label="IBAN" value={viewingSupplier.iban} />}
              {viewingSupplier.swiftBic && <DetailRow label="SWIFT/BIC" value={viewingSupplier.swiftBic} />}
              {viewingSupplier.banco && <DetailRow label="Banco" value={viewingSupplier.banco} />}
              {(viewingSupplier.gamas || []).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <span className="font-medium text-muted-foreground min-w-[120px]">Gamas:</span>
                  <div className="flex flex-wrap gap-1">
                    {viewingSupplier.gamas.map(g => <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>)}
                  </div>
                </div>
              )}
              {viewingSupplier.observacoes && <DetailRow label="Observações" value={viewingSupplier.observacoes} />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover <strong>{supplierToDelete?.razaoSocial}</strong>? Esta acção pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-muted-foreground min-w-[120px]">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
