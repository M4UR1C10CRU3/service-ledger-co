import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { ServiceWithCalculations } from '@/types/service';

interface DateFilterProps {
  services: ServiceWithCalculations[];
  selectedYear: string | null;
  selectedMonth: string | null;
  onYearChange: (year: string | null) => void;
  onMonthChange: (month: string | null) => void;
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

export const DateFilter = ({
  services,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
}: DateFilterProps) => {
  // Extract unique years from services
  const availableYears = useMemo(() => {
    const years = new Set<string>();
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
  };

  const hasActiveFilters = selectedYear || selectedMonth;

  return (
    <Card>
      <CardContent className="py-4">
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
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
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
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <span className="text-sm text-muted-foreground ml-auto">
              A mostrar: {selectedMonth ? MONTHS.find(m => m.value === selectedMonth)?.label : 'Todos os meses'} 
              {selectedYear ? ` de ${selectedYear}` : ''}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
