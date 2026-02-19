import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/contexts/EmpresaContext';
import logoObrajusta from '@/assets/logo-obrajusta.png';
import logoTudocasa from '@/assets/logo-tudocasa.png';
import logoResiserv from '@/assets/logo-resiserv.jpg';

const logoMap: Record<string, string> = {
  obrajusta: logoObrajusta,
  'obrajusta-gestao': logoObrajusta,
  tudocasa: logoTudocasa,
  'tudocasa-matrizcharme': logoTudocasa,
  resiserv: logoResiserv,
};

const SelectEmpresa = () => {
  const navigate = useNavigate();
  const { empresas, isLoading, setEmpresa } = useEmpresa();

  const handleSelectEmpresa = (empresa: typeof empresas[0]) => {
    setEmpresa(empresa);
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Bem-vindo</h1>
        <p className="text-slate-400 text-sm">Selecione a empresa para continuar</p>
      </div>

      {/* Company Cards - compact grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-w-6xl w-full">
        {empresas.map((empresa) => {
          const logo = logoMap[empresa.slug] || logoObrajusta;
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
                <div className="w-16 h-16 mb-3 rounded-xl overflow-hidden bg-slate-50 p-2 flex items-center justify-center">
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

      <p className="text-slate-600 text-xs mt-6">
        Sistema de Gestão Multi-Empresa
      </p>
    </div>
  );
};

export default SelectEmpresa;
