import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmpresa, resolveLogoEmpresa } from '@/contexts/EmpresaContext';
import { temEntradaPropria, nomeProduto } from '@/lib/verticais';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { ClarizaMark } from '@/components/ClarizaMark';
import { supabase } from '@/integrations/supabase/client';
import webtechLogo from '@/assets/logo-webtech.png';
import logoTudocasa from '@/assets/logo-tudocasa.png';
import { workspaceDoDominio } from '@/lib/host';

/** Arte do Workspace. Vive em `public/` e é servida sem hash, por isso o nome
 *  muda sempre que a imagem muda — senão os navegadores servem a antiga. */
const ARTE_FUNDO = '/assets/workspace/bg-workspace-hero.png';

/** Marca de cada workspace de grupo (ver `WORKSPACES` em lib/host.ts). O
 *  desenho é o mesmo do Workspace geral; mudam a arte, o logótipo, a cor de
 *  acento (HSL, como as variáveis do tema) e o rodapé. */
const TEMAS_WORKSPACE = {
  'tudo-casa': {
    nome: 'Tudo Casa',
    logo: logoTudocasa,
    arte: '/assets/workspace/bg-workspace-tudocasa.jpg',
    acento: '27 100% 50%',   // o laranja do logótipo, #FF7300
    loja: 'https://www.lojatudocasa.com',
    assinatura: 'Grupo Tudo Casa',
    lema: 'Tudo para a sua casa',
  },
} as const;

const SelectEmpresa = () => {
  const navigate = useNavigate();
  const ws = workspaceDoDominio();
  const tema = ws ? TEMAS_WORKSPACE[ws.marca] : null;
  const arte = tema?.arte ?? ARTE_FUNDO;
  const [searchParams] = useSearchParams();
  const { empresas, isLoading, setEmpresa } = useEmpresa();

  // Com sessão aberta, a lista mostra só as empresas de quem entrou. Sem uma
  // saída NESTE ecrã, quem estivesse com a conta errada ficava preso a ver uma
  // empresa só, sem perceber porquê nem como mudar.
  const [sessao, setSessao] = useState<string | null>(null);
  /** Primeiro nome, só para a saudação. Sai do que já vem no utilizador
   *  autenticado — não se acrescentou consulta nenhuma para isto. */
  const [primeiroNome, setPrimeiroNome] = useState<string>('');
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      setSessao(u?.email ?? null);
      // A ficha primeiro: os metadados da conta guardam o nome de quem a criou
      // e não mudam quando a conta passa para outra pessoa.
      const { data: ficha } = u
        ? await (supabase.from('liberty_utilizadores') as any)
            .select('nome').eq('auth_user_id', u.id).maybeSingle()
        : { data: null };
      const nome = ((ficha?.nome as string) || u?.user_metadata?.nome || u?.user_metadata?.full_name || '') as string;
      const bruto = nome.trim() || (u?.email ?? '').split('@')[0].replace(/[._-]+/g, ' ');
      const primeiro = bruto.split(/\s+/)[0] || '';
      setPrimeiroNome(primeiro ? primeiro.charAt(0).toUpperCase() + primeiro.slice(1) : '');
    });
  }, []);

  const terminarSessao = async () => {
    await supabase.auth.signOut();
    window.location.href = '/empresa';   // recarrega para a lista voltar a ser a completa
  };

  const handleSelectEmpresa = (empresa: typeof empresas[0]) => {
    setEmpresa(empresa);
    navigate('/auth');
  };

  // ?empresa=<slug> salta este ecrã e vai direto ao início de sessão daquela
  // empresa. É assim que um link de demonstração evita mostrar ao visitante a
  // lista de empresas de outra gente — e serve também para dar a cada cliente
  // um endereço direto ao sítio dele.
  const slugPedido = searchParams.get('empresa');
  useEffect(() => {
    if (isLoading || !slugPedido) return;
    const alvo = empresas.find(e => e.slug === slugPedido);
    if (alvo) handleSelectEmpresa(alvo);
    // Slug inválido: deixa cair no seletor normal em vez de dar erro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, slugPedido, empresas]);

  // Escondem-se aqui as empresas cujo vertical tem ENTRADA PRÓPRIA — hoje só
  // o School, que entra por /school. Todas as outras aparecem, tenham ou não
  // vertical atribuído.
  //
  // A condição era antes "tem vertical", o que funcionava enquanto só o ITC
  // tinha um. No dia em que todas as empresas passassem a ter vertical — que
  // é identidade visual, não separação de produto — este ecrã ficaria vazio e
  // ninguém entrava na aplicação.
  const empresasDoGrupo = empresas.filter(e => !temEntradaPropria(e.vertical));
  const doVertical = empresas.find(e => temEntradaPropria(e.vertical));
  useEffect(() => {
    if (isLoading || slugPedido) return;
    if (empresasDoGrupo.length === 0 && doVertical) {
      setEmpresa(doVertical);
      navigate(`/${doVertical.vertical}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, slugPedido, empresasDoGrupo.length, doVertical?.id]);

  if (!isLoading && !slugPedido && empresasDoGrupo.length === 0 && doVertical) {
    return null;   // a redirecionar
  }

  if (slugPedido && !isLoading && empresas.some(e => e.slug === slugPedido)) {
    return null;   // evita o seletor piscar antes de redirecionar
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(240_5%_8%)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/60" />
      </div>
    );
  }

  /* ═══ CLARIZA WORKSPACE ═════════════════════════════════════════════════
     A escolha do ambiente de trabalho, no desenho aprovado.

     Só mudou a apresentação. O `onClick` continua a chamar exatamente o
     mesmo `handleSelectEmpresa`, a lista continua a ser a mesma, e o
     logótipo continua a sair de `resolveLogoEmpresa` — que é a função onde
     vivem os logótipos reais de cada empresa. O protótipo mostra as iniciais
     da empresa; aqui usa-se o logótipo verdadeiro, com `object-contain` e
     margem interior para não perder proporção nem ficar colado às bordas.
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="relative min-h-screen flex flex-col bg-[hsl(240_5%_8%)] text-foreground overflow-hidden"
      /* Num workspace de grupo, o acento (cartões, setas) passa a ser a cor da marca. */
      style={tema ? {
        ['--vertical-accent' as string]: tema.acento,
        ['--vertical-accent-soft' as string]: `${tema.acento} / 0.12`,
        ['--vertical-accent-border' as string]: `${tema.acento} / 0.4`,
      } : undefined}
    >

      {/* Arte de fundo, encostada à direita.
          `aria-hidden` porque é ambiente, não informação. */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">

        {/* Ecrã estreito: a foto preenche, mostrando a zona ambiente à esquerda
            do painel — o grande plano do rosto ficava cortado e a competir com
            o texto. */}
        <img
          src={arte}
          alt=""
          className="md:hidden h-full w-full object-cover object-[58%_center]"
        />

        {/* Ecrã largo: ALTURA INTEIRA, proporção intacta, colada à direita.
            Não leva `object-cover` de propósito. A arte é 1,78:1 e há ecrãs
            bem mais largos do que isso — num 2,5:1 o cover comia perto de 30%
            da altura, e o que desaparecia era exatamente o rosto em cima e a
            mão em baixo. Assim a foto nunca é cortada na vertical: quando o
            ecrã é mais largo do que ela, sobra fundo à esquerda, que é onde o
            texto vive.
            A máscara dissolve os primeiros 14% da imagem, para que a aresta
            esquerda da fotografia não se veja contra esse fundo. */}
        <img
          src={arte}
          alt=""
          className="hidden md:block absolute right-0 top-0 h-full w-auto max-w-none"
          style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 14%)',
            maskImage: 'linear-gradient(to right, transparent 0%, #000 14%)',
          }}
        />

        {/* Ecrã largo: o véu vem da esquerda, onde vive o texto, e sai de cena
            aos 52% — que é onde começa o painel a flutuar. Passar daí seria
            embaciar precisamente o motivo da imagem. */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              'linear-gradient(to right,' +
              ' hsl(240 5% 8% / 0.92) 0%,' +
              ' hsl(240 5% 8% / 0.78) 26%,' +
              ' hsl(240 5% 8% / 0.34) 42%,' +
              ' transparent 52%)',
          }}
        />

        {/* Ecrã estreito: não há lado livre — o texto empilha por cima de tudo.
            Aqui o véu desce de cima para baixo, deixando o rosto à vista no
            topo e fechando por baixo, onde ficam os cartões. */}
        <div className="absolute inset-0 md:hidden bg-gradient-to-b
                        from-[hsl(240_5%_8%/0.45)] via-[hsl(240_5%_8%/0.55)]
                        to-[hsl(240_5%_8%/0.88)]" />
      </div>

      {/* O conteúdo encosta à ESQUERDA e ocupa menos de metade da largura.
          Antes vivia numa caixa de 1100px centrada, o que fazia os cartões da
          coluna da direita aterrarem em cima do painel e do rosto. */}
      <div className="relative z-10 flex-1 w-full max-w-[1600px] mx-auto px-6 md:px-14 py-8 flex flex-col">

        {/* Marca, no canto — como no protótipo */}
        <div className="flex items-center justify-between gap-4 mb-10 md:mb-14">
          <div className="flex items-center gap-4">
            {tema && (
              <>
                <img src={tema.logo} alt={tema.nome} className="h-11 md:h-14 w-auto object-contain" />
                <span className="h-8 w-px bg-white/15" aria-hidden="true" />
              </>
            )}
            <div className="flex items-center gap-2.5">
              <ClarizaMark />
              <span className="text-[17px] font-bold tracking-tight text-white">Clariza</span>
            </div>
          </div>
          {tema && (
            <a
              href={tema.loja}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-[hsl(240_5%_10%/0.75)]
                         backdrop-blur-sm px-3.5 py-2 text-[13px] text-white/90 hover:text-white hover:border-vertical-border"
            >
              Loja online <ArrowUpRight className="h-3.5 w-3.5 text-vertical" />
            </a>
          )}
        </div>

        {/* Coluna estreita: os cartões têm de acabar ANTES do painel a flutuar.
            Medido no browser — a 1350px de largura o painel começa aos 590px e
            duas colunas chegavam aos 669. Daí a coluna única. */}
        <div className="max-w-[440px]">
          <p className={`text-[11px] font-extrabold tracking-[0.16em] mb-4 ${tema ? 'text-vertical' : 'text-clariza-teal'}`}>
            CLARIZA WORKSPACE
            {tema && <><span className="opacity-60">{'  /  '}</span>{tema.nome.toUpperCase()}</>}
          </p>
          <h1 className="text-[38px] md:text-[54px] font-normal tracking-[-0.05em] text-white leading-[1.05] mb-3">
            Bem-vindo{primeiroNome ? `, ${primeiroNome}` : ''}<span className={tema ? 'text-vertical' : undefined}>.</span>
          </h1>
          <p className="text-[15px] text-muted-foreground mb-10">
            Escolha o ambiente onde deseja trabalhar.
          </p>

          {/* Ambientes disponíveis */}
          <div className="grid grid-cols-1 gap-2.5">
            {empresasDoGrupo.map((empresa) => {
              const logo = resolveLogoEmpresa(empresa);
              return (
                <button
                  key={empresa.id}
                  type="button"
                  onClick={() => handleSelectEmpresa(empresa)}
                  data-vertical={empresa.vertical ?? undefined}
                  /* Cartão quase opaco, com desfoque por baixo: os da direita
                     assentam sobre as torres iluminadas e o nome da empresa
                     tem de continuar a ler-se sem esforço. */
                  className="group flex items-center gap-3.5 rounded-[14px] border border-white/10
                             bg-[hsl(240_5%_10%/0.92)] backdrop-blur-sm p-4 text-left transition-colors
                             hover:border-vertical-border hover:bg-[hsl(240_6%_13%)]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vertical"
                >
                  {/* Contentor padronizado — o logótipo do cliente entra aqui
                      inteiro, sem corte e sem distorção. */}
                  <span className="shrink-0 h-11 w-11 rounded-[10px] bg-vertical-soft
                                   border border-vertical-border overflow-hidden
                                   flex items-center justify-center">
                    <img
                      src={logo}
                      alt={empresa.nome}
                      className="max-h-full max-w-full object-contain p-1.5"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-white truncate">
                      {empresa.nome}
                    </span>
                    <span className="block text-[12px] text-muted-foreground truncate">
                      {nomeProduto(empresa.vertical)}
                    </span>
                  </span>

                  <ArrowRight className="h-4 w-4 shrink-0 text-vertical opacity-70
                                         transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>

          {/* Rodapé do bloco */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
            <span className="text-[12px] text-muted-foreground">
              {empresasDoGrupo.length} ambiente{empresasDoGrupo.length === 1 ? '' : 's'} disponíve{empresasDoGrupo.length === 1 ? 'l' : 'is'}
            </span>
            <span className="text-[12px] text-muted-foreground/70">Protegido por Clariza</span>
          </div>

          {sessao && (
            <p className="text-[12px] text-muted-foreground/70 mt-6">
              A ver os ambientes de <span className="text-foreground/80">{sessao}</span>.{' '}
              <button
                onClick={terminarSessao}
                className="text-foreground/80 underline underline-offset-2 hover:text-white"
              >
                Terminar sessão
              </button>{' '}
              para escolher outra conta.
            </p>
          )}
        </div>
      </div>

      {/* Faixa própria: sem ela a assinatura ficava por cima dos rastos de luz
          que chegam ao fundo da imagem. */}
      <footer className="relative z-10 w-full border-t border-white/10 py-4
                         bg-[hsl(240_5%_8%/0.85)] backdrop-blur-sm">
        {tema ? (
          <div className="max-w-[1600px] mx-auto px-6 md:px-14 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-muted-foreground/70 text-[11px]">
            <span>© {new Date().getFullYear()} {tema.assinatura}</span>
            <span className="flex items-center gap-2">
              {tema.lema}
              <span className="text-vertical" aria-hidden="true">·</span>
              <span>Tecnologia <strong className="font-semibold text-white/85">Clariza</strong></span>
            </span>
            <span>Todos os direitos reservados.</span>
          </div>
        ) : (
          <div className="max-w-[1600px] mx-auto px-6 md:px-14 flex items-center justify-center gap-5 text-muted-foreground/70 text-[11px]">
            <span>Desenvolvido por</span>
            <img src={webtechLogo} alt="WebtechLabs — Technology Studio" className="h-8 object-contain opacity-70" />
            <span>© {new Date().getFullYear()}. Todos os direitos reservados.</span>
          </div>
        )}
      </footer>
    </div>
  );
};

export default SelectEmpresa;
