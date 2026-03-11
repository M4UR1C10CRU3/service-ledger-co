import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Oportunidade } from '@/types/followup';

interface Props {
  oportunidades: Oportunidade[];
}

export function FollowupCards({ oportunidades }: Props) {
  const ativas = oportunidades.filter(o => !['adjudicado', 'arquivado'].includes(o.fase));
  const ganhas = oportunidades.filter(o => o.fase === 'adjudicado');
  const fechadas = oportunidades.filter(o => ['adjudicado', 'arquivado'].includes(o.fase));
  const taxaConversao = fechadas.length > 0 ? Math.round((ganhas.length / fechadas.length) * 100) : 0;
  const valorPipeline = ativas.reduce((s, o) => s + (o.totalComIva ?? o.valorEstimado ?? 0), 0);

  const now = new Date();
  const alertasHoje = oportunidades.filter(o => {
    if (!o.proximoFollowupData || ['adjudicado', 'arquivado'].includes(o.fase)) return false;
    return new Date(o.proximoFollowupData) <= now;
  }).length;

  const cards = [
    { label: 'Em Acompanhamento', value: ativas.length, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Valor em Pipeline', value: `€${valorPipeline.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Taxa de Conversão', value: `${taxaConversao}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Alertas Hoje', value: alertasHoje, icon: AlertTriangle, color: alertasHoje > 0 ? 'text-red-600' : 'text-gray-400', bg: alertasHoje > 0 ? 'bg-red-50' : 'bg-gray-50' },
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
