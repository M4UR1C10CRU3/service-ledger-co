import EntradaVertical from '@/pages/EntradaVertical';

/**
 * Entrada do Clariza School.
 *
 * O ecrã em si vive em `EntradaVertical`, partilhado com o Agency. Aqui fica só
 * o que é do School: a arte, o texto e o destino depois de entrar.
 *
 * A arte é própria do vertical — formandos em EPI numa sala de treino.
 */
export default function SchoolLogin() {
  return (
    <EntradaVertical
      vertical="school"
      arte="/assets/workspace/bg-school-itc.png"
      eyebrow="CLARIZA SCHOOL"
      destino="/school/turmas"
      /* Formandos, instrutores e empresas clientes entram por /portal, que não
         usa palavra-passe. É o único vertical com portais. */
      ligacaoPortal
    />
  );
}
