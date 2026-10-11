import { useEffect } from 'react';
import EntradaVertical from '@/pages/EntradaVertical';
import { PainelLed } from '@/components/labs/PainelLed';
import { ativarTemaLabs } from '@/lib/labsTema';

/**
 * Entrada do Clariza Labs — a porta da equipa da Webtech Labs.
 *
 * A lógica é a mesma de todos os verticais com entrada própria (EntradaVertical:
 * escolha da empresa, credenciais, verificação de acesso). O que muda é a cara:
 * em vez de uma fotografia, o painel LED do site — o símbolo power em pontos,
 * 0 azul e 1 amarelo — e a marca da Webtech no canto.
 *
 * O tema liga-se logo ao abrir, antes de haver empresa escolhida, para a
 * página não piscar primeiro com as cores da Clariza.
 */
export default function LabsLogin() {
  useEffect(() => { ativarTemaLabs(); }, []);

  return (
    <EntradaVertical
      vertical="labs"
      eyebrow="CLARIZA LABS · PT ⇄ BR"
      titulo="Entra no Labs."
      destino="/labs/painel"
      marca={
        <img src="/assets/labs/logo-webtech-labs.png" alt="Webtech Labs" className="h-8 w-auto" />
      }
      fundo={
        <>
          <div className="absolute right-[-4vw] top-1/2 -translate-y-1/2 w-[min(58vw,860px)] hidden md:block">
            <PainelLed />
          </div>
          <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-[120vw] opacity-40 md:hidden">
            <PainelLed n={25} />
          </div>
        </>
      }
    />
  );
}
