import { useState } from 'react';
import { useNotasEncomenda } from '@/hooks/useNotasEncomenda';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { NotaEncomenda, NeEstado, NE_PRIORIDADES } from '@/types/notaEncomenda';
import { KanbanBoard, KanbanColumnDef } from '@/components/shared/KanbanBoard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sendEmail } from '@/lib/sendEmail';
import { buildNotaEncomendaEmail } from '@/lib/emailTemplates';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ShoppingCart, Calendar, Euro, Mail, Eye, AlertTriangle,
} from 'lucide-react';

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS: KanbanColumnDef[] = [
  { key: 'rascunho',          label: 'Rascunho',          color: '#94a3b8' },
  { key: 'enviada',           label: 'Cotação Pedida',     color: '#f59e0b' },
  { key: 'cotacao_recebida',  label: 'Cotação Recebida',   color: '#6366f1' },
  { key: 'aprovada',          label: 'Aprovada',           color: '#06b6d4' },
  { key: 'encomendada',       label: 'NE Emitida',         color: '#f97316' },
  { key: 'recebida',          label: 'Entregue',           color: '#22c55e' },
  { key: 'faturada',          label: 'Faturada',           color: '#a855f7' },
  { key: 'cancelada',         label: 'Cancelada',          color: '#f43f5e', locked: true },
];

const fmtEUR = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// ── NE Card ───────────────────────────────────────────────────────────────────

function NeCard({
  ne,
  onSendEmail,
  onDetail,
}: {
  ne: NotaEncomenda;
  onSendEmail: (ne: NotaEncomenda) => void;
  onDetail: (ne: NotaEncomenda) => void;
}) {
  const prioridade = NE_PRIORIDADES[ne.prioridade];
  const needsEmail = ne.estado === 'enviada' || ne.estado === 'encomendada';

  return (
    <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
              {ne.numero}
            </Badge>
            <span className={`text-xs font-medium ${prioridade.color}`}>
              {prioridade.label}
            </span>
          </div>
          {ne.prioridade === 'urgente' && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium leading-tight line-clamp-2">{ne.titulo}</p>

        {/* Supplier */}
        {ne.fornecedorNome && (
          <p className="text-xs text-muted-foreground truncate">
            <ShoppingCart className="w-3 h-3 inline mr-1" />
            {ne.fornecedorNome}
          </p>
        )}

        {/* Value */}
        {ne.valorEstimado != null && (
          <p className="text-xs font-semibold text-foreground">
            <Euro className="w-3 h-3 inline mr-1" />
            {fmtEUR(ne.valorEstimado)}
          </p>
        )}

        {/* Date */}
        {ne.dataNecessidade && (
          <p className="text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 inline mr-1" />
            {fmtDate(ne.dataNecessidade)}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-1 pt-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Ver detalhes"
            onClick={e => { e.stopPropagation(); onDetail(ne); }}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {needsEmail && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-blue-500 hover:text-blue-700"
              title={ne.estado === 'enviada' ? 'Enviar pedido de cotação' : 'Enviar NE ao fornecedor'}
              onClick={e => { e.stopPropagation(); onSendEmail(ne); }}
            >
              <Mail className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  /** Optional search text — filters cards by title or supplier name */
  searchTerm?: string;
  onDetail?: (ne: NotaEncomenda) => void;
}

export function ComprasKanban({ searchTerm = '', onDetail }: Props) {
  const { empresa } = useEmpresa();
  const { notas, updateEstado, isInitialized } = useNotasEncomenda(empresa?.id);
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const visibleNotas = searchTerm.trim()
    ? notas.filter(ne =>
        ne.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ne.fornecedorNome ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : notas;

  const handleMove = async (neId: string, toColumn: string): Promise<void> => {
    await updateEstado(neId, toColumn as NeEstado);
  };

  const handleSendEmail = async (ne: NotaEncomenda) => {
    if (!empresa) return;
    setSendingId(ne.id);
    try {
      // Look up supplier email from the suppliers table
      let supplierEmail = '';
      if (ne.fornecedorId) {
        const { data: sup } = await (supabase as any)
          .from('fornecedores')
          .select('email')
          .eq('id', ne.fornecedorId)
          .single();
        supplierEmail = sup?.email ?? '';
      }
      if (!supplierEmail) {
        toast({ title: 'Email do fornecedor não encontrado', description: 'Adicione o email ao registo do fornecedor.', variant: 'destructive' });
        return;
      }

      const { subject, html, tipo } = buildNotaEncomendaEmail(
        {
          numero: ne.numero,
          titulo: ne.titulo,
          fornecedorNome: ne.fornecedorNome,
          dataCriacao: ne.dataCriacao,
          dataNecessidade: ne.dataNecessidade,
          items: [],
          valorEstimado: ne.valorEstimado,
        },
        { slug: empresa.slug, nome: empresa.nome },
      );

      const emailLabel = ne.estado === 'enviada' ? 'pedido de cotação' : 'nota de encomenda';
      const result = await sendEmail({
        empresa_id: empresa.id,
        tipo,
        to: supplierEmail,
        subject,
        html,
      });

      if (result.ok) {
        toast({ title: `Email de ${emailLabel} enviado`, description: `Para ${ne.fornecedorNome || supplierEmail}` });
      } else {
        toast({ title: 'Erro ao enviar email', description: result.error, variant: 'destructive' });
      }
    } finally {
      setSendingId(null);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <KanbanBoard<NotaEncomenda>
      columns={COLUMNS}
      items={visibleNotas}
      getColumnKey={ne => ne.estado}
      renderCard={ne => (
        <NeCard
          ne={ne}
          onSendEmail={handleSendEmail}
          onDetail={ne => onDetail?.(ne)}
        />
      )}
      onMove={handleMove}
      emptyMessage="Sem NEs nesta fase"
    />
  );
}
