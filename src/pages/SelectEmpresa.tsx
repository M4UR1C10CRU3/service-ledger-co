import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { Card, CardContent } from '@/components/ui/card';
import logoObrajusta from '@/assets/logo-obrajusta.png';
import logoTudocasa from '@/assets/logo-tudocasa.png';

const logoMap: Record<string, string> = {
  obrajusta: logoObrajusta,
  tudocasa: logoTudocasa,
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-3">Bem-vindo</h1>
        <p className="text-slate-300 text-lg">Selecione a empresa para continuar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {empresas.map((empresa) => (
          <Card
            key={empresa.id}
            onClick={() => handleSelectEmpresa(empresa)}
            className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20"
          >
            <CardContent className="flex flex-col items-center justify-center p-12">
              <div 
                className="w-48 h-48 mb-6 flex items-center justify-center rounded-2xl p-4 transition-all duration-300 group-hover:shadow-lg bg-white"
                style={{ 
                  boxShadow: `0 4px 20px ${empresa.corPrimaria}40`
                }}
              >
                <img
                  src={logoMap[empresa.slug] || logoObrajusta}
                  alt={`${empresa.nome} Logo`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{empresa.nome}</h2>
              <p className="text-slate-400 text-sm">{empresa.nomeLegal}</p>
              
              <div 
                className="mt-6 px-6 py-2 rounded-full text-white font-medium transition-all duration-300 group-hover:scale-110"
                style={{ backgroundColor: empresa.corPrimaria }}
              >
                Entrar
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-slate-500 text-sm mt-12">
        Sistema de Gestão Multi-Empresa
      </p>
    </div>
  );
};

export default SelectEmpresa;
