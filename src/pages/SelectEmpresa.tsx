import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmpresa, resolveLogoEmpresa } from '@/contexts/EmpresaContext';
import { supabase } from '@/integrations/supabase/client';
import webtechLogo from '@/assets/logo-webtech.png';

const SelectEmpresa = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { empresas, isLoading, setEmpresa } = useEmpresa();

  // Com sessão aberta, a lista mostra só as empresas de quem entrou. Sem uma
  // saída NESTE ecrã, quem estivesse com a conta errada ficava preso a ver uma
  // empresa só, sem perceber porquê nem como mudar.
  const [sessao, setSessao] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessao(data.user?.email ?? null));
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

  if (slugPedido && !isLoading && empresas.some(e => e.slug === slugPedido)) {
    return null;   // evita o seletor piscar antes de redirecionar
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Bem-vindo</h1>
          <p className="text-slate-400 text-sm">Selecione a empresa para continuar</p>

          {sessao && (
            <p className="text-slate-400 text-xs mt-3">
              A ver as empresas de <span className="text-slate-200">{sessao}</span>.
              {' '}
              <button onClick={terminarSessao} className="text-slate-200 underline underline-offset-2 hover:text-white">
                Terminar sessão
              </button>
              {' '}para escolher outra conta.
            </p>
          )}
        </div>

        {/* Company Cards - compact grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-w-6xl w-full">
          {empresas.map((empresa) => {
            const logo = resolveLogoEmpresa(empresa);
            return (
              <div
                key={empresa.id}
                onClick={() => handleSelectEmpresa(empresa)}
                className="group relative bg-white rounded-xl shadow-lg p-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className="absolute inset-0 rounded-xl border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ borderColor: empresa.corPrimaria }}
                />

                <div className="flex flex-col items-center">
                  <div className="mb-3 flex items-center justify-center" style={{ width: 80, height: 80 }}>
                    <img
                      src={logo}
                      alt={`${empresa.nome} Logo`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-0.5 text-center leading-tight">{empresa.nome}</h3>
                  <p className="text-slate-500 text-[11px] mb-3 text-center leading-tight">{empresa.nomeLegal}</p>

                  <button
                    className="w-full px-3 py-2 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm"
                    style={{ backgroundColor: empresa.corPrimaria }}
                  >
                    Acessar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-slate-500 text-xs mt-6">
          Clariza — Sistema Híbrido de Gestão Empresarial
        </p>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 border-t border-slate-700/50">
        <div className="flex items-center justify-center gap-6 text-slate-400 text-xs">
          <span>Desenvolvido por</span>
          <img src={webtechLogo} alt="WebtechLabs — Technology Studio" className="h-12 object-contain" />
          <span>© {new Date().getFullYear()}. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
};

export default SelectEmpresa;
