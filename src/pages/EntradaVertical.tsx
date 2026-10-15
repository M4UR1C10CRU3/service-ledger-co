import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa, resolveLogoEmpresa } from '@/contexts/EmpresaContext';
import type { Empresa } from '@/types/empresa';
import { nomeProduto, type Vertical } from '@/lib/verticais';
import { empresaDoDominio } from '@/lib/host';
import { LISTA_PERFIS } from '@/lib/perfisPortal';
import { ClarizaMark } from '@/components/ClarizaMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import webtechLogo from '@/assets/logo-webtech.png';

/**
 * Entrada própria de um vertical — o "Workspace" de um produto vendido à parte.
 *
 * Um vertical destes não é uma empresa do grupo ao lado da Obrajusta e da Tudo
 * Casa: é um produto com público próprio. Quem vem para aqui não devia ter de
 * passar por uma lista de empresas de outra gente para lá chegar.
 *
 * Este ecrã nasceu para o Clariza School e foi generalizado quando o Agency
 * precisou do mesmo — em vez de o duplicar, que é como duas páginas iguais
 * começam a divergir sem ninguém dar por isso.
 *
 * COMO ESCOLHE A EMPRESA, por ordem:
 *   1. o domínio, quando houver subdomínio próprio (ver `empresaDoDominio`);
 *   2. `?empresa=<slug>`, que é o link individual de hoje;
 *   3. se só houver uma no vertical, é essa;
 *   4. senão, mostra a lista.
 */
export interface EntradaVerticalProps {
  vertical: Vertical;
  /** Imagem de fundo, em `public/assets/workspace/`. Ignorada se houver `fundo`. */
  arte?: string;
  /**
   * Fundo desenhado pelo próprio vertical, em vez de uma imagem. O Labs usa-o
   * para o painel LED da Webtech.
   */
  fundo?: ReactNode;
  /** Marca no canto superior esquerdo. Por omissão, a da Clariza. */
  marca?: ReactNode;
  /** Título grande. Por omissão, «Bem-vindo.». */
  titulo?: string;
  /** Texto pequeno por cima do título. */
  eyebrow: string;
  /** Para onde se segue depois de entrar. */
  destino: string;
  /** Rodapé com o atalho para os portais — só o School os tem. */
  ligacaoPortal?: boolean;
}

/**
 * Esta conta está atribuída a esta empresa?
 *
 * Devolve `false` a qualquer contratempo — erro de rede, RLS, resposta vazia.
 * Numa verificação de acesso, a dúvida tem de contar como "não"; o contrário
 * transforma uma falha momentânea numa porta aberta.
 */
async function temAcesso(authUserId?: string, empresaId?: string): Promise<boolean> {
  if (!authUserId || !empresaId) return false;
  try {
    const { data, error } = await (supabase.from('liberty_utilizador_empresas') as any)
      .select('empresa_id, liberty_utilizadores!inner(auth_user_id, ativo, eliminado)')
      .eq('liberty_utilizadores.auth_user_id', authUserId)
      .eq('empresa_id', empresaId);
    if (error || !data?.length) return false;
    const u = data[0]?.liberty_utilizadores;
    return u?.ativo !== false && u?.eliminado !== true;
  } catch {
    return false;
  }
}

export default function EntradaVertical({
  vertical, arte, fundo, marca, titulo = 'Bem-vindo.', eyebrow, destino, ligacaoPortal = false,
}: EntradaVerticalProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { empresa: empresaGuardada, empresas, isLoading, setEmpresa } = useEmpresa();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aEntrar, setAEntrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Sem sessão, a lista de empresas é a completa; com sessão, é só a de quem
  // entrou. Isso muda o SIGNIFICADO de a lista vir vazia, e portanto muda o
  // que se deve dizer a quem está a olhar — ver o bloco mais abaixo.
  /**
   * Nos verticais com portais (o School), a página é uma ESCOLHA de porta:
   * aluno, instrutor, empresa cliente ou administração. As credenciais só
   * aparecem depois de se escolher a administração — antes estavam sempre à
   * vista, o que dava a entender que aquele era o caminho de toda a gente
   * quando é o caminho de três ou quatro pessoas da escola.
   *
   * Nos verticais sem portais (o Agency) nada disto se aplica: as credenciais
   * aparecem logo, como sempre.
   */
  const [escolhaAdmin, setEscolhaAdmin] = useState(false);
  const mostrarCredenciais = !ligacaoPortal || escolhaAdmin;

  // O ecrã de entrada veste o SEU vertical, mesmo que a última empresa
  // guardada seja de outro. Sem isto, quem esteve no Labs e abre /agency via a
  // entrada da agência com a identidade da Webtech até escolher uma empresa.
  // Repete-se sempre que o EmpresaContext repõe a empresa guardada, porque ele
  // reescreve o tema dessa empresa nesse momento.
  useEffect(() => {
    document.documentElement.setAttribute('data-vertical', vertical);
  }, [vertical, empresas, empresaGuardada]);

  const [comSessao, setComSessao] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setComSessao(Boolean(data.session)));
  }, []);

  const doVertical = empresas.filter(e => e.vertical === vertical);
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null);

  const slugFixado = empresaDoDominio() || searchParams.get('empresa');
  const porSlug = slugFixado ? doVertical.find(e => e.slug === slugFixado) : undefined;

  const empresaAtual: Empresa | null =
    porSlug
    ?? (doVertical.length === 1 ? doVertical[0] : null)
    ?? doVertical.find(e => e.id === escolhidaId)
    ?? null;

  // Selecionar a empresa é o que dispensa o seletor geral.
  useEffect(() => {
    if (empresaAtual) setEmpresa(empresaAtual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaAtual?.id]);

  /**
   * Já com sessão, entra direto — mas só no caminho da administração.
   *
   * Antes entrava sempre. Num vertical com portais isso era um alçapão: um
   * aluno com sessão do portal que abrisse esta página era atirado para a área
   * do ERP, onde o guarda não o encontra em `liberty_utilizadores` e lhe
   * TERMINA a sessão. Ficava de fora sem perceber porquê, e o culpado era esta
   * linha.
   */
  useEffect(() => {
    if (!mostrarCredenciais) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && empresaAtual) navigate(destino, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaAtual?.id, mostrarCredenciais]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setAEntrar(true);
    setErro(null);
    try {
      const { data: sessao, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      // Credenciais certas não são o mesmo que autorização para ESTE ambiente.
      // Sem isto, qualquer conta do grupo entrava aqui — bastava saber o
      // endereço.
      if (!(await temAcesso(sessao?.user?.id, empresaAtual?.id))) {
        await supabase.auth.signOut();
        setErro('Esta conta não tem acesso a este ambiente. O acesso é atribuído pelo administrador.');
        return;
      }

      if (empresaAtual) setEmpresa(empresaAtual);
      navigate(destino, { replace: true });
    } catch (err: any) {
      setErro(err?.message === 'Invalid login credentials'
        ? 'Email ou palavra-passe incorretos.'
        : err?.message ?? 'Não foi possível entrar.');
    } finally {
      setAEntrar(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--entrada-bg))]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/60" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[hsl(var(--entrada-bg))] text-foreground overflow-hidden">

      {/* Arte de fundo, encostada à direita. Mesmas regras do Workspace:
          altura inteira e proporção intacta, porque `object-cover` corta a foto
          em cima e em baixo nos ecrãs largos e baixos.
          `aria-hidden` porque é ambiente, não informação. */}
      {fundo ? (
        // Sem pointer-events-none: o fundo de um vertical pode reagir ao rato
        // (a lanterna do painel LED do Labs). O conteúdo está por cima (z-10).
        <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">{fundo}</div>
      ) : (
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <img src={arte} alt=""
          className="md:hidden h-full w-full object-cover object-[70%_center]" />
        <img src={arte} alt=""
          className="hidden md:block absolute right-0 top-0 h-full w-auto max-w-none"
          style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 14%)',
            maskImage: 'linear-gradient(to right, transparent 0%, #000 14%)',
          }} />
        <div className="absolute inset-0 hidden md:block"
          style={{
            background:
              'linear-gradient(to right,' +
              ' hsl(var(--entrada-bg) / 0.95) 0%,' +
              ' hsl(var(--entrada-bg) / 0.88) 26%,' +
              ' hsl(var(--entrada-bg) / 0.52) 40%,' +
              ' transparent 48%)',
          }} />
        <div className="absolute inset-0 md:hidden bg-gradient-to-b
                        from-[hsl(var(--entrada-bg)/0.55)] via-[hsl(var(--entrada-bg)/0.62)]
                        to-[hsl(var(--entrada-bg)/0.90)]" />
      </div>
      )}

      <div className="relative z-10 flex-1 w-full max-w-[1600px] mx-auto px-6 md:px-14 py-8 flex flex-col">

        <div className="flex items-center gap-2.5 mb-10 md:mb-14">
          {marca ?? (
            <>
              <ClarizaMark />
              <span className="text-[17px] font-bold tracking-tight text-white">Clariza</span>
            </>
          )}
        </div>

        <div className="max-w-[440px]">
          <p className="text-[11px] font-extrabold tracking-[0.16em] text-vertical mb-4">
            {eyebrow}
          </p>
          <h1 className="entrada-titulo text-[38px] md:text-[54px] font-normal tracking-[-0.05em] text-white leading-[1.05] mb-3">
            {titulo}
          </h1>
          <p className="text-[15px] text-muted-foreground mb-8">
            {ligacaoPortal && !mostrarCredenciais
              ? 'Escolha como deseja aceder.'
              : empresaAtual
                ? 'Entre no seu ambiente de trabalho.'
                : 'Escolha o ambiente onde deseja trabalhar.'}
          </p>

          {/* Escolha — só como lista quando há mais do que uma e nenhuma
              foi fixada pelo domínio ou pelo link. */}
          {!empresaAtual && doVertical.length > 1 && (
            <div className="grid grid-cols-1 gap-2.5">
              {doVertical.map(e => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEscolhidaId(e.id)}
                  className="group flex items-center gap-3.5 rounded-[14px] border border-white/10
                             bg-[hsl(var(--entrada-card)/0.92)] backdrop-blur-sm p-4 text-left transition-colors
                             hover:border-vertical-border hover:bg-[hsl(var(--entrada-card-hover))]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vertical"
                >
                  <Identidade empresa={e} />
                  <ArrowRight className="h-4 w-4 shrink-0 text-vertical opacity-70
                                         transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          )}

          {/* Lista vazia. A causa quase nunca é "não há nada configurado" —
              é a conta que está a ver não ter este ambiente atribuído, porque
              com sessão iniciada a lista passa a ser só a dela. Dizer "não há
              ambiente configurado" mandava a pessoa procurar um problema que
              não existe. */}
          {!empresaAtual && doVertical.length === 0 && comSessao !== null && (
            <div className="rounded-[14px] border border-white/10 bg-[hsl(var(--entrada-card)/0.92)]
                            backdrop-blur-sm p-5">
              {comSessao ? (
                <>
                  <p className="text-[13px] text-white font-semibold mb-1">
                    A sua conta não tem acesso a este ambiente.
                  </p>
                  <p className="text-[13px] text-muted-foreground mb-4">
                    O acesso é atribuído individualmente pelo administrador.
                    Se entrou com a conta errada, termine a sessão e volte a entrar.
                  </p>
                  <Button
                    variant="outline"
                    onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
                  >
                    Terminar sessão
                  </Button>
                </>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Ainda não há nenhum ambiente configurado aqui.
                </p>
              )}
            </div>
          )}

          {empresaAtual && mostrarCredenciais && (
            <div className="rounded-[14px] border border-white/10 bg-[hsl(var(--entrada-card)/0.92)]
                            backdrop-blur-sm p-5">

              <div className="flex items-center gap-3.5 pb-4 mb-4 border-b border-white/10">
                <Identidade empresa={empresaAtual} />
                {/* Só se pode trocar quando há de facto escolha — e não quando
                    o ambiente veio fixado pelo domínio ou pelo link. */}
                {doVertical.length > 1 && !porSlug && (
                  <button
                    type="button"
                    onClick={() => setEscolhidaId(null)}
                    className="shrink-0 flex items-center gap-1 text-[12px] text-muted-foreground
                               hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Trocar
                  </button>
                )}
              </div>

              <form onSubmit={entrar} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[12px] text-muted-foreground">Email</Label>
                  <Input id="email" type="email" autoComplete="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="bg-[hsl(var(--entrada-bg))] border-white/10 text-white placeholder:text-muted-foreground/60" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[12px] text-muted-foreground">Palavra-passe</Label>
                  <Input id="password" type="password" autoComplete="current-password" required
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="bg-[hsl(var(--entrada-bg))] border-white/10 text-white" />
                </div>

                {erro && <p className="text-[13px] text-destructive">{erro}</p>}

                <Button type="submit" disabled={aEntrar}
                  className="w-full bg-vertical text-vertical-foreground hover:bg-vertical/90">
                  {aEntrar
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A entrar...</>
                    : <>Entrar<ArrowRight className="h-4 w-4 ml-2" /></>}
                </Button>
              </form>
            </div>
          )}

          {/* Os portais têm porta própria, e à vista.
              Antes eram uma linha de texto com uma ligação só — o formando, o
              instrutor e a empresa cliente caíam todos na mesma página
              genérica. Agora cada um entra pelo seu, com a sua arte. */}
          {/* As quatro portas do School: três portais mais a administração.
              Cada uma leva ao seu ecrã de acesso — o aluno, o instrutor e a
              empresa cliente entram por ligação no email; a administração
              entra com credenciais. */}
          {ligacaoPortal && !escolhaAdmin && (
            <div className="grid grid-cols-1 gap-2.5">
              {LISTA_PERFIS.map(p => (
                <Porta
                  key={p.chave}
                  icone={p.icone}
                  titulo={p.titulo}
                  resumo={p.resumo}
                  onClick={() => navigate(`/portal/entrar/${p.chave}`)}
                />
              ))}
              <Porta
                icone={ShieldCheck}
                titulo="Administração"
                resumo="Secretaria, gestão e direção do ITC"
                onClick={() => setEscolhaAdmin(true)}
              />
            </div>
          )}

          {ligacaoPortal && escolhaAdmin && (
            <button
              type="button"
              onClick={() => setEscolhaAdmin(false)}
              className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground
                         hover:text-white transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" />Ver todas as formas de acesso
            </button>
          )}
        </div>
      </div>

      <footer className="relative z-10 w-full border-t border-white/10 py-4
                         bg-[hsl(var(--entrada-bg)/0.85)] backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-6 md:px-14 flex items-center justify-center gap-5 text-muted-foreground/70 text-[11px]">
          <span>Desenvolvido por</span>
          <img src={webtechLogo} alt="WebtechLabs — Technology Studio" className="h-8 object-contain opacity-70" />
          <span>© {new Date().getFullYear()}. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}

/** Uma das formas de aceder. Mesmo cartão dos ambientes, com ícone em vez de logótipo. */
function Porta({
  icone: Icone, titulo, resumo, onClick,
}: { icone: any; titulo: string; resumo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3.5 rounded-[14px] border border-white/10
                 bg-[hsl(var(--entrada-card)/0.92)] backdrop-blur-sm p-3.5 text-left transition-colors
                 hover:border-vertical-border hover:bg-[hsl(var(--entrada-card-hover))]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vertical"
    >
      <span className="shrink-0 h-9 w-9 rounded-[10px] bg-vertical-soft
                       border border-vertical-border flex items-center justify-center">
        <Icone className="h-4 w-4 text-vertical" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-white truncate">{titulo}</span>
        <span className="block text-[12px] text-muted-foreground truncate">{resumo}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-vertical opacity-70
                             transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

/**
 * Logótipo + nome da empresa.
 *
 * O logótipo é o REAL, vindo de `resolveLogoEmpresa` — o mesmo que já está no
 * Clariza. `object-contain` com margem interior para não perder proporção nem
 * ficar colado às bordas.
 */
function Identidade({ empresa }: { empresa: Empresa }) {
  return (
    <>
      <span className="shrink-0 h-11 w-11 rounded-[10px] bg-vertical-soft
                       border border-vertical-border overflow-hidden
                       flex items-center justify-center">
        <img src={resolveLogoEmpresa(empresa)} alt={empresa.nome}
          className="max-h-full max-w-full object-contain p-1.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-white truncate">{empresa.nome}</span>
        <span className="block text-[12px] text-muted-foreground truncate">
          {nomeProduto(empresa.vertical)}
        </span>
      </span>
    </>
  );
}
