import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubempreiteiros } from '@/hooks/useSubempreiteiros';
import { useToast } from '@/hooks/use-toast';
import type { Subempreiteiro, SubDocumento } from '@/types/subempreiteiro';
import { getDocLabels } from '@/types/subempreiteiro';
import {
  Pencil, User, Building2, Upload, Trash2,
  FileText, Download, AlertTriangle, CheckCircle2,
} from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subempreiteiro: Subempreiteiro | null;
  onEdit: (s: Subempreiteiro) => void;
}

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-PT');
};

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '—'}</span>
    </div>
  );
}

function ValidityBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const today = new Date().toISOString().split('T')[0];
  const in60 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
  if (date < today) return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" /> Expirado
    </Badge>
  );
  if (date <= in60) return (
    <Badge className="bg-amber-500 text-white gap-1">
      <AlertTriangle className="h-3 w-3" /> Expira em breve
    </Badge>
  );
  return (
    <Badge className="bg-emerald-600 text-white gap-1">
      <CheckCircle2 className="h-3 w-3" /> Válido
    </Badge>
  );
}

export function SubempreiteiroDetailDialog({ open, onOpenChange, subempreiteiro, onEdit }: Props) {
  const { fetchDocs, uploadDoc, deleteDoc, getDocUrl } = useSubempreiteiros();
  const { toast } = useToast();
  const [docs, setDocs] = useState<SubDocumento[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDocTipo, setNewDocTipo] = useState('outro');
  const [newDocValidade, setNewDocValidade] = useState('');
  const [newDocNotas, setNewDocNotas] = useState('');

  useEffect(() => {
    if (open && subempreiteiro) {
      setLoadingDocs(true);
      fetchDocs(subempreiteiro.id).then(d => {
        setDocs(d);
        setLoadingDocs(false);
      });
    }
  }, [open, subempreiteiro]);

  if (!subempreiteiro) return null;

  const isIndividual = subempreiteiro.tipo === 'individual';
  const docLabels = getDocLabels(subempreiteiro.tipo);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ok = await uploadDoc(subempreiteiro.id, file, newDocTipo, newDocValidade || undefined, newDocNotas || undefined);
    if (ok) {
      toast({ title: 'Documento carregado com sucesso' });
      const updated = await fetchDocs(subempreiteiro.id);
      setDocs(updated);
      setNewDocTipo('outro');
      setNewDocValidade('');
      setNewDocNotas('');
    } else {
      toast({ title: 'Erro ao carregar documento', variant: 'destructive' });
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDownload = async (doc: SubDocumento) => {
    const url = await getDocUrl(doc.storagePath);
    if (url) window.open(url, '_blank');
    else toast({ title: 'Erro ao obter link do documento', variant: 'destructive' });
  };

  const handleDelete = async (doc: SubDocumento) => {
    const ok = await deleteDoc(doc);
    if (ok) {
      toast({ title: 'Documento eliminado' });
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } else {
      toast({ title: 'Erro ao eliminar', variant: 'destructive' });
    }
  };

  const fmtSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {isIndividual
                  ? <User className="h-6 w-6" />
                  : <Building2 className="h-6 w-6" />}
              </div>
              <div>
                <DialogTitle className="text-xl">{subempreiteiro.nome}</DialogTitle>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline">
                    {isIndividual ? 'Pessoa Individual' : 'Pessoa Coletiva'}
                  </Badge>
                  {subempreiteiro.especialidade && (
                    <Badge variant="secondary">{subempreiteiro.especialidade}</Badge>
                  )}
                  <Badge variant={subempreiteiro.ativo ? 'default' : 'outline'}>
                    {subempreiteiro.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(subempreiteiro)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="ficha" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="ficha">Ficha</TabsTrigger>
            <TabsTrigger value="profissional">Profissional</TabsTrigger>
            <TabsTrigger value="documentos">
              Documentos {docs.length > 0 && `(${docs.length})`}
            </TabsTrigger>
          </TabsList>

          {/* TAB: Ficha */}
          <TabsContent value="ficha" className="space-y-2 pt-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {isIndividual ? (
                <>
                  <Row label="NIF" value={subempreiteiro.nif} />
                  <Row label="Data de Nascimento" value={fmtDate(subempreiteiro.dataNascimento)} />
                  <Row label="Nº Cartão de Cidadão" value={subempreiteiro.ccNumero} />
                  <Row label="Validade CC" value={fmtDate(subempreiteiro.ccValidade)} />
                </>
              ) : (
                <>
                  <Row label="NIPC" value={subempreiteiro.nipc} />
                  <Row label="Certidão Permanente" value={subempreiteiro.certidaoPermanenteCodigo} />
                  <Row label="Representante Legal" value={subempreiteiro.representanteNome} />
                  <Row label="NIF Representante" value={subempreiteiro.representanteNif} />
                </>
              )}
              <Row label="Email" value={subempreiteiro.email} />
              <Row label="Telefone" value={subempreiteiro.telefone} />
              <Row label="Telemóvel" value={subempreiteiro.telemovel} />
              <Row label="Morada" value={subempreiteiro.morada} />
              <Row label="Código Postal" value={subempreiteiro.codigoPostal} />
              <Row label="Localidade" value={subempreiteiro.localidade} />
              <Row label="IBAN" value={subempreiteiro.iban} />
              <Row label="SWIFT / BIC" value={subempreiteiro.swift} />
            </div>
            {subempreiteiro.notas && (
              <div className="pt-3 border-t mt-3">
                <p className="text-xs text-muted-foreground mb-1">Notas</p>
                <p className="text-sm whitespace-pre-wrap">{subempreiteiro.notas}</p>
              </div>
            )}
          </TabsContent>

          {/* TAB: Profissional */}
          <TabsContent value="profissional" className="space-y-4 pt-4">
            <Row label="Especialidade" value={subempreiteiro.especialidade} />

            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-semibold">Alvará / Licença</p>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm">{subempreiteiro.alvaraNumero || '—'}</p>
                {subempreiteiro.alvaraValidade && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Validade: {fmtDate(subempreiteiro.alvaraValidade)}
                    </span>
                    <ValidityBadge date={subempreiteiro.alvaraValidade} />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-semibold">Seguro</p>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm">{subempreiteiro.seguroNumero || '—'}</p>
                {subempreiteiro.seguroValidade && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Validade: {fmtDate(subempreiteiro.seguroValidade)}
                    </span>
                    <ValidityBadge date={subempreiteiro.seguroValidade} />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB: Documentos */}
          <TabsContent value="documentos" className="space-y-4 pt-4">
            {/* Upload section */}
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold">Adicionar Documento</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de Documento</Label>
                  <Select value={newDocTipo} onValueChange={setNewDocTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(docLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Validade (opcional)</Label>
                  <Input type="date" value={newDocValidade} onChange={e => setNewDocValidade(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notas (opcional)</Label>
                <Textarea
                  value={newDocNotas}
                  onChange={e => setNewDocNotas(e.target.value)}
                  rows={2}
                  placeholder="Observações sobre o documento..."
                />
              </div>
              <label className="block">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                />
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? 'A carregar...' : 'Clique para selecionar ficheiro (PDF, imagem, Word — máx. 50MB)'}
                  </p>
                </div>
              </label>
            </div>

            {/* Documents list */}
            {loadingDocs ? (
              <p className="text-sm text-muted-foreground text-center py-6">A carregar documentos...</p>
            ) : docs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum documento carregado</p>
            ) : (
              <div className="space-y-2">
                {docs.map(doc => {
                  const label = docLabels[doc.tipoDocumento] ?? doc.tipoDocumento;
                  return (
                    <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.nomeFicheiro}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                            <span>{label}</span>
                            {doc.tamanhoBytes && (
                              <span>· {fmtSize(doc.tamanhoBytes)}</span>
                            )}
                            {doc.validade && (
                              <>
                                <span>· val. {fmtDate(doc.validade)}</span>
                                <ValidityBadge date={doc.validade} />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Abrir / Descarregar">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} title="Eliminar">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default SubempreiteiroDetailDialog;
