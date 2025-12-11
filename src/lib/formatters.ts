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
 * Mantém apenas números e vírgula
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
  
  // Adiciona separadores de milhar na parte inteira
  if (parts[0].length > 3) {
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    cleaned = parts.length > 1 ? intPart + ',' + parts[1] : intPart;
  }
  
  return cleaned;
};
