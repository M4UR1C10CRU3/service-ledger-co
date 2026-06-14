import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { usePropostas } from '@/hooks/usePropostas';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { formatEUR } from '@/lib/formatters';
import { buildPropostaPdfHtml, exportPropostaPdf, type PropostaPdfMode } from '@/components/propostas/propostaPdfExport';
import { exportPropostaExcel } from '@/components/propostas/propostaExcelExport';
import { supabase } from '@/integrations/supabase/client';
import { propostaPdfPath } from '@/lib/storagePaths';
import { inserirNotificacaoInterna } from '@/hooks/useNotificacoesInternas';
import { buildPropostaAdjudicadaEmail } from '@/lib/emailTemplates';
import { SendEmailDialog } from '@/components/SendEmailDialog';
import type { Proposta, PropostaLinha, PropostaEstado } from '@/types/proposta';
import { Pencil, FileDown, FileSpreadsheet, CheckCircle, XCircle, Loader2, ExternalLink, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: Proposta | null;
  onEdit: (p: Proposta) => void;
}

const estadoColor: Record<PropostaEstado, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviada:  'bg-blue-100 text-blue-700',
  aceite:   'bg-green-100 text-green-700',
  recusada: 'bg-red-100 text-red-700',
  expirada: 'bg-orange-100 text-orange-700',
};

// ── Helper: load image as base64 data URL ─────────────────────────────────────

function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PropostaDetailDialog({ open, onOpenChange, proposta, onEdit }: Props) {
  const { fetchLinhas, updateEstado } = usePropostas();
  const { empresa, getLogo } = useEmpresa();
  const { toast } = useToast();
  const [linhas, setLinhas] = useState<PropostaLinha[]>([]);
  const [isAceitando, setIsAceitando] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  useEffect(() => {
    if (proposta && open) {
      fetchLinhas(proposta.id).then(setLinhas);
    }
  }, [proposta, open]);

  if (!proposta) return null;

  // ── Build PDF data from current proposta + linhas ─────────────────────────

  const buildPdfData = () => ({
    numeroProposta: proposta.numeroProposta,
    clienteNome:    proposta.clienteNome || '',
    clienteMorada:  proposta.clienteMorada || '',
    clienteNif:     proposta.clienteNif || '',
    vendedorNome:   proposta.vendedorNome || '',
    dataEmissao:    proposta.dataEmissao,
    horaEmissao:    proposta.horaEmissao,
    titulo:         proposta.titulo || '',
    descricaoGeral: proposta.descricaoGeral || '',
    linhas: linhas.map(l => ({
      ordem:         l.ordem,
      tipoLinha:     l.tipoLinha as any,
      referencia:    l.referencia || '',
      designacao:    l.designacao || '',
      quantidade:    l.quantidade,
      unidade:       l.unidade,
      precoUnitario: l.precoUnitario,
      descontoPct:   l.descontoPct,
      totalLinha:    l.totalLinha,
      produtoId:     l.produtoId,
    })),
    taxaIva:              proposta.taxaIva,
    totalSemIva:          proposta.totalSemIva,
    valorIva:             proposta.valorIva,
    totalComIva:          proposta.totalComIva,
    condicoesGerais:      proposta.condicoesGerais || '',
    validadeTexto:        proposta.validadeTexto || '',
    duracao:              proposta.duracao || '',
    condicoesPagamento:   proposta.condicoesPagamento || '',
    observacoes:          proposta.observacoes || '',
  });

  // ── PDF print dialog ──────────────────────────────────────────────────────

  const handlePdf = (mode: PropostaPdfMode = 'unitarios') => {
    const logoSrc = getLogo();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      exportPropostaPdf(buildPdfData(), empresa, canvas.toDataURL('image/png'), mode);
    };
    img.onerror = () => exportPropostaPdf(buildPdfData(), empresa, undefined, mode);
    img.src = logoSrc;
  };

  // ── Aceitar proposta: upload HTML to Supabase Storage ─────────────────────

  const handleAceitar = async () => {
    if (!empresa) return;
    setIsAceitando(true);

    // 1. Load logo
    let logoDataUrl: string | undefined;
    try { logoDataUrl = await loadImageAsDataUrl(getLogo()); }
    catch { /* proceed without logo */ }

    // 2. Build HTML blob
    const { html, filename } = buildPropostaPdfHtml(buildPdfData(), empresa, logoDataUrl, 'unitarios');
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });

    // 3. Upload to Supabase Storage (bucket: proposta-pdfs)
    const storagePath = propostaPdfPath(empresa.id, proposta.numeroProposta || '');
    let pdfUrl: string | undefined;

    const { error: upErr } = await supabase.storage
      .from('proposta-pdfs')
      .upload(storagePath, blob, { contentType: 'text/html;charset=utf-8', upsert: true });

    if (!upErr) {
      const { data: urlData } = supabase.storage
        .from('proposta-pdfs')
        .getPublicUrl(storagePath);
      pdfUrl = urlData?.publicUrl;
    } else {
      console.warn('[Clariza] PDF upload:', upErr.message);
    }

    // 4. Save estado + PDF URL
    const ok = await updateEstado(proposta.id, 'aceite', pdfUrl);
    setIsAceitando(false);

    if (ok) {
      // 5. Notificação interna → financeiro
      await inserirNotificacaoInterna({
        empresa_id: empresa.id,
        tipo: 'proposta_aceite',
        titulo: `Proposta ${proposta.numeroProposta} adjudicada`,
        mensagem: `${proposta.clienteNome ? proposta.clienteNome + ' · ' : ''}${formatEUR(proposta.totalComIva)}`,
        perfil_destino: 'financeiro',
        referencia_id: proposta.id,
        referencia_tipo: 'proposta',
      });

      if (pdfUrl) {
        toast({
          title: '✅ Proposta aceite',
          description: '📄 PDF guardado no sistema  ·  💰 Financeiro notificado',
          duration: 6000,
        });
      } else {
        toast({
          title: '✅ Proposta aceite',
          description: 'PDF não guardado — crie o bucket "proposta-pdfs" no Supabase Storage (público).',
          duration: 8000,
        });
      }
    }

    onOpenChange(false);
  };

  // ── Outros estados ────────────────────────────────────────────────────────

  const handleEstado = async (estado: PropostaEstado) => {
    const ok = await updateEstado(proposta.id, estado);
    if (ok) toast({ title: `Estado alterado para "${estado}"` });
    onOpenChange(false);
  };

  // ── Excel ─────────────────────────────────────────────────────────────────

  const handleExcel = () => {
    exportPropostaExcel({
      numeroProposta:  proposta.numeroProposta,
      clienteNome:     proposta.clienteNome || '',
      clienteMorada:   proposta.clienteMorada || '',
      clienteNif:      proposta.clienteNif || '',
      vendedorNome:    proposta.vendedorNome || '',
      dataEmissao:     proposta.dataEmissao,
      titulo:          proposta.titulo || '',
      descricaoGeral:  proposta.descricaoGeral || '',
      linhas: linhas.map(l => ({
        ordem: l.ordem, tipoLinha: l.tipoLinha as any,
        referencia: l.referencia || '', designacao: l.designacao || '',
        quantidade: l.quantidade, unidade: l.unidade,
        precoUnitario: l.precoUnitario, descontoPct: l.descontoPct,
        totalLinha: l.totalLinha, produtoId: l.produtoId,
      })),
      taxaIva: proposta.taxaIva, totalSemIva: proposta.totalSemIva,
      valorIva: proposta.valorIva, totalComIva: proposta.totalComIva,
      condicoesGerais: proposta.condicoesGerais || '',
      validadeTexto:   proposta.validadeTexto || '',
      duracao:         proposta.duracao || '',
      condicoesPagamento: proposta.condicoesPagamento || '',
      observacoes:     proposta.observacoes || '',
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Pré-Proposta Nº {proposta.numeroProposta}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estadoColor[proposta.estado]}`}>
              {proposta.estado}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Client info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">{proposta.clienteNome || '—'}</p>
              {proposta.clienteMorada && <p className="text-xs text-muted-foreground">{proposta.clienteMorada}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Data Emissão</p>
                <p>{new Date(proposta.dataEmissao).toLocaleDateString('pt-PT')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">NIF</p>
                <p>{proposta.clienteNif || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendedor</p>
                <p>{proposta.vendedorNome || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Validade</p>
                <p>{proposta.dataValidade ? new Date(proposta.dataValidade).toLocaleDateString('pt-PT') : '—'}</p>
              </div>
            </div>
          </div>

          {/* PDF guardado (only if aceite + URL saved) */}
          {proposta.estado === 'aceite' && proposta.pdfAceiteUrl && (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm">
              <span className="text-green-700 font-medium">📄 PDF guardado na adjudicação</span>
              <a
                href={proposta.pdfAceiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-xs text-green-700 underline hover:text-green-900"
              >
                Ver <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <Separator />

          {/* Lines */}
          {linhas.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="p-2 text-left">Referência</th>
                    <th className="p-2 text-left">Designação</th>
                    <th className="p-2 text-right">Qtd.</th>
                    <th className="p-2 text-left">Uni.</th>
                    <th className="p-2 text-right">Preço Unit.</th>
                    <th className="p-2 text-right">Desc.</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => {
                    if (l.tipoLinha === 'seccao') return (
                      <tr key={i} className="bg-gray-100">
                        <td colSpan={7} className="p-2 font-bold text-primary">{l.designacao}</td>
                      </tr>
                    );
                    if (l.tipoLinha === 'subtotal') {
                      let sub = 0;
                      for (let j = i - 1; j >= 0; j--) {
                        if (linhas[j].tipoLinha === 'seccao' || linhas[j].tipoLinha === 'subtotal') break;
                        if (linhas[j].tipoLinha === 'artigo') sub += linhas[j].totalLinha;
                      }
                      return (
                        <tr key={i} className="bg-gray-200">
                          <td colSpan={6} className="p-2 text-right font-bold">Subtotal</td>
                          <td className="p-2 text-right font-bold">{formatEUR(sub)}</td>
                        </tr>
                      );
                    }
                    if (l.tipoLinha === 'texto') return (
                      <tr key={i}><td colSpan={7} className="p-2 italic text-muted-foreground">{l.designacao}</td></tr>
                    );
                    return (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                        <td className="p-2">{l.referencia}</td>
                        <td className="p-2">{l.designacao}</td>
                        <td className="p-2 text-right">{l.quantidade.toFixed(3).replace('.', ',')}</td>
                        <td className="p-2">{l.unidade}</td>
                        <td className="p-2 text-right">{formatEUR(l.precoUnitario)}</td>
                        <td className="p-2 text-right">{l.descontoPct > 0 ? `${l.descontoPct}%` : ''}</td>
                        <td className="p-2 text-right font-medium">{formatEUR(l.totalLinha)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span>Total sem IVA:</span><span>{formatEUR(proposta.totalSemIva)}</span></div>
              <div className="flex justify-between"><span>IVA ({proposta.taxaIva}%):</span><span>{formatEUR(proposta.valorIva)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-primary text-base">
                <span>Total com IVA:</span><span>{formatEUR(proposta.totalComIva)}</span>
              </div>
            </div>
          </div>

          {/* Conditions */}
          {proposta.condicoesGerais && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Condições:</strong> {proposta.condicoesGerais}</p>
              {proposta.validadeTexto && <p><strong>Validade:</strong> {proposta.validadeTexto}</p>}
              {proposta.condicoesPagamento && <p><strong>Pagamento:</strong> {proposta.condicoesPagamento}</p>}
              {proposta.observacoes && <p><strong>Obs:</strong> {proposta.observacoes}</p>}
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {proposta.estado === 'enviada' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAceitar}
                disabled={isAceitando}
                className="text-green-700 border-green-200 hover:bg-green-50"
              >
                {isAceitando
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> A processar...</>
                  : <><CheckCircle className="h-4 w-4 mr-1" /> Marcar Aceite</>}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleEstado('recusada')}>
                <XCircle className="h-4 w-4 mr-1 text-red-600" /> Marcar Recusada
              </Button>
            </>
          )}
          {proposta.estado === 'aceite' && (
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}
              className="text-primary border-primary/30 hover:bg-primary/5">
              <Mail className="h-4 w-4 mr-1" /> Enviar ao Cliente
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handlePdf('unitarios')}>
            <FileDown className="h-4 w-4 mr-1" /> PDF Unitários
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePdf('subtotais')}>
            <FileDown className="h-4 w-4 mr-1" /> PDF Subtotais
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePdf('global')}>
            <FileDown className="h-4 w-4 mr-1" /> PDF Global
          </Button>
          <Button variant="outline" size="sm" onClick={handleExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button size="sm" onClick={() => { onOpenChange(false); onEdit(proposta); }}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Email dialog — confirmação ao cliente */}
    {(() => {
      const { subject, html, from, tipo } = buildPropostaAdjudicadaEmail({
        numeroProposta: proposta.numeroProposta,
        clienteNome:    proposta.clienteNome || '',
        totalComIva:    proposta.totalComIva,
        dataEmissao:    proposta.dataEmissao,
        titulo:         proposta.titulo || undefined,
        duracao:        proposta.duracao || undefined,
        condicoesPagamento: proposta.condicoesPagamento || undefined,
        observacoes:    proposta.observacoes || undefined,
      }, empresa);
      return (
        <SendEmailDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          title="Enviar confirmação ao cliente"
          description={`Proposta ${proposta.numeroProposta} — ${proposta.clienteNome || ''}`}
          from={from}
          subject={subject}
          html={html}
          empresa_id={empresa?.id}
          tipo={tipo}
        />
      );
    })()}
    </>
  );
}
