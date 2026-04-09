import { format } from 'date-fns';
import { CalendarIcon, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TIPO_LANCAMENTO_LABELS, ALL_CATEGORIAS } from '@/types/accountPayable';
import { Supplier } from '@/types/supplier';

export interface FiltersState {
  searchTerm: string;
  filterStatus: string;
  filterTipo: string;
  filterSupplier: string;
  filterCategoria: string;
  filterYear: string;
  filterMonth: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface Props {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  suppliers: Supplier[];
}

export const initialFilters: FiltersState = {
  searchTerm: '',
  filterStatus: 'all',
  filterTipo: 'all',
  filterSupplier: 'all',
  filterCategoria: 'all',
  filterYear: 'all',
  filterMonth: 'all',
  dateFrom: undefined,
  dateTo: undefined,
};

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export function AccountsPayableFilters({ filters, onFiltersChange, suppliers }: Props) {
  const update = (partial: Partial<FiltersState>) => onFiltersChange({ ...filters, ...partial });

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  const hasActiveFilters = filters.searchTerm || filters.filterStatus !== 'all' ||
    filters.filterTipo !== 'all' || filters.filterSupplier !== 'all' ||
    filters.filterCategoria !== 'all' || filters.filterYear !== 'all' ||
    filters.filterMonth !== 'all' || filters.dateFrom || filters.dateTo;

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Pesquisar por fornecedor, descrição ou nº documento..."
            value={filters.searchTerm}
            onChange={(e) => update({ searchTerm: e.target.value })}
            className="pl-10"
          />
        </div>
        <Select value={filters.filterSupplier} onValueChange={(v) => update({ filterSupplier: v })}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Fornecedores</SelectItem>
            {suppliers.filter(s => s.status === 'ativo').map(s => (
              <SelectItem key={s.id} value={s.id}>{s.razaoSocial}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col md:flex-row gap-3 flex-wrap">
        {/* Year / Month period filter */}
        <Select value={filters.filterYear} onValueChange={(v) => update({ filterYear: v })}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Anos</SelectItem>
            {availableYears.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.filterMonth} onValueChange={(v) => update({ filterMonth: v })}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Meses</SelectItem>
            {MONTHS.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.filterTipo} onValueChange={(v) => update({ filterTipo: v })}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {Object.entries(TIPO_LANCAMENTO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.filterCategoria} onValueChange={(v) => update({ filterCategoria: v })}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {ALL_CATEGORIAS.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.filterStatus} onValueChange={(v) => update({ filterStatus: v })}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="critico">
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-destructive" /> Crítico</span>
            </SelectItem>
            <SelectItem value="pendente">
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> Pendentes (à vencer)</span>
            </SelectItem>
            <SelectItem value="liquidado">
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Liquidado</span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Date range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !filters.dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yyyy') : 'Data início'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={filters.dateFrom} onSelect={(d) => update({ dateFrom: d || undefined })} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !filters.dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateTo ? format(filters.dateTo, 'dd/MM/yyyy') : 'Data fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={filters.dateTo} onSelect={(d) => update({ dateTo: d || undefined })} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => onFiltersChange(initialFilters)} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
