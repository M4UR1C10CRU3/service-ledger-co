import { useState, useEffect, useCallback, useRef } from 'react';
import { useServiceMaterials, MaterialLine, SavedMaterial } from '@/hooks/useServiceMaterials';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Plus, Trash2, Upload, Download, Search, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string; // services.id (UUID)
  serviceIdCode: string; // services.service_id (business code)
  serviceLabel: string; // for display
  onMaterialsSaved?: () => void;
}

interface UploadLine {
  refInterna: string;
  quantidade: number;
  descricao?: string;
  unidade?: string | null;
  stockDisponivel?: number;
  status: 'found' | 'not_found' | 'error';
  errorMsg?: string;
}

export function MateriaisUtilizadosDialog({ open, onOpenChange, vendaId, serviceIdCode, serviceLabel, onMaterialsSaved }: Props) {
  const { loadMaterials, searchProdutos, getStockDisponivel, saveMaterials, isLoading } = useServiceMaterials();

  const [savedMaterials, setSavedMaterials] = useState<SavedMaterial[]>([]);
  const [lines, setLines] = useState<MaterialLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ refInterna: string; descricao: string; unidade: string | null }>>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [tab, setTab] = useState('manual');
  const [uploadLines, setUploadLines] = useState<UploadLine[]>([]);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Load existing materials
  useEffect(() => {
    if (open && vendaId) {
      loadMaterials(vendaId).then(setSavedMaterials);
    }
  }, [open, vendaId, loadMaterials]);

  // Debounced search
  const handleSearch = useCallback((query: string, lineIdx: number) => {
    setSearchQuery(query);
    setActiveLineIndex(lineIdx);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 2) { setSearchResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchProdutos(query);
      setSearchResults(results);
    }, 300);
  }, [searchProdutos]);

  const selectProduct = async (lineIdx: number, product: { refInterna: string; descricao: string; unidade: string | null }) => {
    const stock = await getStockDisponivel(product.refInterna);
    setLines(prev => {
      const updated = [...prev];
      updated[lineIdx] = {
        ...updated[lineIdx],
        produtoRef: product.refInterna,
        produtoDesc: product.descricao,
        unidade: product.unidade,
        stockDisponivel: stock,
      };
      return updated;
    });
    setSearchResults([]);
    setActiveLineIndex(null);
    setSearchQuery('');
  };

  const addLine = () => {
    setLines(prev => [...prev, { produtoRef: '', produtoDesc: '', quantidade: 1, unidade: null, stockDisponivel: 0 }]);
  };

  const removeLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLineQty = (idx: number, qty: number) => {
    setLines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantidade: qty };
      return updated;
    });
  };

  // Save manual lines
  const handleSaveManual = async () => {
    const validLines = lines.filter(l => l.produtoRef && l.quantidade > 0);
    if (validLines.length === 0) {
      toast({ title: 'Nenhum artigo válido', description: 'Adicione pelo menos um artigo com referência e quantidade.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const ok = await saveMaterials(vendaId, serviceIdCode, validLines);
    setSaving(false);
    if (ok) {
      toast({ title: 'Materiais registados', description: `${validLines.length} saída(s) de stock registadas com sucesso.` });
      setLines([]);
      loadMaterials(vendaId).then(setSavedMaterials);
      onMaterialsSaved?.();
    } else {
      toast({ title: 'Erro', description: 'Ocorreu um erro ao registar os materiais.', variant: 'destructive' });
    }
  };

  // File upload processing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadProcessing(true);
    setUploadLines([]);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let pairs: Array<{ ref: string; qty: number }> = [];

      if (ext === 'csv' || ext === 'txt') {
        const text = await file.text();
        pairs = parseCSVText(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
        pairs = parseExcelRows(rows);
      } else if (ext === 'pdf') {
        pairs = await parsePDF(file);
        if (pairs.length === 0) {
          console.warn('[Upload] PDF parsed but 0 pairs found. Check console for [PDF Parser] logs.');
        }
      } else {
        toast({ title: 'Formato não suportado', description: 'Use PDF, Excel (.xlsx), CSV ou TXT.', variant: 'destructive' });
        setUploadProcessing(false);
        return;
      }

      if (pairs.length === 0) {
        toast({ 
          title: 'Nenhum artigo encontrado', 
          description: `Não foi possível extrair referências do ficheiro "${file.name}". Verifique a consola (F12) para diagnóstico detalhado, ou use o formato CSV.`, 
          variant: 'destructive' 
        });
        setUploadProcessing(false);
        return;
      }

      // Resolve each pair against the product catalog
      const resolved: UploadLine[] = [];
      for (const p of pairs) {
        if (!p.ref || isNaN(p.qty) || p.qty <= 0) {
          resolved.push({ refInterna: p.ref || '?', quantidade: p.qty || 0, status: 'error', errorMsg: 'Linha não interpretável' });
          continue;
        }
        const results = await searchProdutos(p.ref);
        const exact = results.find(r => r.refInterna === p.ref);
        if (exact) {
          const stock = await getStockDisponivel(exact.refInterna);
          resolved.push({
            refInterna: exact.refInterna,
            quantidade: p.qty,
            descricao: exact.descricao,
            unidade: exact.unidade,
            stockDisponivel: stock,
            status: 'found',
          });
        } else {
          resolved.push({ refInterna: p.ref, quantidade: p.qty, status: 'not_found', errorMsg: 'Referência não encontrada — verifique o código' });
        }
      }
      setUploadLines(resolved);
    } catch (err) {
      console.error('File parse error:', err);
      toast({ title: 'Erro ao processar ficheiro', description: 'Tente outro formato ou use o modelo CSV.', variant: 'destructive' });
    } finally {
      setUploadProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveUpload = async () => {
    const validLines = uploadLines
      .filter(l => l.status === 'found')
      .map(l => ({
        produtoRef: l.refInterna,
        produtoDesc: l.descricao || '',
        quantidade: l.quantidade,
        unidade: l.unidade || null,
        stockDisponivel: l.stockDisponivel || 0,
      }));

    if (validLines.length === 0) {
      toast({ title: 'Nenhum artigo válido', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const ok = await saveMaterials(vendaId, serviceIdCode, validLines);
    setSaving(false);
    if (ok) {
      toast({ title: 'Materiais registados', description: `${validLines.length} saída(s) registadas.` });
      setUploadLines([]);
      loadMaterials(vendaId).then(setSavedMaterials);
      onMaterialsSaved?.();
    } else {
      toast({ title: 'Erro', variant: 'destructive' });
    }
  };

  const removeUploadLine = (idx: number) => {
    setUploadLines(prev => prev.filter((_, i) => i !== idx));
  };

  const downloadCSVModel = () => {
    const csv = 'ref_interna,quantidade\n100001,5\n200093,2\n300007,10\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_materiais.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const foundCount = uploadLines.filter(l => l.status === 'found').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Materiais Utilizados
          </DialogTitle>
          <DialogDescription>
            {serviceLabel} — Registe os materiais consumidos nesta venda/serviço
          </DialogDescription>
        </DialogHeader>

        {/* Already saved materials */}
        {savedMaterials.length > 0 && (
          <div className="border rounded-lg p-3 bg-muted/30">
            <h4 className="text-sm font-medium mb-2">Materiais já registados ({savedMaterials.length})</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {savedMaterials.map(m => (
                <div key={m.id} className="flex justify-between text-sm py-1 px-2 bg-background rounded">
                  <span className="font-mono">{m.produtoRef}</span>
                  <span className="text-muted-foreground truncate mx-2 flex-1">{m.produtoDesc}</span>
                  <span className="font-medium">{m.quantidade} un</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Introdução Manual</TabsTrigger>
            <TabsTrigger value="upload">Upload de Ficheiro</TabsTrigger>
          </TabsList>

          {/* TAB A - Manual */}
          <TabsContent value="manual" className="space-y-3">
            <ScrollArea className="max-h-[40vh]">
              {lines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Clique em "+ Adicionar Artigo" para começar
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referência / Artigo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[80px]">Qtd</TableHead>
                      <TableHead className="w-[60px]">Un.</TableHead>
                      <TableHead className="w-[80px]">Stock</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="relative">
                          {line.produtoRef ? (
                            <span className="font-mono text-sm">{line.produtoRef}</span>
                          ) : (
                            <div className="relative">
                              <Input
                                placeholder="Pesquisar ref. ou descrição..."
                                className="h-8 text-sm"
                                value={activeLineIndex === idx ? searchQuery : ''}
                                onChange={(e) => handleSearch(e.target.value, idx)}
                                onFocus={() => setActiveLineIndex(idx)}
                              />
                              {activeLineIndex === idx && searchResults.length > 0 && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                                  {searchResults.map((r, i) => (
                                    <button
                                      key={i}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between"
                                      onClick={() => selectProduct(idx, r)}
                                    >
                                      <span className="font-mono">{r.refInterna}</span>
                                      <span className="text-muted-foreground truncate ml-2">{r.descricao}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {line.produtoDesc || '—'}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="h-8 w-20 text-sm"
                            value={line.quantidade}
                            onChange={(e) => updateLineQty(idx, Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="text-sm">{line.unidade || '—'}</TableCell>
                        <TableCell>
                          <span className={`text-sm font-mono ${line.stockDisponivel < 0 ? 'text-orange-500' : line.quantidade > line.stockDisponivel ? 'text-yellow-600' : ''}`}>
                            {line.stockDisponivel}
                          </span>
                          {line.produtoRef && line.quantidade > line.stockDisponivel && (
                            <div className="text-[10px] text-yellow-600 leading-tight">
                              {line.stockDisponivel < 0 ? 'Negativo' : 'Insuficiente'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeLine(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Artigo
              </Button>
              {lines.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {lines.filter(l => l.produtoRef).length} artigo(s) preenchido(s)
                </span>
              )}
            </div>

            {lines.filter(l => l.produtoRef && l.quantidade > 0).length > 0 && (
              <DialogFooter>
                <Button onClick={handleSaveManual} disabled={saving || isLoading}>
                  {saving ? 'A guardar...' : 'Confirmar e Aplicar Saídas'}
                </Button>
              </DialogFooter>
            )}
          </TabsContent>

          {/* TAB B - Upload */}
          <TabsContent value="upload" className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadProcessing}>
                <Upload className="h-4 w-4 mr-1" />
                {uploadProcessing ? 'A processar...' : 'Selecionar Ficheiro'}
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadCSVModel}>
                <Download className="h-4 w-4 mr-1" />
                Descarregar Modelo CSV
              </Button>
              <span className="text-xs text-muted-foreground">PDF, Excel, CSV ou TXT</span>
            </div>

            {uploadLines.length > 0 && (
              <>
                <ScrollArea className="max-h-[35vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]"></TableHead>
                        <TableHead>Referência</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[80px]">Qtd</TableHead>
                        <TableHead className="w-[80px]">Stock</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadLines.map((line, idx) => (
                        <TableRow key={idx} className={
                          line.status === 'not_found' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
                          line.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' : ''
                        }>
                          <TableCell>
                            {line.status === 'found' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            {line.status === 'not_found' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                            {line.status === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{line.refInterna}</TableCell>
                          <TableCell className="text-sm">
                            {line.status === 'found' ? line.descricao : (
                              <span className="text-muted-foreground italic">{line.errorMsg}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {line.status === 'found' ? (
                              <Input
                                type="number"
                                min={1}
                                className="h-8 w-20 text-sm"
                                value={line.quantidade}
                                onChange={(e) => {
                                  setUploadLines(prev => {
                                    const u = [...prev];
                                    u[idx] = { ...u[idx], quantidade: Number(e.target.value) };
                                    return u;
                                  });
                                }}
                              />
                            ) : (
                              <span className="text-sm">{line.quantidade}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {line.status === 'found' ? (
                              <span className={line.quantidade > (line.stockDisponivel || 0) ? 'text-yellow-600' : ''}>
                                {line.stockDisponivel}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeUploadLine(idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex gap-3">
                    <span className="text-green-600">✅ {foundCount} reconhecido(s)</span>
                    <span className="text-yellow-600">⚠️ {uploadLines.filter(l => l.status === 'not_found').length} não encontrado(s)</span>
                    <span className="text-red-600">❌ {uploadLines.filter(l => l.status === 'error').length} erro(s)</span>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={handleSaveUpload} disabled={saving || foundCount === 0}>
                    {saving ? 'A guardar...' : `Confirmar e Aplicar Saídas (${foundCount})`}
                  </Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// --- Parsing helpers ---

function parseCSVText(text: string): Array<{ ref: string; qty: number }> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const pairs: Array<{ ref: string; qty: number }> = [];
  for (const line of lines) {
    // Skip header
    if (/ref/i.test(line) && /quant/i.test(line)) continue;
    const parts = line.split(/[,;\t|]+/).map(s => s.trim());
    if (parts.length >= 2) {
      const ref = parts[0];
      const qty = parseFloat(parts[1]);
      if (ref && !isNaN(qty)) pairs.push({ ref, qty });
    }
  }
  return pairs;
}

function parseExcelRows(rows: any[][]): Array<{ ref: string; qty: number }> {
  if (rows.length === 0) return [];
  const pairs: Array<{ ref: string; qty: number }> = [];
  // Find ref and qty columns
  let refCol = 0, qtyCol = 1;
  const header = rows[0]?.map((c: any) => String(c || '').toLowerCase()) || [];
  const refIdx = header.findIndex((h: string) => /ref/i.test(h));
  const qtyIdx = header.findIndex((h: string) => /quant/i.test(h));
  if (refIdx >= 0) refCol = refIdx;
  if (qtyIdx >= 0) qtyCol = qtyIdx;
  const startRow = refIdx >= 0 ? 1 : 0;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[refCol]) continue;
    const ref = String(row[refCol]).trim();
    const qty = parseFloat(String(row[qtyCol] || '0'));
    if (ref && !isNaN(qty) && qty > 0) pairs.push({ ref, qty });
  }
  return pairs;
}

async function parsePDF(file: File): Promise<Array<{ ref: string; qty: number }>> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    
    // Use unpkg which reliably hosts pdfjs-dist worker files
    const version = pdfjsLib.version;
    console.log('[PDF Parser] pdfjs version:', version);
    
    // Try multiple CDN sources for the worker
    const workerUrls = [
      `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`,
      `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`,
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`,
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`,
    ];
    
    // Test which worker URL is available
    let workerLoaded = false;
    for (const url of workerUrls) {
      try {
        const resp = await fetch(url, { method: 'HEAD' });
        if (resp.ok) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = url;
          console.log('[PDF Parser] Worker loaded from:', url);
          workerLoaded = true;
          break;
        }
      } catch {
        // try next
      }
    }
    
    if (!workerLoaded) {
      // Disable worker as fallback - slower but works
      console.warn('[PDF Parser] No worker available, using main thread');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
    
    const buffer = await file.arrayBuffer();
    console.log('[PDF Parser] File size:', buffer.byteLength, 'bytes');
    
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    console.log('[PDF Parser] PDF loaded, pages:', pdf.numPages);
    
    const pairs: Array<{ ref: string; qty: number }> = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = content.items as any[];
      
      console.log('[PDF Parser] Page', i, 'total text items:', items.length);
      
      if (items.length === 0) {
        console.warn('[PDF Parser] No text items on page', i);
        continue;
      }
      
      // Log raw items for debugging
      const rawTexts = items.map((item: any) => item.str).filter(Boolean);
      console.log('[PDF Parser] Raw text items:', JSON.stringify(rawTexts));
      
      // Group items by Y coordinate to reconstruct lines
      const yTolerance = 3;
      const lineMap = new Map<number, Array<{ x: number; text: string }>>();
      
      for (const item of items) {
        const str = (item.str || '').trim();
        if (!str) continue;
        const y = Math.round(item.transform[5] / yTolerance) * yTolerance;
        const x = item.transform[4];
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push({ x, text: str });
      }
      
      // Sort lines by Y descending (top to bottom in PDF), items by X ascending
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
      const reconstructedLines: string[] = [];
      for (const y of sortedYs) {
        const lineItems = lineMap.get(y)!.sort((a, b) => a.x - b.x);
        const lineText = lineItems.map(li => li.text).join(' ');
        reconstructedLines.push(lineText);
      }
      
      console.log('[PDF Parser] Reconstructed lines:');
      reconstructedLines.forEach((l, idx) => console.log(`  [${idx}] "${l}"`));
      
      // Helper: parse a European-format number string to float
      const parseEuroQty = (str: string): number | null => {
        // "1.000,50" → 1000.50 | "1,500" → 1.5 or 1500 | "1,00" → 1 | "10" → 10
        const s = str.trim();
        // Format: 1.234,56 (dot=thousands, comma=decimal)
        const full = s.match(/^(\d{1,3}(?:\.\d{3})*)(?:,(\d{1,3}))?$/);
        if (full) {
          const intPart = full[1].replace(/\./g, '');
          const decPart = full[2] || '0';
          return parseFloat(`${intPart}.${decPart}`);
        }
        // Format: N,NN or N,NNN (comma=decimal, no thousands dot)
        const commaDec = s.match(/^(\d{1,5}),(\d{1,3})$/);
        if (commaDec) {
          return parseFloat(`${commaDec[1]}.${commaDec[2]}`);
        }
        // Plain integer
        const plain = s.match(/^(\d{1,6})$/);
        if (plain) return parseInt(plain[1]);
        return null;
      };

      // Strategy 1: Parse each line for REF + QTY pattern
      for (const line of reconstructedLines) {
        // Find a 4-7 digit ref anywhere in the line
        const refMatches = [...line.matchAll(/\b(\d{4,7})\b/g)];
        for (const refMatch of refMatches) {
          const ref = refMatch[1];
          if (/^20[2-3]\d$/.test(ref)) continue;
          if (pairs.find(p => p.ref === ref)) continue;
          
          const restOfLine = line.substring((refMatch.index || 0) + refMatch[0].length);
          
          // Try European qty formats: "1.000,500" "1,000" "1,50" "10 un" etc.
          const euroMatch = restOfLine.match(/\b(\d{1,3}(?:\.\d{3})*(?:,\d{1,3})?)\b/);
          if (euroMatch) {
            const qty = parseEuroQty(euroMatch[1]);
            if (qty && qty > 0) {
              pairs.push({ ref, qty });
              console.log(`[PDF Parser] ✓ ref=${ref}, qty=${qty}`);
              continue;
            }
          }
          
          // Fallback: plain integer + optional unit
          const plainQty = restOfLine.match(/\b(\d{1,4})\s*(?:und|un|pç|kg|m2|m|lt|cx|uni|unid|pcs|pc)?\b/i);
          if (plainQty) {
            const qty = parseInt(plainQty[1]);
            if (qty > 0) {
              pairs.push({ ref, qty });
              console.log(`[PDF Parser] ✓ ref=${ref}, qty=${qty} (plain)`);
            }
          }
        }
      }
      
      // Strategy 2: If no pairs found, try full-text scan approach
      if (pairs.length === 0) {
        console.log('[PDF Parser] Strategy 1 failed, trying full-text scan...');
        const fullText = reconstructedLines.join(' ');
        
        const allRefs = fullText.matchAll(/\b(\d{4,7})\b/g);
        for (const rm of allRefs) {
          const ref = rm[1];
          if (/^20[2-3]\d$/.test(ref)) continue;
          if (pairs.find(p => p.ref === ref)) continue;
          
          const afterIdx = (rm.index || 0) + rm[0].length;
          const after = fullText.substring(afterIdx, afterIdx + 200);
          
          const nextRefIdx = after.search(/\b\d{4,7}\b/);
          const segment = nextRefIdx > 0 ? after.substring(0, nextRefIdx) : after;
          
          // Try all number formats in the segment
          const numMatch = segment.match(/\b(\d{1,3}(?:\.\d{3})*(?:,\d{1,3})?)\b/) || segment.match(/\b(\d{1,5})\b/);
          if (numMatch) {
            const qty = parseEuroQty(numMatch[1]);
            if (qty && qty > 0) {
              pairs.push({ ref, qty });
              console.log(`[PDF Parser] ✓ (scan) ref=${ref}, qty=${qty}`);
            }
          }
        }
      }
    }
    
    console.log('[PDF Parser] Final result:', JSON.stringify(pairs));
    return pairs;
  } catch (err) {
    console.error('[PDF Parser] CRITICAL ERROR:', err);
    // Show the actual error to help debug
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[PDF Parser] Error details:', errMsg);
    return [];
  }
}
