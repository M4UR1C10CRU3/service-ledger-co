import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClarizaMark } from '@/components/ClarizaMark';
import { LISTA_PERFIS, PERFIS_PORTAL, perfilValido } from '@/lib/perfisPortal';
import { Loader2, MailCheck, ArrowLeft } from 'lucide-react';
import webtechLogo from '@/assets/logo-webtech.png';

/**
 * Entrada no portal por ligação enviada para o email.
 *
 * Sem palavra-passe de propósito. Numa escola com formandos que entram uma ou
 * duas vezes por ano, palavras-passe são esquecidas, reutilizadas e acabam num
 * pedido de reposição por telefone. Aqui a prova de identidade é a posse da
 * caixa de correio, que é exactamente a mesma prova que uma reposição de
 * palavra-passe usaria — sem o passo do meio nem o segredo a guardar.
 *
 * Quem não tiver ficha entra, mas não vê dados nenhuns: a associação é feita
 * pelo email já registado na ficha, e as regras da base de dados só deixam
 * chegar às linhas dessa pessoa.
 *
 * Com `/portal/entrar/:perfil` a página veste-se do perfil escolhido. Isso é
 * apresentação e preferência de destino — não é permissão; ver `perfisPortal`.
 */
export default function PortalLogin() {
  const { perfil: perfilParam } = useParams();
  const perfil = perfilValido(perfilParam);
  const def = perfil ? PERFIS_PORTAL[perfil] : null;

  const [email, setEmail] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const navigate = useNavigate();

  // Já com sessão, não faz sentido pedir o email outra vez.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/portal', { replace: true });
    });
  }, [navigate]);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    const endereco = email.trim().toLowerCase();
    if (!endereco) return;

    setAEnviar(true);
    setErro(null);
    try {
      // O perfil segue no destino para a entrada saber qual preferir em quem
      // tenha mais do que um papel.
      const destino = perfil
        ? `${window.location.origin}/portal?perfil=${perfil}`
        : `${window.location.origin}/portal`;
      const { error } = await supabase.auth.signInWithOtp({
        email: endereco,
        options: { emailRedirectTo: destino },
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err: any) {
      setErro(err?.message ?? 'Não foi possível enviar a ligação.');
    } finally {
      setAEnviar(false);
    }
  };

  const arte = def?.arte ?? '/assets/workspace/bg-school-itc.png';

  return (
    <div className="relative min-h-screen flex flex-col bg-[hsl(240_5%_8%)] text-foreground overflow-hidden">

      {/* Arte do perfil, encostada à direita. Altura inteira e proporção
          intacta — `object-cover` cortaria as pessoas em cima e em baixo nos
          ecrãs largos e baixos. `aria-hidden` porque é ambiente. */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <img src={arte} alt="" className="md:hidden h-full w-full object-cover object-[70%_center]" />
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
              ' hsl(240 5% 8% / 0.95) 0%,' +
              ' hsl(240 5% 8% / 0.88) 26%,' +
              ' hsl(240 5% 8% / 0.52) 40%,' +
              ' transparent 48%)',
          }} />
        <div className="absolute inset-0 md:hidden bg-gradient-to-b
                        from-[hsl(240_5%_8%/0.55)] via-[hsl(240_5%_8%/0.62)]
                        to-[hsl(240_5%_8%/0.90)]" />
      </div>

      <div className="relative z-10 flex-1 w-full max-w-[1600px] mx-auto px-6 md:px-14 py-8 flex flex-col">

        <div className="flex items-center gap-2.5 mb-10 md:mb-14">
          <ClarizaMark />
          <span className="text-[17px] font-bold tracking-tight text-white">Clariza</span>
        </div>

        <div className="max-w-[440px]">
          <p className="text-[11px] font-extrabold tracking-[0.16em] text-vertical mb-4">
            CLARIZA SCHOOL · ITC
          </p>
          <h1 className="text-[32px] md:text-[46px] font-normal tracking-[-0.04em] text-white leading-[1.06] mb-3">
            {def ? def.titulo : 'Portais'}
          </h1>
          <p className="text-[15px] text-muted-foreground mb-8">
            {def ? def.descricao : 'Entre com o email registado na sua ficha.'}
          </p>

          <div className="rounded-[14px] border border-white/10 bg-[hsl(240_5%_10%/0.92)]
                          backdrop-blur-sm p-5">
            {enviado ? (
              <div className="text-center space-y-3 py-2">
                <MailCheck className="h-10 w-10 text-green-400 mx-auto" />
                <h2 className="font-semibold text-white">Verifique o seu email</h2>
                <p className="text-[13px] text-muted-foreground">
                  Enviámos uma ligação de entrada para{' '}
                  <strong className="text-foreground/90">{email}</strong>.
                  Abra-a neste dispositivo para entrar.
                </p>
                <Button variant="ghost" onClick={() => { setEnviado(false); setEmail(''); }}>
                  Usar outro email
                </Button>
              </div>
            ) : (
              <form onSubmit={submeter} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[12px] text-muted-foreground">Email</Label>
                  <Input id="email" type="email" autoComplete="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="o.seu.email@exemplo.com"
                    className="bg-[hsl(240_5%_8%)] border-white/10 text-white placeholder:text-muted-foreground/60" />
                </div>

                {erro && <p className="text-[13px] text-destructive">{erro}</p>}

                <Button type="submit" disabled={aEnviar}
                  className="w-full bg-vertical text-white hover:bg-vertical/90">
                  {aEnviar
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A enviar...</>
                    : 'Receber ligação de entrada'}
                </Button>

                <p className="text-[12px] text-muted-foreground/80 text-center">
                  Não é preciso palavra-passe. A ligação é válida por pouco tempo
                  e só funciona uma vez. Use o email registado na sua ficha.
                </p>
              </form>
            )}
          </div>

          {/* Enganou-se de porta. Não se escondem as outras — o email é que
              decide o que a pessoa vê, portanto não há nada a proteger aqui. */}
          <div className="flex flex-wrap items-center gap-3 mt-6 text-[12px]">
            {LISTA_PERFIS.filter(p => p.chave !== perfil).map(p => (
              <button key={p.chave} type="button"
                onClick={() => navigate(`/portal/entrar/${p.chave}`)}
                className="inline-flex items-center gap-1.5 text-muted-foreground
                           hover:text-white transition-colors">
                <p.icone className="h-3.5 w-3.5" />
                {p.titulo}
              </button>
            ))}
            <button type="button" onClick={() => navigate('/school')}
              className="inline-flex items-center gap-1.5 text-muted-foreground/70 hover:text-white transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />Voltar
            </button>
          </div>
        </div>
      </div>

      <footer className="relative z-10 w-full border-t border-white/10 py-4
                         bg-[hsl(240_5%_8%/0.85)] backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-6 md:px-14 flex items-center justify-center gap-5 text-muted-foreground/70 text-[11px]">
          <span>Desenvolvido por</span>
          <img src={webtechLogo} alt="WebtechLabs — Technology Studio" className="h-8 object-contain opacity-70" />
          <span>© {new Date().getFullYear()}. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
