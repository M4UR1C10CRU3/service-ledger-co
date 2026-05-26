import { Card, CardContent } from '@/components/ui/card';
import { Inbox, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import type { Oportunidade } from '@/types/followup';

interface Props {
  oportunidades: Oportunidade[];
}

export function FollowupCards({ oportunidades }: Props) {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const posAbertos = oportunidades.filter(o => ['po_recebido', 'em_analise'].includes(o.fase)).length;
  const propostasActivas = oportunidades.filter(o => ['proposta_elaboracao', 'proposta_enviada', 'em_negociacao'].includes(o.fase)).length;
  const adjudicadosMes = oportunidades.filter(o =>
    o.fase === 'adjudicado' && o.dataAdjudicacaoReal && new Date(o.dataAdjudicacaoReal) >= startMonth
  ).length;
  const entradasMes = oportunidades.filter(o => new Date(o.createdAt) >= startMonth).length;
  const taxaConversao = entradasMes > 0 ? Math.round((adjudicadosMes / entradasMes) * 100) : 0;

  const cards = [
    { label: 'POs em Aberto', value: posAbertos, icon: Inbox, color: 'text-gray-600', bg: 'bg-gray-50' },
    { label: 'Propostas Activas', value: propostasActivas, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Adjudicados (mês)', value: adjudicadosMes, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Taxa de Conversão (mês)', value: `${taxaConversao}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${c.bg}`}>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
