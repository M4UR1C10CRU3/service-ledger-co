import EntradaVertical from '@/pages/EntradaVertical';

/**
 * Entrada do Clariza Agency.
 *
 * Há duas agências — o Elo Giro e a Agência Demo — e cada uma há de ter o seu
 * ambiente próprio. Enquanto os subdomínios não existem, o link individual é
 * `/agency?empresa=elo-giro` e `/agency?empresa=demo-agencia`; sem parâmetro,
 * este ecrã mostra as duas para escolher. Quando os subdomínios chegarem, basta
 * acrescentá-los ao mapa em `lib/host.ts` e cada um passa a cair direto no seu.
 *
 * A arte é própria do vertical — equipa criativa a trabalhar sobre painéis de
 * campanha e material de vídeo.
 */
export default function AgencyLogin() {
  return (
    <EntradaVertical
      vertical="agency"
      arte="/assets/workspace/bg-agency.png"
      eyebrow="CLARIZA AGENCY"
      destino="/agency/projetos"
    />
  );
}
