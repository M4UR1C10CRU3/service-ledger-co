import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, X, Search, Clock } from 'lucide-react';
import { ServiceWithCalculations } from '@/types/service';

interface DateFilterProps {
  services: ServiceWithCalculations[];
  selectedYear: string | null;
  selectedMonth: string | null;
  clienteSearch: string;
  debitoFilter: string | null;
  onYearChange: (year: string | null) => void;
  onMonthChange: (month: string | null) => void;
  onClienteSearchChange: (search: string) => void;
  onDebitoFilterChange: (filter: string | null) => void;
}

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

const DEBITO_OPTIONS = [
  { value: 'ate30', label: 'Até 30 dias' },
  { value: '31a90', label: 'Entre 31 e 90 dias' },
  { value: 'acima90', label: 'Acima de 90 dias' },
];

export const DateFilter = ({
  services,
  selectedYear,
  selectedMonth,
  clienteSearch,
  debitoFilter,
  onYearChange,
  onMonthChange,
  onClienteSearchChange,
  onDebitoFilterChange,
}: DateFilterProps) => {
  // Extract unique years from services and always include 2026
  const availableYears = useMemo(() => {
    const years = new Set<string>(['2026']); // Always include 2026
    services.forEach((service) => {
      // Data format is DD/MM/YYYY
      const parts = service.data.split('/');
      if (parts.length === 3) {
        years.add(parts[2]);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [services]);

  const clearFilters = () => {
    onYearChange(null);
    onMonthChange(null);
    onClienteSearchChange('');
    onDebitoFilterChange(null);
  };

  const hasActiveFilters = selectedYear || selectedMonth || clienteSearch || debitoFilter;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col gap-4">
          {/* First row - Period filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Filtrar por período:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selectedYear || ''}
                onValueChange={(value) => onYearChange(value || null)}
              >
                <SelectTrigger className="w-[130px] bg-background">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedMonth || ''}
                onValueChange={(value) => onMonthChange(value || null)}
              >
                <SelectTrigger className="w-[150px] bg-background">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second row - Client search and debt filter */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-4 w-4" />
              <span className="text-sm font-medium">Filtrar por cliente:</span>
            </div>
            
            <div className="relative">
              <Input
                type="text"
                placeholder="Pesquisar cliente..."
                value={clienteSearch}
                onChange={(e) => onClienteSearchChange(e.target.value)}
                className="w-[200px] pl-3"
              />
            </div>

            <div className="flex items-center gap-2 text-muted-foreground ml-4">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Débito:</span>
            </div>
            
            <Select
              value={debitoFilter || ''}
              onValueChange={(value) => onDebitoFilterChange(value || null)}
            >
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Tempo em atraso" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {DEBITO_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground ml-auto"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
