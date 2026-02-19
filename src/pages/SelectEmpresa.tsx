import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/contexts/EmpresaContext';
import logoObrajusta from '@/assets/logo-obrajusta.png';
import logoTudocasa from '@/assets/logo-tudocasa.png';
import logoResiserv from '@/assets/logo-resiserv.jpg';

const logoMap: Record<string, string> = {
  obrajusta: logoObrajusta,
  'obrajusta-gestao': logoObrajusta,
  tudocasa: logoTudocasa,
  'tudocasa-matrizchamer': logoTudocasa,
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">Bem-vindo</h1>
        <p className="text-slate-400 text-lg">Selecione a empresa para continuar</p>
      </div>

      {/* Company Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {empresas.map((empresa) => {
          const logo = logoMap[empresa.slug] || logoObrajusta;
          return (
            <div
              key={empresa.id}
              onClick={() => handleSelectEmpresa(empresa)}
              className="group relative bg-white rounded-2xl shadow-xl p-8 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              {/* Hover border overlay */}
              <div
                className="absolute inset-0 rounded-2xl border-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ borderColor: empresa.corPrimaria }}
              />

              <div className="flex flex-col items-center">
                {/* Logo */}
                <div className="w-28 h-28 mb-6 rounded-2xl overflow-hidden bg-slate-50 p-4 flex items-center justify-center">
                  <img
                    src={logo}
                    alt={`${empresa.nome} Logo`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                {/* Name */}
                <h3 className="text-2xl font-bold text-slate-900 mb-1">{empresa.nome}</h3>
                <p className="text-slate-500 text-sm mb-6">{empresa.nomeLegal}</p>

                {/* Stats placeholder - brief info */}
                <div className="w-full space-y-2 mb-6 text-sm">
                  <div className="flex justify-between text-slate-500 border-b border-slate-100 pb-2">
                    <span>Gestão integrada</span>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  className="w-full px-6 py-3 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-base"
                  style={{ backgroundColor: empresa.corPrimaria }}
                >
                  Acessar Sistema
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-slate-600 text-sm mt-14">
        Sistema de Gestão Multi-Empresa
      </p>
    </div>
  );
};

export default SelectEmpresa;
