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