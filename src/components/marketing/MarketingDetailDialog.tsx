import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMarketing } from '@/hooks/useMarketing';
import {
  STATUS_CONFIG,
  PRIORIDADE_CONFIG,
  TIPO_CONTEUDO_CONFIG,
  CANAL_CONFIG,
  parseTipos,
  parseCanais,
  type MarketingTarefa,
  type MarketingAnexo,
  type MarketingComentario,
} from '@/types/marketing';
import { Upload, Link as LinkIcon, Trash2, Download, ExternalLink, FileText, X as XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { MarketingWorkflowPanel } from './MarketingWorkflowPanel';

interface Props {
  tarefa: MarketingTarefa | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function MarketingDetailDialog({ tarefa, open, onOpenChange }: Props) {
  const { fetchAnexos, uploadAnexo, addLinkAnexo, deleteAnexo, getAnexoSignedUrl, fetchComentarios, addComentario } = useMarketing();
  const { toast } = useToast();
  const [anexos, setAnexos] = useState<MarketingAnexo[]>([]);
  const [comentarios, setComentarios] = useState<MarketingComentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [linkNome, setLinkNome] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ url: string; nome: string; mime?: string | null } | null>(null);

  const isImage = (a: MarketingAnexo) =>
    a.tipo === 'upload' && (
      (a.mimeType?.startsWith('image/')) ||
      /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(a.nome)
    );

  const reload = async (tarefaId: string) => {
    const [a, c] = await Promise.all([fetchAnexos(tarefaId), fetchComentarios(tarefaId)]);
    // Garante que ainda estamos na mesma tarefa antes de aplicar resultados
    if (!tarefa || tarefa.id !== tarefaId) return;
    setAnexos(a);
    setComentarios(c);
    // Pré-carregar URLs assinadas para imagens (thumbnails) — chave por anexo.id (único por tarefa)
    const imgs = a.filter(isImage);
    const entries = await Promise.all(
      imgs.map(async x => [x.id, (await getAnexoSignedUrl(x.url)) || ''] as const)
    );
    if (!tarefa || tarefa.id !== tarefaId) return;
    setSignedUrls(Object.fromEntries(entries.filter(([, u]) => u)));
  };

  // Limpa estado ao trocar de tarefa ou fechar — evita exibir anexos/thumbnails da tarefa anterior
  useEffect(() => {
    setAnexos([]);
    setComentarios([]);
    setSignedUrls({});
    setPreview(null);
    setNovoComentario('');
    setLinkNome('');
    setLinkUrl('');
    if (open && tarefa) reload(tarefa.id);
  }, [open, tarefa?.id]);

  if (!tarefa) return null;

  const cfg = STATUS_CONFIG[tarefa.status];
  const prio = PRIORIDADE_CONFIG[tarefa.prioridade];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'Ficheiro demasiado grande', description: 'Máximo 50MB. Use um link externo para ficheiros maiores.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const ok = await uploadAnexo(tarefa.id, file);
    setUploading(false);
    if (ok) {
      toast({ title: 'Ficheiro enviado' });
      await reload(tarefa.id);
    } else {
      toast({ title: 'Erro no upload', variant: 'destructive' });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;
    const ok = await addLinkAnexo(tarefa.id, linkNome.trim() || linkUrl, linkUrl.trim());
    if (ok) {
      toast({ title: 'Link adicionado' });
      setLinkNome('');
      setLinkUrl('');
      await reload(tarefa.id);
    }
  };

  const handleOpenAnexo = async (anexo: MarketingAnexo) => {
    if (anexo.tipo === 'link') {
      window.open(anexo.url, '_blank');
      return;
    }
    const url = signedUrls[anexo.id] || (await getAnexoSignedUrl(anexo.url));
    if (!url) {
      toast({ title: 'Erro a abrir ficheiro', variant: 'destructive' });
      return;
    }
    // Imagens e PDFs abrem no preview interno; outros abrem em nova aba
    if (isImage(anexo) || anexo.mimeType === 'application/pdf' || /\.pdf$/i.test(anexo.nome)) {
      setPreview({ url, nome: anexo.nome, mime: anexo.mimeType });
    } else {
      window.open(url, '_blank');
    }
  };

  const handleDeleteAnexo = async (anexo: MarketingAnexo) => {
    if (!confirm(`Remover "${anexo.nome}"?`)) return;
    const ok = await deleteAnexo(anexo);
    if (ok) await reload(tarefa.id);
  };

  const handleAddComentario = async () => {
    if (!novoComentario.trim()) return;
    const ok = await addComentario(tarefa.id, novoComentario.trim());
    if (ok) {
      setNovoComentario('');
      await reload(tarefa.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {tarefa.titulo}
            <Badge style={{ backgroundColor: cfg.color, color: 'white' }}>{cfg.label}</Badge>
            <Badge className={prio.badgeClass}>{prio.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="detalhes">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="entregas">Entregas ({anexos.length})</TabsTrigger>
            <TabsTrigger value="comentarios">Histórico ({comentarios.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="mt-4">
            <MarketingWorkflowPanel tarefa={tarefa} />
          </TabsContent>

          <TabsContent value="detalhes" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(() => {
                const tipos = parseTipos(tarefa.tipoConteudo as any);
                if (!tipos.length) return null;
                return (
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>{' '}
                    {tipos.map(tp => {
                      const cfg = TIPO_CONTEUDO_CONFIG[tp];
                      return cfg ? `${cfg.icon} ${cfg.label}` : tp;
                    }).join(', ')}
                  </div>
                );
              })()}
              {(() => {
                const canais = parseCanais(tarefa.canal as any);
                if (!canais.length) return null;
                return (
                  <div>
                    <span className="text-muted-foreground">Canal:</span>{' '}
                    {canais.map(cn => {
                      const cfg = CANAL_CONFIG[cn];
                      return cfg ? `${cfg.icon} ${cfg.label}` : cn;
                    }).join(', ')}
                  </div>
                );
              })()}
              {tarefa.responsavelNome && <div><span className="text-muted-foreground">Responsável:</span> {tarefa.responsavelNome}</div>}
              {tarefa.delegadoPorNome && <div><span className="text-muted-foreground">Delegado por:</span> {tarefa.delegadoPorNome}</div>}
              {tarefa.dataPrevista && <div><span className="text-muted-foreground">Data prevista:</span> {tarefa.dataPrevista}</div>}
              {tarefa.dataPublicacao && <div><span className="text-muted-foreground">Publicação:</span> {tarefa.dataPublicacao} {tarefa.horaPublicacao || ''}</div>}
            </div>

            {tarefa.briefing && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Briefing</div>
                <div className="bg-muted/30 rounded p-3 text-sm whitespace-pre-wrap">{tarefa.briefing}</div>
              </div>
            )}
            {tarefa.copyLegenda && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Copy / Legenda</div>
                <div className="bg-muted/30 rounded p-3 text-sm whitespace-pre-wrap">{tarefa.copyLegenda}</div>
              </div>
            )}
            {tarefa.hashtags && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Hashtags</div>
                <div className="text-sm text-blue-600">{tarefa.hashtags}</div>
              </div>
            )}
            {tarefa.linkExterno && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Link externo</div>
                <a href={tarefa.linkExterno} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline break-all">
                  {tarefa.linkExterno}
                </a>
              </div>
            )}
            {tarefa.observacoes && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Observações</div>
                <div className="text-sm whitespace-pre-wrap">{tarefa.observacoes}</div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="entregas" className="space-y-4 mt-4">
            <div className="border rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">Adicionar entrega</div>
              <div className="flex flex-wrap gap-2 items-center">
                <input ref={fileRef} type="file" hidden onChange={handleFileChange} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {uploading ? 'A enviar...' : 'Carregar ficheiro'}
                </Button>
                <span className="text-xs text-muted-foreground">ou</span>
                <Input
                  placeholder="Nome do link"
                  value={linkNome}
                  onChange={e => setLinkNome(e.target.value)}
                  className="w-40 h-8"
                />
                <Input
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  className="flex-1 min-w-[180px] h-8"
                />
                <Button size="sm" onClick={handleAddLink} disabled={!linkUrl.trim()}>
                  <LinkIcon className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Upload máx. 50MB. Para vídeos longos, use Google Drive / WeTransfer.</p>
            </div>

            <div className="space-y-2">
              {anexos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Sem entregas ainda</p>
              )}
              {anexos.map(a => {
                const img = isImage(a) ? signedUrls[a.id] : null;
                return (
                  <div key={a.id} className="flex items-center gap-3 border rounded p-2 hover:bg-muted/30">
                    <button
                      onClick={() => handleOpenAnexo(a)}
                      className="shrink-0 h-14 w-14 rounded overflow-hidden bg-muted flex items-center justify-center border"
                      title="Pré-visualizar"
                    >
                      {img ? (
                        <img src={img} alt={a.nome} className="h-full w-full object-cover" loading="lazy" />
                      ) : a.tipo === 'link' ? (
                        <ExternalLink className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <button onClick={() => handleOpenAnexo(a)} className="flex-1 text-left text-sm truncate hover:underline">
                      {a.nome}
                    </button>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {a.uploadedByNome ? `${a.uploadedByNome} · ` : ''}
                      {format(new Date(a.createdAt), 'dd/MM HH:mm', { locale: pt })}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAnexo(a)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="comentarios" className="space-y-4 mt-4">
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {comentarios.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Sem comentários</p>
              )}
              {comentarios.map(c => (
                <div key={c.id} className={`rounded p-2 text-sm ${c.tipo === 'comentario' ? 'bg-muted/30' : 'bg-blue-50 text-blue-900 italic text-xs'}`}>
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="font-medium">{c.autorNome}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(c.createdAt), 'dd/MM/yyyy HH:mm', { locale: pt })}
                    </span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{c.conteudo}</div>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2">
              <Textarea
                rows={2}
                placeholder="Escreva um comentário..."
                value={novoComentario}
                onChange={e => setNovoComentario(e.target.value)}
              />
              <Button size="sm" onClick={handleAddComentario} disabled={!novoComentario.trim()} style={{ backgroundColor: '#E8561A' }}>
                Adicionar comentário
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {preview && createPortal(
          <div
            className="fixed inset-0 z-[200] bg-black/90 flex flex-col p-4"
            onClick={() => setPreview(null)}
          >
            <div className="w-full flex items-center justify-between text-white mb-3 px-2">
              <span className="text-sm truncate">{preview.nome}</span>
              <div className="flex items-center gap-3">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-xs underline opacity-80 hover:opacity-100"
                >
                  Abrir em nova aba
                </a>
                <button
                  onClick={(e) => { e.stopPropagation(); setPreview(null); }}
                  className="p-1 hover:bg-white/10 rounded"
                  aria-label="Fechar"
                >
                  <XIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div
              className="flex-1 w-full flex items-center justify-center overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              {preview.mime === 'application/pdf' || /\.pdf$/i.test(preview.nome) ? (
                <iframe
                  src={preview.url}
                  className="w-full h-full bg-white rounded"
                  title={preview.nome}
                />
              ) : (
                <img
                  src={preview.url}
                  alt={preview.nome}
                  className="max-w-full max-h-full object-contain rounded shadow-2xl"
                />
              )}
            </div>
          </div>,
          document.body
        )}
      </DialogContent>
    </Dialog>
  );
}
