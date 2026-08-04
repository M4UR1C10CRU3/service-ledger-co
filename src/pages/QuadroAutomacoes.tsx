import { useParams, useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useQuadroDetail } from '@/hooks/useQuadroDetail';
import AutomacoesPainel from '@/components/automacoes/AutomacoesPainel';

/** As automações de um quadro. O ecrã é o mesmo do Agency — só muda o alvo. */
export default function QuadroAutomacoes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const d = useQuadroDetail(id, empresa?.id);

  return (
    <AutomacoesPainel
      contexto="quadro"
      quadroId={id}
      titulo="Automações"
      subtitulo={`${d.quadro?.nome ? `Quadro "${d.quadro.nome}". ` : ''}O que acontece sozinho quando um cartão muda de coluna.`}
      colunas={d.listas.map(l => ({ id: l.id, nome: l.nome, estadoCodigo: l.estado_codigo ?? null }))}
      voltarLabel="Voltar ao quadro"
      onVoltar={() => navigate(`/quadros/${id}`)}
      vazioSemProcesso={
        'Este quadro não tem processo. As automações reagem à entrada e saída de colunas de um '
        + 'processo — num quadro livre não há estados a que reagir. Crie um quadro a partir de um '
        + 'modelo para as poder usar.'
      }
    />
  );
}
