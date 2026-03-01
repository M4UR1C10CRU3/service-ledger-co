import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle, Plus, Pencil, Trash2, Minus } from 'lucide-react';
import type { Produto, ProdutoInput } from '@/hooks/useProdutos';

interface SyncResult {
  toAdd: ProdutoInput[];
  toUpdate: { id: string; input: ProdutoInput }[];
  toDelete: Produto[];
  unchanged: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProdutos: Produto[];
  onConfirm: (result: SyncResult) => Promise<void>;
}

export function ExcelUploadDialog({ open, onOpenChange, existingProdutos, onConfirm }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setFileName('');
    setSyncResult(null);
    setProcessing(false);
    setApplying(false);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      const allItems: ProdutoInput[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        for (const row of rows) {
          // Find the columns - handle different possible header names
          const refInterna = String(row['REF. INTERNA'] ?? row['REF.INTERNA'] ?? row['Ref. Interna'] ?? '').trim();
          const refFornecedor = String(row['REF. FORN'] ?? row['REF.FORN'] ?? row['Ref. Forn'] ?? '').trim();
          // Handle the trailing space in 'DESCRIÇÃO '
          const descricao = String(
            row['DESCRIÇÃO'] ?? row['DESCRIÇÃO '] ?? row['Descrição'] ?? row['DESCRICAO'] ?? ''
          ).trim();

          // Skip empty rows
          if (!refInterna || refInterna === 'undefined' || refInterna === 'null') continue;
          if (!descricao) continue;

          allItems.push({
            refInterna,
            refFornecedor: refFornecedor || null,
            descricao,
            categoria: sheetName.trim(),
            origem: 'excel',
          });
        }
      }

      // Compare with existing
      const existingMap = new Map(existingProdutos.map(p => [p.refInterna, p]));
      const excelRefs = new Set(allItems.map(i => i.refInterna));

      const toAdd: ProdutoInput[] = [];
      const toUpdate: { id: string; input: ProdutoInput }[] = [];
      let unchanged = 0;

      for (const item of allItems) {
        const existing = existingMap.get(item.refInterna);
        if (!existing) {
          toAdd.push(item);
        } else {
          const descChanged = existing.descricao !== item.descricao;
          const refChanged = (existing.refFornecedor || '') !== (item.refFornecedor || '');
          const catChanged = existing.categoria !== item.categoria;
          if (descChanged || refChanged || catChanged) {
            toUpdate.push({ id: existing.id, input: item });
          } else {
            unchanged++;
          }
        }
      }

      const toDelete = existingProdutos.filter(p => !excelRefs.has(p.refInterna) && p.origem === 'excel');

      setSyncResult({ toAdd, toUpdate, toDelete, unchanged });
    } catch (err) {
      console.error('Error processing Excel:', err);
      setError('Erro ao processar o ficheiro Excel. Verifique se o formato está correto.');
    }
    setProcessing(false);
  };

  const handleConfirm = async () => {
    if (!syncResult) return;
    setApplying(true);
    await onConfirm(syncResult);
    setApplying(false);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" /> Upload Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {fileName ? fileName : 'Selecione o ficheiro .xlsx com o cadastro de artigos'}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={processing}>
              {processing ? 'Processando...' : 'Selecionar Ficheiro'}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Sync report */}
          {syncResult && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <h4 className="font-semibold text-sm">Relatório de Sincronização</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  <span>Novos produtos:</span>
                  <Badge variant="secondary">{syncResult.toAdd.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-accent-foreground" />
                  <span>A atualizar:</span>
                  <Badge variant="secondary">{syncResult.toUpdate.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-destructive" />
                  <span>A eliminar:</span>
                  <Badge variant={syncResult.toDelete.length > 0 ? 'destructive' : 'secondary'}>
                    {syncResult.toDelete.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-muted-foreground" />
                  <span>Sem alterações:</span>
                  <Badge variant="secondary">{syncResult.unchanged}</Badge>
                </div>
              </div>
              {syncResult.toDelete.length > 0 && (
                <p className="text-xs text-destructive">
                  ⚠️ {syncResult.toDelete.length} produto(s) serão eliminados pois já não constam no ficheiro Excel.
                  Apenas produtos com origem "Excel" serão afetados.
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-3 h-3" />
                O campo "Unidade" nunca será sobrescrito pelo upload.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!syncResult || applying}>
            {applying ? 'Aplicando...' : 'Confirmar e Aplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
