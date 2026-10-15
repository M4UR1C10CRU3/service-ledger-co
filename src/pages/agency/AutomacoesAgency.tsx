import { useNavigate } from 'react-router-dom';
import { useBaseVertical } from '@/hooks/useBaseVertical';
import { useJobEtapas } from '@/hooks/useJobs';
import AutomacoesPainel from '@/components/automacoes/AutomacoesPainel';

/**
 * As automações das etapas de Job. Mesmo motor e mesmo ecrã dos Quadros — a
 * diferença é que valem para a agência inteira, não para um quadro específico.
 */
export default function AutomacoesAgency() {
  const navigate = useNavigate();
  const { etapas } = useJobEtapas();
  const base = useBaseVertical();

  return (
    <AutomacoesPainel
      contexto="agency_job"
      titulo="Automações dos Jobs"
      subtitulo="O que acontece sozinho quando um job muda de etapa."
      colunas={etapas.map(e => ({ id: e.id, nome: e.nome, estadoCodigo: e.estadoCodigo ?? null }))}
      voltarLabel="Voltar aos projetos"
      onVoltar={() => navigate(`${base}/projetos`)}
      vazioSemProcesso={
        'As etapas dos jobs ainda não estão criadas. Abra um projeto e crie as etapas iniciais — '
        + 'as automações reagem à entrada e saída delas.'
      }
    />
  );
}
