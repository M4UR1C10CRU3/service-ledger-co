import { BookOpen, GraduationCap, Building2 } from 'lucide-react';

/**
 * As artes entram por IMPORTAÇÃO, não por caminho em `public/`.
 *
 * A diferença não é de estilo. Um ficheiro em `public/` é servido com o nome
 * que tem, e o nginx destes domínios manda guardá-lo por um ano como
 * `immutable` — trocar a imagem mantendo o nome não chega ao ecrã de ninguém,
 * nem com Ctrl+F5. Importada, o Vite junta-lhe uma impressão digital do
 * conteúdo: muda a imagem, muda o nome do ficheiro, e o navegador vai buscar
 * a nova sem que seja preciso pensar nisso.
 */
import arteAluno from '@/assets/portal/aluno.png';
import arteInstrutor from '@/assets/portal/instrutor.png';
import arteCorporativo from '@/assets/portal/corporativo.png';

/**
 * Os três perfis que entram pelos portais do Clariza School.
 *
 * Cada um tem a sua página de acesso, com a sua arte e o seu texto. A entrada
 * é a mesma para todos — ligação enviada ao email, sem palavra-passe — mas
 * quem chega vê o sítio dele e não uma porta genérica.
 *
 * ATENÇÃO ao que o perfil escolhido faz e não faz: é uma PREFERÊNCIA, não uma
 * permissão. Quem escolher "Aluno" e só tiver ficha de instrutor entra no
 * portal do instrutor. Quem for as duas coisas entra no que escolheu e troca no
 * cabeçalho. Quem não tiver ficha nenhuma entra e não vê dados — a associação
 * é feita pelo email registado na ficha, e as regras da base de dados fazem o
 * resto. O ecrã de acesso não promete o contrário.
 */
export type PerfilPortal = 'aluno' | 'instrutor' | 'corporativo';

export interface DefinicaoPerfil {
  chave: PerfilPortal;
  titulo: string;
  /** Frase curta na página de acesso. */
  descricao: string;
  /** Frase ainda mais curta, para o botão na entrada do School. */
  resumo: string;
  arte: string;
  icone: typeof BookOpen;
}

export const PERFIS_PORTAL: Record<PerfilPortal, DefinicaoPerfil> = {
  aluno: {
    chave: 'aluno',
    titulo: 'Portal do Aluno',
    descricao: 'Os seus cursos, presenças, notas, materiais e certificados.',
    resumo: 'Cursos, notas e certificados',
    arte: arteAluno,
    icone: BookOpen,
  },
  instrutor: {
    chave: 'instrutor',
    titulo: 'Portal do Instrutor',
    descricao: 'As suas turmas, agenda, chamada, notas e materiais de apoio.',
    resumo: 'Turmas, chamada e materiais',
    arte: arteInstrutor,
    icone: GraduationCap,
  },
  corporativo: {
    chave: 'corporativo',
    titulo: 'Portal Corporativo',
    descricao: 'A formação da sua equipa, contratos, calendarização e validades.',
    resumo: 'Formação da sua equipa',
    arte: arteCorporativo,
    icone: Building2,
  },
};

export const LISTA_PERFIS = [
  PERFIS_PORTAL.aluno,
  PERFIS_PORTAL.instrutor,
  PERFIS_PORTAL.corporativo,
];

export const perfilValido = (v?: string | null): PerfilPortal | null =>
  v && v in PERFIS_PORTAL ? (v as PerfilPortal) : null;
