/**
 * Símbolo da Clariza — três barras ascendentes.
 *
 * Reconstruído em CSS a partir das medidas do protótipo. Serve os ecrãs de
 * ENTRADA (Workspace e Clariza School), onde ainda não há empresa escolhida e
 * portanto não há logótipo de cliente para mostrar. Assim que se entra, quem
 * manda é o logótipo real da empresa, vindo de `resolveLogoEmpresa`.
 *
 * As cores e as proporções são as oficiais; não é um ícone genérico nem uma
 * reinterpretação.
 */
export function ClarizaMark({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-end gap-[3px] h-[22px] ${className}`} aria-hidden="true">
      <span className="w-[6px] h-[9px] rounded-[2px] bg-clariza-teal" />
      <span className="w-[6px] h-[15px] rounded-[2px] bg-clariza-purple" />
      <span
        className="w-[6px] h-[22px] rounded-[2px]"
        style={{ background: 'linear-gradient(hsl(var(--clariza-orange)), hsl(var(--clariza-coral)))' }}
      />
    </span>
  );
}

export default ClarizaMark;
