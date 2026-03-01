import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useProdutos, Produto, ProdutoInput } from '@/hooks/useProdutos';
import { useToast } from '@/hooks/use-toast';
import { ProdutoFormDialog } from '@/components/produtos/ProdutoFormDialog';
import { ProdutoDetailDialog } from '@/components/produtos/ProdutoDetailDialog';
import { ExcelUploadDialog } from '@/components/produtos/ExcelUploadDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Upload, Download, Eye, Pencil, Trash2, Search,
  Package, Tag, Link, Unlink, ChevronLeft, ChevronRight, ArrowUpDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';

type SortField = 'refInterna' | 'refFornecedor' | 'descricao' | 'categoria' | 'unidade';
type SortDir = 'asc' | 'desc';

export default function Produtos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { empresa, isLoading: empresaLoading } = useEmpresa();
  const { produtos, isLoading, addProduto, updateProduto, deleteProduto, bulkUpsert, bulkDelete } = useProdutos();

  useEffect(() => {
    if (empresaLoading) return;
    if (!empresa) {
      const saved = localStorage.getItem('selectedEmpresa');
      if (!saved) navigate('/empresa');
    }
  }, [empresa, empresaLoading, navigate]);

  // State
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('refInterna');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [viewingProduto, setViewingProduto] = useState<Produto | null>(null);
  const [produtoToDelete, setProdutoToDelete] = useState<Produto | null>(null);

  // Search with debounce
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Categories
  const categories = useMemo(() => {
    return Array.from(new Set(produtos.map(p => p.categoria))).sort();
  }, [produtos]);

  // Filter + Sort
  const filtered = useMemo(() => {
    let result = produtos;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(p =>
        p.refInterna.toLowerCase().includes(q) ||
        (p.refFornecedor || '').toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q)
      );
    }
    if (filterCategoria !== 'all') {
      result = result.filter(p => p.categoria === filterCategoria);
    }
    result = [...result].sort((a, b) => {
      const aVal = (a[sortField] || '').toString().toLowerCase();
      const bVal = (b[sortField] || '').toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [produtos, debouncedSearch, filterCategoria, sortField, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [debouncedSearch, filterCategoria, pageSize, sortField, sortDir]);

  // Summary
  const totalProdutos = produtos.length;
  const totalCategorias = categories.length;
  const comRefForn = produtos.filter(p => p.refFornecedor).length;
  const semRefForn = produtos.filter(p => !p.refFornecedor).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleSave = async (input: ProdutoInput): Promise<boolean> => {
    if (editingProduto) {
      const ok = await updateProduto(editingProduto.id, input);
      toast(ok
        ? { title: 'Produto atualizado', description: 'Alterações guardadas com sucesso.' }
        : { title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' }
      );
      return ok;
    } else {
      const ok = await addProduto(input);
      toast(ok
        ? { title: 'Produto criado', description: 'Produto adicionado com sucesso.' }
        : { title: 'Erro', description: 'Não foi possível criar. Verifique se a referência já existe.', variant: 'destructive' }
      );
      return ok;
    }
  };

  const handleConfirmDelete = async () => {
    if (produtoToDelete) {
      const ok = await deleteProduto(produtoToDelete.id);
      toast(ok
        ? { title: 'Produto eliminado', description: 'Produto removido com sucesso.' }
        : { title: 'Erro', description: 'Não foi possível eliminar.', variant: 'destructive' }
      );
    }
    setIsDeleteOpen(false);
    setProdutoToDelete(null);
  };

  const handleExcelSync = async (syncResult: any) => {
    let addedCount = 0, updatedCount = 0, deletedCount = 0, errorCount = 0;

    // Add new products
    if (syncResult.toAdd.length > 0) {
      const res = await bulkUpsert(syncResult.toAdd);
      addedCount = res.added;
      errorCount += res.errors;
    }

    // Update existing products
    for (const item of syncResult.toUpdate) {
      const ok = await updateProduto(item.id, {
        descricao: item.input.descricao,
        refFornecedor: item.input.refFornecedor,
        categoria: item.input.categoria,
      });
      if (ok) updatedCount++;
      else errorCount++;
    }

    // Delete removed products
    if (syncResult.toDelete.length > 0) {
      deletedCount = await bulkDelete(syncResult.toDelete.map((p: Produto) => p.id));
    }

    toast({
      title: 'Sincronização concluída',
      description: `${addedCount} adicionados, ${updatedCount} atualizados, ${deletedCount} eliminados${errorCount > 0 ? `, ${errorCount} erros` : ''}.`,
    });
  };

  const handleExport = () => {
    const exportData = filtered.map(p => ({
      'REF. INTERNA': p.refInterna,
      'REF. FORN': p.refFornecedor || '',
      'DESCRIÇÃO': p.descricao,
      'CATEGORIA': p.categoria,
      'UNIDADE': p.unidade || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'produtos_export.xlsx');
    toast({ title: 'Exportação concluída', description: `${exportData.length} produtos exportados.` });
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro de Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os produtos cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Upload Excel
          </Button>
          <Button size="sm" onClick={() => { setEditingProduto(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Produto
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Produtos</p>
                <p className="text-2xl font-bold">{totalProdutos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Categorias</p>
                <p className="text-2xl font-bold">{totalCategorias}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Link className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Com Ref. Fornecedor</p>
                <p className="text-2xl font-bold">{comRefForn}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Unlink className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Sem Ref. Fornecedor</p>
                <p className="text-2xl font-bold">{semRefForn}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Produtos
              <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por ref. interna, ref. fornecedor ou descrição..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {debouncedSearch || filterCategoria !== 'all'
                ? 'Nenhum produto encontrado com os filtros aplicados.'
                : 'Nenhum produto cadastrado. Use "Upload Excel" ou "Novo Produto" para começar.'}
            </div>
          ) : (
            <>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHeader field="refInterna">Ref. Interna</SortHeader>
                      <SortHeader field="refFornecedor">Ref. Fornecedor</SortHeader>
                      <SortHeader field="descricao">Descrição</SortHeader>
                      <SortHeader field="categoria">Categoria</SortHeader>
                      <SortHeader field="unidade">Unidade</SortHeader>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.refInterna}</TableCell>
                        <TableCell className="text-muted-foreground">{p.refFornecedor || '—'}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{p.descricao}</TableCell>
                        <TableCell>
                          <span className="inline-block px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                            {p.categoria}
                          </span>
                        </TableCell>
                        <TableCell>{p.unidade || '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => { setViewingProduto(p); setIsDetailOpen(true); }}
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => { setEditingProduto(p); setIsFormOpen(true); }}
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => { setProdutoToDelete(p); setIsDeleteOpen(true); }}
                              title="Eliminar"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, filtered.length)} de {filtered.length}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="flex items-center text-sm px-2">Página {page} de {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ProdutoFormDialog
        open={isFormOpen}
        onOpenChange={(o) => { setIsFormOpen(o); if (!o) setEditingProduto(null); }}
        produto={editingProduto}
        onSave={handleSave}
        existingCategories={categories}
      />

      <ProdutoDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        produto={viewingProduto}
        onEdit={(p) => { setEditingProduto(p); setIsFormOpen(true); }}
      />

      <ExcelUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        existingProdutos={produtos}
        onConfirm={handleExcelSync}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar o produto {produtoToDelete?.refInterna} - {produtoToDelete?.descricao}? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
