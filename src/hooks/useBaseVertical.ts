import { useLocation } from 'react-router-dom';

/**
 * Prefixo das rotas do vertical onde se está: '/labs' ou '/agency'.
 *
 * As páginas de Projetos, Jobs, Propostas e Avenças são as MESMAS nos dois
 * verticais — o Clariza Labs é o motor do Agency com mais núcleos por cima. Para
 * uma página não mandar quem está no Labs de volta para /agency (onde a guarda
 * não o deixa entrar), os links internos pedem o prefixo aqui em vez de o
 * escreverem à mão.
 */
export function useBaseVertical(): '/labs' | '/agency' {
  const { pathname } = useLocation();
  return pathname === '/labs' || pathname.startsWith('/labs/') ? '/labs' : '/agency';
}
