import { useState, useEffect, useMemo } from 'react';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { supabase } from '@/integrations/supabase/client';
import { formatEUR } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search, Mail, ChevronLeft, ChevronRight, History,
  Send, Clock, CalendarDays, Eye, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface EmailRecord {
  id: string;
  cliente_nome: string;
  cliente_email: string;
  email_subject: string | null;
  email_type: string | null;
  valor_debito: number | null;
  dias_atraso: number | null;
  sent_at: string | null;
  service_id: string;
  notas: string | null;
}

const HistoricoCobrancas = () => {
  const { empresa } = useEmpresa();
  const [records, setRecords] = useState<EmailRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Detail dialog
  const [detailRecord, setDetailRecord] = useState<EmailRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Delete confirmation
  const [deleteRecord, setDeleteRecord] = useState<EmailRecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadHistory = async () => {
    if (!empresa?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_history')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error loading email history:', error);
      } else {
        setRecords(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [empresa?.id]);

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(r =>
      r.cliente_nome.toLowerCase().includes(q) ||
      r.cliente_email.toLowerCase().includes(q) ||
      (r.email_subject || '').toLowerCase().includes(q)
    );
  }, [records, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => ({
    total: records.length,
    totalValor: records.reduce((s, r) => s + (r.valor_debito || 0), 0),
    clientesUnicos: new Set(records.map(r => r.cliente_nome)).size,
  }), [records]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getTipoLabel = (tipo: string | null) => {
    if (!tipo) return 'E-mail';
    const map: Record<string, string> = {
      email: 'E-mail',
      whatsapp: 'WhatsApp',
      telefone: 'Telefone',
      presencial: 'Presencial',
    };
    return map[tipo] || tipo;
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    try {
      const { error } = await supabase
        .from('email_history')
        .delete()
        .eq('id', deleteRecord.id);

      if (error) throw error;
      toast.success('Registo eliminado com sucesso');
      setRecords(prev => prev.filter(r => r.id !== deleteRecord.id));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao eliminar registo');
    } finally {
      setDeleteOpen(false);
      setDeleteRecord(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">A carregar histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          Histórico de Cobranças
        </h1>
        <p className="text-sm text-muted-foreground">Registo de todas as cobranças enviadas</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Cobranças enviadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Mail className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatEUR(stats.totalValor)}</p>
              <p className="text-xs text-muted-foreground">Valor total cobrado</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <CalendarDays className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.clientesUnicos}</p>
              <p className="text-xs text-muted-foreground">Clientes contactados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por cliente, email, assunto..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="text-sm text-muted-foreground">
        Mostrando {paginated.length} de {filtered.length} registos
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead className="text-right">Valor Débito</TableHead>
                <TableHead className="text-right">Dias Atraso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <History className="h-8 w-8" />
                      <p className="font-medium">Sem registos</p>
                      <p className="text-sm">Nenhuma cobrança registada ainda.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map(record => (
                  <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailRecord(record); setDetailOpen(true); }}>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDate(record.sent_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground text-sm">{record.cliente_nome}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{record.cliente_email}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground truncate max-w-[250px]">
                        {record.email_subject || '—'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-destructive">
                      {record.valor_debito ? formatEUR(record.valor_debito) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {record.dias_atraso != null ? (
                        <Badge variant="outline" className={
                          record.dias_atraso > 90 ? 'bg-red-100 text-red-800 border-red-300' :
                          record.dias_atraso > 30 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }>
                          {record.dias_atraso}d
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Registada
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Ver detalhes"
                          onClick={e => { e.stopPropagation(); setDetailRecord(record); setDetailOpen(true); }}
                        >
                          <Eye className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Eliminar"
                          onClick={e => { e.stopPropagation(); setDeleteRecord(record); setDeleteOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mostrar:</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>por página</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Detalhes da Cobrança
            </DialogTitle>
          </DialogHeader>
          {detailRecord && (
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground text-base">{detailRecord.cliente_nome}</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Registada</Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Data/Hora:</span>
                  <p className="font-medium">{formatDate(detailRecord.sent_at)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Meio de Contacto:</span>
                  <p className="font-medium">{getTipoLabel(detailRecord.email_type)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">E-mail:</span>
                  <p className="font-medium">{detailRecord.cliente_email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Débito:</span>
                  <p className="font-bold text-destructive">{detailRecord.valor_debito ? formatEUR(detailRecord.valor_debito) : '—'}</p>
                </div>
              </div>

              <Separator />

              <div>
                <span className="text-muted-foreground">Dias em Atraso:</span>
                <span className="ml-2 font-medium">{detailRecord.dias_atraso != null ? `${detailRecord.dias_atraso} dias` : '—'}</span>
              </div>

              <div>
                <span className="text-muted-foreground">Assunto:</span>
                <p className="font-medium mt-1">{detailRecord.email_subject || '—'}</p>
              </div>

              {detailRecord.notas && (
                <div>
                  <span className="text-muted-foreground">Anotações / Apontamentos:</span>
                  <p className="font-medium mt-1 whitespace-pre-wrap bg-muted/50 rounded-md p-3 text-sm">
                    {detailRecord.notas}
                  </p>
                </div>
              )}

              <div>
                <span className="text-muted-foreground">ID Serviço:</span>
                <p className="font-mono text-xs mt-1">{detailRecord.service_id}</p>
              </div>

              <Separator />

              <DialogFooter>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setDetailOpen(false); setDeleteRecord(detailRecord); setDeleteOpen(true); }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Registo de Cobrança</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar este registo de cobrança de <strong>{deleteRecord?.cliente_nome}</strong>? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HistoricoCobrancas;
