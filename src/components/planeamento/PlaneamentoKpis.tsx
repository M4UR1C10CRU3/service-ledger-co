import { Card } from '@/components/ui/card';
import { Lightbulb, AlertTriangle, CheckCircle2, Trophy } from 'lucide-react';
import type { PlaneamentoCard } from '@/types/planeamento';

interface Props { cards: PlaneamentoCard[] }

export function PlaneamentoKpis({ cards }: Props) {
  const ativos = cards.filter(c => !['arquivado', 'concluido'].includes(c.coluna)).length;
  const criticos = cards.filter(c => c.prioridade === 'critica' && !['arquivado', 'concluido'].includes(c.coluna)).length;
  const aprovados = cards.filter(c => c.coluna === 'aprovado').length;
  const now = new Date();
  const concluidosMes = cards.filter(c => {
    if (c.coluna !== 'concluido' || !c.data_conclusao_real) return false;
    const d = new Date(c.data_conclusao_real);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const items = [
    { label: 'Activos', value: ativos, icon: Lightbulb, color: 'text-[#E8561A]', bg: 'bg-orange-50' },
    { label: 'Críticos', value: criticos, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Aprovados (aguardam)', value: aprovados, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Concluídos este mês', value: concluidosMes, icon: Trophy, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(it => (
        <Card key={it.label} className="p-4 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${it.bg}`}>
            <it.icon className={`h-5 w-5 ${it.color}`} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{it.label}</div>
            <div className="text-2xl font-semibold">{it.value}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
