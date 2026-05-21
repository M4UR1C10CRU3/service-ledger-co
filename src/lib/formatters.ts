/**
 * Formata um valor numérico para moeda EUR no padrão europeu
 * Exemplo: 25000 -> €25.000,00
 */
export const formatEUR = (value: number): string => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formata um percentual no padrão português
 * Exemplo: 45.5 -> 45,5%
 */
export const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

/**
 * Formata um número com separadores de milhar e vírgula para decimais (padrão PT)
 * Exemplo: 1107.5 -> "1.107,50"
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Parse de string formatada para número
 * Exemplo: "1.107,50" -> 1107.5
 */
export const parseFormattedNumber = (value: string): number => {
  // Remove pontos de milhar e substitui vírgula por ponto
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

/**
 * Formata o valor enquanto o usuário digita
 * Mantém apenas números e vírgula - SEM formatação de milhar para evitar cursor jumping
 */
export const formatInputValue = (value: string): string => {
  // Remove tudo exceto números e vírgula
  let cleaned = value.replace(/[^\d,]/g, '');
  
  // Garante apenas uma vírgula
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts.slice(1).join('');
  }
  
  // Limita a 2 casas decimais
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + ',' + parts[1].slice(0, 2);
  }
  
  return cleaned;
};

/**
 * Converte data ISO (YYYY-MM-DD) para formato PT (DD/MM/YYYY)
 */
export const formatDatePT = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  if (dateStr.includes('/')) return dateStr;
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
};

/**
 * Converte data PT (DD/MM/YYYY) para ISO (YYYY-MM-DD)
 */
export const parseDatePT = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  if (!dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

/**
 * Verifica se uma string é data válida em DD/MM/YYYY
 */
export const isValidDatePT = (dateStr: string): boolean =>
  /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr);
