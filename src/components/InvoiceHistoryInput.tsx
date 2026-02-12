import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { formatNumber, parseFormattedNumber, formatInputValue } from '@/lib/formatters';

export interface InvoiceEntry {
  numero: string;
  valor: number;
}

interface InvoiceHistoryInputProps {
  entries: InvoiceEntry[];
  onChange: (entries: InvoiceEntry[]) => void;
  labelNumero?: string;
  labelValor?: string;
  placeholderNumero?: string;
  entryPrefix?: string;
}

/**
 * Serializa entries para armazenamento no campo numeroFatura.
 * Formato: "4/2026|5000; 6/2026|3000"
 */
export const serializeInvoiceEntries = (entries: InvoiceEntry[]): string => {
  return entries.map(e => `${e.numero}|${e.valor}`).join('; ');
};

/**
 * Desserializa a string armazenada para InvoiceEntry[].
 * Suporta formato legado (sem valor): "4/2026; 6/2026"
 */
export const parseInvoiceEntries = (raw: string | undefined): InvoiceEntry[] => {
  if (!raw) return [];
  return raw.split('; ').filter(Boolean).map(part => {
    const [numero, valorStr] = part.split('|');
    return {
      numero: numero || '',
      valor: valorStr ? parseFloat(valorStr) : 0,
    };
  });
};

/**
 * Calcula o valor faturado total a partir dos entries.
 */
export const calcTotalFaturado = (entries: InvoiceEntry[]): number => {
  return entries.reduce((sum, e) => sum + e.valor, 0);
};

export const InvoiceHistoryInput = ({ 
  entries, 
  onChange, 
  labelNumero = 'Nº Fatura',
  labelValor = 'Valor com IVA (€)',
  placeholderNumero = 'Nº da fatura...',
  entryPrefix = 'Fatura',
}: InvoiceHistoryInputProps) => {
  const [novoNumero, setNovoNumero] = useState('');
  const [novoValor, setNovoValor] = useState('');

  const handleAdd = () => {
    if (!novoNumero.trim()) return;
    const valor = parseFormattedNumber(novoValor) || 0;
    onChange([...entries, { numero: novoNumero.trim(), valor }]);
    setNovoNumero('');
    setNovoValor('');
  };

  const handleRemove = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm">
              <span className="font-medium flex-1">{entryPrefix}: {entry.numero}</span>
              <span className="text-muted-foreground">€{formatNumber(entry.valor)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRemove(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new entry */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          {entries.length === 0 && (
            <label className="text-sm font-medium mb-1 block">{labelNumero}</label>
          )}
          <Input
            placeholder={placeholderNumero}
            value={novoNumero}
            onChange={(e) => setNovoNumero(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="flex-1">
          {entries.length === 0 && (
            <label className="text-sm font-medium mb-1 block">{labelValor}</label>
          )}
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={novoValor}
            onChange={(e) => {
              const formatted = formatInputValue(e.target.value);
              setNovoValor(formatted);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={!novoNumero.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
