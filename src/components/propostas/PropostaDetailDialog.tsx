import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePropostas } from '@/hooks/usePropostas';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { formatEUR } from '@/lib/formatters';
import { exportPropostaPdf } from '@/components/propostas/propostaPdfExport';
import { exportPropostaExcel } from '@/components/propostas/propostaExcelExport';
import type { Proposta, PropostaLinha, PropostaEstado } from '@/types/proposta';
import { Pencil, FileDown, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: Proposta | null;
  onEdit: (p: Proposta) => void;
}

const estadoColor: Record<PropostaEstado, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviada: 'bg-blue-100 text-blue-700',
  aceite: 'bg-green-100 text-green-700',
  recusada: 'bg-red-100 text-red-700',
  expirada: 'bg-orange-100 text-orange-700',
};

export function PropostaDetailDialog({ open, onOpenChange, proposta, onEdit }: Props) {
  const { fetchLinhas, updateEstado } = usePropostas();
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const [linhas, setLinhas] = useState<PropostaLinha[]>([]);

  useEffect(() => {
    if (proposta && open) {
      fetchLinhas(proposta.id).then(setLinhas);
    }
  }, [proposta, open]);

  if (!proposta) return null;

  const handleEstado = async (estado: PropostaEstado) => {
    const ok = await updateEstado(proposta.id, estado);
    if (ok) toast({ title: `Estado alterado para ${estado}` });
    onOpenChange(false);
  };

  const handlePdf = () => {
    exportPropostaPdf({
      numeroProposta: proposta.numeroProposta,
      clienteNome: proposta.clienteNome || '',
      clienteMorada: proposta.clienteMorada || '',
      clienteNif: proposta.clienteNif || '',
      vendedorNome: proposta.vendedorNome || '',
      dataEmissao: proposta.dataEmissao,
      horaEmissao: proposta.horaEmissao,
      titulo: proposta.titulo || '',
      descricaoGeral: proposta.descricaoGeral || '',
      linhas: linhas.map(l => ({
        ordem: l.ordem,
        tipoLinha: l.tipoLinha as any,
        referencia: l.referencia || '',
        designacao: l.designacao || '',
        quantidade: l.quantidade,
        unidade: l.unidade,
        precoUnitario: l.precoUnitario,
        descontoPct: l.descontoPct,
        totalLinha: l.totalLinha,
        produtoId: l.produtoId,
      })),
      taxaIva: proposta.taxaIva,
      totalSemIva: proposta.totalSemIva,
      valorIva: proposta.valorIva,
      totalComIva: proposta.totalComIva,
      condicoesGerais: proposta.condicoesGerais || '',
      validadeTexto: proposta.validadeTexto || '',
      duracao: proposta.duracao || '',
      condicoesPagamento: proposta.condicoesPagamento || '',
      observacoes: proposta.observacoes || '',
    }, empresa);
  };

  const handleExcel = () => {
    exportPropostaExcel({
      numeroProposta: proposta.numeroProposta,
      clienteNome: proposta.clienteNome || '',
      clienteMorada: proposta.clienteMorada || '',
      clienteNif: proposta.clienteNif || '',
      vendedorNome: proposta.vendedorNome || '',
      dataEmissao: proposta.dataEmissao,
      titulo: proposta.titulo || '',
      descricaoGeral: proposta.descricaoGeral || '',
      linhas: linhas.map(l => ({
        ordem: l.ordem,
        tipoLinha: l.tipoLinha as any,
        referencia: l.referencia || '',
        designacao: l.designacao || '',
        quantidade: l.quantidade,
        unidade: l.unidade,
        precoUnitario: l.precoUnitario,
        descontoPct: l.descontoPct,
        totalLinha: l.totalLinha,
        produtoId: l.produtoId,
      })),
      taxaIva: proposta.taxaIva,
      totalSemIva: proposta.totalSemIva,
      valorIva: proposta.valorIva,
      totalComIva: proposta.totalComIva,
      condicoesGerais: proposta.condicoesGerais || '',
      validadeTexto: proposta.validadeTexto || '',
      duracao: proposta.duracao || '',
      condicoesPagamento: proposta.condicoesPagamento || '',
      observacoes: proposta.observacoes || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Pre-Proposta Nº {proposta.numeroProposta}
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

          <Separator />

          {/* Lines */}
          {linhas.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#E8630A] text-white">
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
                    if (l.tipoLinha === 'seccao') {
                      return (
                        <tr key={i} className="bg-gray-100">
                          <td colSpan={7} className="p-2 font-bold text-[#E8630A]">{l.designacao}</td>
                        </tr>
                      );
                    }
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
                    if (l.tipoLinha === 'texto') {
                      return (
                        <tr key={i}><td colSpan={7} className="p-2 italic text-muted-foreground">{l.designacao}</td></tr>
                      );
                    }
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
              <div className="flex justify-between font-bold text-[#E8630A] text-base">
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
              <Button variant="outline" size="sm" onClick={() => handleEstado('aceite')}>
                <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> Marcar Aceite
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleEstado('recusada')}>
                <XCircle className="h-4 w-4 mr-1 text-red-600" /> Marcar Recusada
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handlePdf}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
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
  );
}
