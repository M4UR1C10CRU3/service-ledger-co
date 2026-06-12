import { useState } from 'react';
import { useEmpresa } from '@/contexts/EmpresaContext';
import {
  useFinanceiroKanban,
  PagamentoCard, RecebimentoCard, CobrancaCard,
  FasePagamento, FaseRecebimento, FaseCobranca,
} from '@/hooks/useFinanceiroKanban';
import { KanbanBoard, KanbanColumnDef } from '@/components/shared/KanbanBoard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { sendEmail } from '@/lib/sendEmail';
import { buildPedidoPagamentoEmail, buildCobrancaDebitoEmail, buildComprovativoPagamentoEmail } from '@/lib/emailTemplates';
import { useToast } from '@/hooks/use-toast';
import { Euro, Mail, RefreshCw, ShoppingCart, User } from 'lucide-react';

// ── Column definitions ────────────────────────────────────────────────────────

const PAGAMENTO_COLS: KanbanColumnDef[] = [
  { key: 'pendente',             label: 'Aguardando Pagamento', color: '#f59e0b' },
  { key: 'comprovativo_enviado', label: 'Comprovativo Enviado',  color: '#6366f1' },
  { key: 'confirmado',           label: 'Confirmado',            color: '#22c55e', locked: true },
];

const RECEBIMENTO_COLS: KanbanColumnDef[] = [
  { key: 'aguardando',    label: 'Aguardando',        color: '#94a3b8' },
  { key: 'fatura_enviada', label: 'Fatura Enviada',   color: '#f59e0b' },
  { key: 'parcial',       label: 'Pagamento Parcial',  color: '#6366f1' },
  { key: 'recebido',      label: 'Recebido',           color: '#22c55e', locked: true },
];

const COBRANCA_COLS: KanbanColumnDef[] = [
  { key: 'em_debito',       label: 'Em Débito',      color: '#ef4444' },
  { key: 'primeira_cobranca', label: '1ª Cobrança',  color: '#f97316' },
  { key: 'segunda_cobranca',  label: '2ª Cobrança',  color: '#f59e0b' },
  { key: 'em_acordo',       label: 'Em Acordo',      color: '#6366f1' },
  { key: 'liquidado',       label: 'Liquidado',      color: '#22c55e', locked: true },
];

const fmtEUR = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

// ── Card components ───────────────────────────────────────────────────────────

function PagamentoCardView({ item, onEmail }: { item: PagamentoCard; onEmail: (c: PagamentoCard) => void }) {
  return (
    <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">{item.numero}</Badge>
          <Badge variant="secondary" className="text-xs">{item.estado}</Badge>
        </div>
        <p className="text-sm font-medium line-clamp-2">{item.titulo}</p>
        {item.fornecedorNome && (
          <p className="text-xs text-muted-foreground truncate">
            <ShoppingCart className="w-3 h-3 inline mr-1" />{item.fornecedorNome}
          </p>
        )}
        {item.valorEstimado != null && (
          <p className="text-xs font-semibold">
            <Euro className="w-3 h-3 inline mr-1" />{fmtEUR(item.valorEstimado)}
          </p>
        )}
        <div className="flex gap-1 pt-1">
          <Button
            variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:text-blue-700"
            title="Enviar comprovativo de pagamento"
            onClick={e => { e.stopPropagation(); onEmail(item); }}
          >
            <Mail className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RecebimentoCardView({ item, onEmail }: { item: RecebimentoCard; onEmail: (c: RecebimentoCard) => void }) {
  return (
    <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-1.5">
        <p className="text-sm font-medium truncate">
          <User className="w-3 h-3 inline mr-1" />{item.clienteNome}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">{item.servico}</p>
        {item.numeroFatura && (
          <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">{item.numeroFatura}</Badge>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Saldo</span>
          <span className="text-xs font-bold text-amber-600">{fmtEUR(item.saldo)}</span>
        </div>
        {item.email && (
          <Button
            variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:text-blue-700 mt-1"
            title="Enviar pedido de pagamento"
            onClick={e => { e.stopPropagation(); onEmail(item); }}
          >
            <Mail className="w-3.5 h-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CobrancaCardView({ item, onEmail }: { item: CobrancaCard; onEmail: (c: CobrancaCard) => void }) {
  return (
    <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-1.5">
        <p className="text-sm font-medium truncate">
          <User className="w-3 h-3 inline mr-1" />{item.clienteNome}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">{item.servico}</p>
        {item.numeroFatura && (
          <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">{item.numeroFatura}</Badge>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Em dívida</span>
          <span className="text-xs font-bold text-red-600">{fmtEUR(item.saldo)}</span>
        </div>
        {item.email && (
          <Button
            variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 mt-1"
            title="Enviar cobrança"
            onClick={e => { e.stopPropagation(); onEmail(item); }}
          >
            <Mail className="w-3.5 h-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FinanceiroKanban() {
  const { empresa } = useEmpresa();
  const {
    pagamentos, recebimentos, cobrancas, isLoading, refresh,
    movePagamento, moveRecebimento, moveCobranca,
  } = useFinanceiroKanban(empresa?.id);
  const { toast } = useToast();

  // ── Email handlers ──────────────────────────────────────────────────────────

  const handleEmailRecebimento = async (item: RecebimentoCard) => {
    if (!empresa || !item.email) return;
    const { subject, html, tipo } = buildPedidoPagamentoEmail(
      {
        clienteNome: item.clienteNome,
        servico: item.servico,
        valorTotal: item.valorTotal,
        valorPago: item.liquidado,
        referencia: item.numeroFatura,
      },
      { slug: empresa.slug, nome: empresa.nome },
    );
    const result = await sendEmail({ empresa_id: empresa.id, tipo, to: item.email, subject, html });
    if (result.ok) {
      toast({ title: 'Pedido de pagamento enviado', description: `Para ${item.clienteNome}` });
      await moveRecebimento(item.id, 'fatura_enviada');
    } else {
      toast({ title: 'Erro ao enviar', description: result.error, variant: 'destructive' });
    }
  };

  const handleEmailCobranca = async (item: CobrancaCard) => {
    if (!empresa || !item.email) return;
    const { subject, html, tipo } = buildCobrancaDebitoEmail(
      {
        clienteNome: item.clienteNome,
        servico: item.servico,
        valorTotal: item.valorTotal,
        valorPago: item.liquidado,
        referencia: item.numeroFatura,
      },
      { slug: empresa.slug, nome: empresa.nome },
    );
    const result = await sendEmail({ empresa_id: empresa.id, tipo, to: item.email, subject, html });
    if (result.ok) {
      // Auto-advance: first email → primeira_cobranca, second → segunda_cobranca
      const nextFase: FaseCobranca =
        item.faseCobranca === 'em_debito' ? 'primeira_cobranca' :
        item.faseCobranca === 'primeira_cobranca' ? 'segunda_cobranca' :
        item.faseCobranca;
      toast({ title: 'Cobrança enviada', description: `Para ${item.clienteNome}` });
      if (nextFase !== item.faseCobranca) await moveCobranca(item.id, nextFase);
    } else {
      toast({ title: 'Erro ao enviar', description: result.error, variant: 'destructive' });
    }
  };

  const handleEmailPagamento = async (item: PagamentoCard) => {
    if (item.fornecedorId) {
      try {
        const { data: forn } = await supabase
          .from('fornecedores')
          .select('email')
          .eq('id', item.fornecedorId)
          .single();
        if (forn?.email) {
          const { subject, html, tipo } = buildComprovativoPagamentoEmail({
            fornecedorNome: item.fornecedorNome || '',
            neNumero:       item.numero,
            descricao:      item.titulo,
            valorPago:      item.valorEstimado ?? 0,
            dataPagamento:  null,
          }, empresa);
          const result = await sendEmail({ to: forn.email, subject, html, empresa_id: empresa?.id, tipo });
          if (result.ok) {
            toast({ title: 'Comprovativo enviado', description: `Para: ${forn.email}` });
          }
        }
      } catch {
        // Email failure não bloqueia o avanço de fase
      }
    }
    await movePagamento(item.id, 'comprovativo_enviado');
    toast({ title: 'Marcado como "Comprovativo Enviado"', description: 'Avance para "Confirmado" após confirmação do fornecedor.' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Lane 1: Pagamentos a Fornecedores */}
      <KanbanBoard<PagamentoCard>
        columns={PAGAMENTO_COLS}
        items={pagamentos}
        getColumnKey={item => item.fasePagamento}
        renderCard={item => (
          <PagamentoCardView item={item} onEmail={handleEmailPagamento} />
        )}
        onMove={async (id, col) => movePagamento(id, col as FasePagamento)}
        laneTitle="Pagamentos a Fornecedores"
        laneTitleColor="#f59e0b"
        emptyMessage="Sem NEs a aguardar pagamento"
      />

      {/* Lane 2: Recebimentos / Adjudicações */}
      <KanbanBoard<RecebimentoCard>
        columns={RECEBIMENTO_COLS}
        items={recebimentos}
        getColumnKey={item => item.faseRecebimento}
        renderCard={item => (
          <RecebimentoCardView item={item} onEmail={handleEmailRecebimento} />
        )}
        onMove={async (id, col) => moveRecebimento(id, col as FaseRecebimento)}
        laneTitle="Recebimentos — Adjudicações"
        laneTitleColor="#3b82f6"
        emptyMessage="Sem faturas pendentes de recebimento"
      />

      {/* Lane 3: Cobranças */}
      <KanbanBoard<CobrancaCard>
        columns={COBRANCA_COLS}
        items={cobrancas}
        getColumnKey={item => item.faseCobranca}
        renderCard={item => (
          <CobrancaCardView item={item} onEmail={handleEmailCobranca} />
        )}
        onMove={async (id, col) => moveCobranca(id, col as FaseCobranca)}
        laneTitle="Cobranças a Clientes em Débito"
        laneTitleColor="#ef4444"
        emptyMessage="Sem clientes em débito"
      />
    </div>
  );
}
