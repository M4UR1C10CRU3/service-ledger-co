import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { AREAS_NEGOCIO, PRIORIDADE_CONFIG, type PlaneamentoPrioridade } from '@/types/planeamento';

export interface PlaneamentoFiltrosState {
  search: string;
  responsavel: string;
  prioridade: string;
  area: string;
  prazo: string;
}

interface Props {
  value: PlaneamentoFiltrosState;
  onChange: (v: PlaneamentoFiltrosState) => void;
  responsaveis: string[];
}

export function PlaneamentoFiltros({ value, onChange, responsaveis }: Props) {
  const set = (patch: Partial<PlaneamentoFiltrosState>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={e => set({ search: e.target.value })}
          placeholder="Pesquisar por título, descrição ou tag..."
          className="pl-9"
        />
      </div>
      <Select value={value.responsavel} onValueChange={v => set({ responsavel: v })}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Todos os responsáveis</SelectItem>
          {responsaveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={value.prioridade} onValueChange={v => set({ prioridade: v })}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Todas</SelectItem>
          {(Object.keys(PRIORIDADE_CONFIG) as PlaneamentoPrioridade[]).map(k => (
            <SelectItem key={k} value={k}>{PRIORIDADE_CONFIG[k].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.area} onValueChange={v => set({ area: v })}>
        <SelectTrigger className="w-[170px]"><SelectValue placeholder="Área" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Todas as áreas</SelectItem>
          {AREAS_NEGOCIO.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={value.prazo} onValueChange={v => set({ prazo: v })}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Prazo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Qualquer prazo</SelectItem>
          <SelectItem value="vencido">Vencido</SelectItem>
          <SelectItem value="7d">Próximos 7 dias</SelectItem>
          <SelectItem value="30d">Próximos 30 dias</SelectItem>
          <SelectItem value="sem">Sem prazo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
