import { useState, useMemo, useEffect } from 'react';
import { Service, ServiceWithCalculations, DashboardMetrics, Liquidacao } from '@/types/service';
import { supabase } from '@/integrations/supabase/client';

// Sample data based on the user's example
const initialServices: Service[] = [
  {
    id: '1',
    data: '01/09/2025',
    servico: 'Consultoria Financeira',
    cliente: 'Cliente A',
    resumo: 'Revisão fiscal anual',
    proposta: 'P-101',
    fatura: 'F-2001',
    valorComIVA: 2000.00,
    valorSemIVA: 1626.02,
    liquidado: 2000.00,
    aRealizar: false,
    createdAt: new Date('2025-09-01'),
  },
  {
    id: '2',
    data: '05/09/2025',
    servico: 'Apoio Contabilístico',
    cliente: 'Cliente B',
    resumo: 'Balancete mensal',
    proposta: 'P-102',
    fatura: 'F-2002',
    valorComIVA: 1500.00,
    valorSemIVA: 1219.51,
    liquidado: 1000.00,
    aRealizar: false,
    createdAt: new Date('2025-09-05'),
  },
  {
    id: '3',
    data: '10/09/2025',
    servico: 'Auditoria Interna',
    cliente: 'Cliente C',
    resumo: 'Auditoria trimestral',
    proposta: 'P-103',
    fatura: '',
    valorComIVA: 3000.00,
    valorSemIVA: 2439.02,
    liquidado: 0.00,
    aRealizar: true,
    createdAt: new Date('2025-09-10'),
  },
  {
    id: '4',
    data: '12/09/2025',
    servico: 'Limpeza Pós-Obra',
    cliente: 'Cliente D',
    resumo: 'Conclusão edifício',
    proposta: 'P-104',
    fatura: 'F-2003',
    valorComIVA: 4000.00,
    valorSemIVA: 3252.03,
    liquidado: 2000.00,
    aRealizar: false,
    createdAt: new Date('2025-09-12'),
  },
  {
    id: '5',
    data: '15/09/2025',
    servico: 'Formação Equipa',
    cliente: 'Cliente E',
    resumo: 'Workshop fiscal',
    proposta: 'P-105',
    fatura: 'F-2004',
    valorComIVA: 1200.00,
    valorSemIVA: 975.61,
    liquidado: 0.00,
    aRealizar: false,
    createdAt: new Date('2025-09-15'),
  },
];

// Helper functions for database operations
const saveServiceToDatabase = async (service: Service) => {
  try {
    const { error } = await supabase
      .from('services')
      .upsert({
        service_id: service.id,
        data: service.data,
        servico: service.servico,
        cliente: service.cliente,
        resumo: service.resumo,
        proposta: service.proposta,
        fatura: service.fatura,
        valor_com_iva: service.valorComIVA,
        valor_sem_iva: service.valorSemIVA,
        liquidado: service.liquidado,
        a_realizar: service.aRealizar,
        created_at: service.createdAt.toISOString(),
      });
    
    if (error) {
      console.error('Error saving service to database:', error);
    }
  } catch (error) {
    console.error('Error saving service to database:', error);
  }
};

const loadLiquidacoesFromDatabase = async (serviceId: string): Promise<Liquidacao[]> => {
  try {
    const { data, error } = await supabase
      .from('liquidacoes')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading liquidacoes from database:', error);
      return [];
    }
    
    return data?.map(row => ({
      id: row.id,
      serviceId: row.service_id,
      valor: parseFloat(row.valor.toString()),
      dataPagamento: row.data_pagamento,
      observacoes: row.observacoes || undefined,
      createdAt: new Date(row.created_at),
    })) || [];
  } catch (error) {
    console.error('Error loading liquidacoes from database:', error);
    return [];
  }
};

const saveLiquidacaoToDatabase = async (liquidacao: Liquidacao) => {
  try {
    const { error } = await supabase
      .from('liquidacoes')
      .upsert({
        id: liquidacao.id,
        service_id: liquidacao.serviceId,
        valor: liquidacao.valor,
        data_pagamento: liquidacao.dataPagamento,
        observacoes: liquidacao.observacoes,
        created_at: liquidacao.createdAt.toISOString(),
      });
    
    if (error) {
      console.error('Error saving liquidacao to database:', error);
    }
  } catch (error) {
    console.error('Error saving liquidacao to database:', error);
  }
};

const loadServicesFromDatabase = async (): Promise<Service[]> => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading services from database:', error);
      return initialServices;
    }
    
    return data?.map(row => ({
      id: row.service_id,
      data: row.data,
      servico: row.servico,
      cliente: row.cliente,
      resumo: row.resumo || '',
      proposta: row.proposta || '',
      fatura: row.fatura || '',
      valorComIVA: parseFloat(row.valor_com_iva.toString()),
      valorSemIVA: parseFloat(row.valor_sem_iva.toString()),
      liquidado: parseFloat(row.liquidado.toString()),
      aRealizar: row.a_realizar,
      createdAt: new Date(row.created_at),
    })) || initialServices;
  } catch (error) {
    console.error('Error loading services from database:', error);
    return initialServices;
  }
};

export const useServices = () => {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [liquidacoes, setLiquidacoes] = useState<Record<string, Liquidacao[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load services from database on mount
  useEffect(() => {
    const loadServices = async () => {
      setIsLoading(true);
      const servicesFromDb = await loadServicesFromDatabase();
      setServices(servicesFromDb);
      
      // Load liquidacoes for each service
      const allLiquidacoes: Record<string, Liquidacao[]> = {};
      for (const service of servicesFromDb) {
        const serviceLiquidacoes = await loadLiquidacoesFromDatabase(service.id);
        allLiquidacoes[service.id] = serviceLiquidacoes;
      }
      setLiquidacoes(allLiquidacoes);
      setIsLoading(false);
    };

    loadServices();
  }, []);

  const calculateServiceMetrics = (service: Service): ServiceWithCalculations => {
    const serviceLiquidacoes = liquidacoes[service.id] || [];
    const liquidadoCalculated = serviceLiquidacoes.reduce((total, liq) => total + liq.valor, 0);
    
    const executadoEmDebito = service.valorComIVA - liquidadoCalculated;
    const percentualLiquidado = service.valorComIVA > 0 ? (liquidadoCalculated / service.valorComIVA) * 100 : 0;
    
    // Calculate days overdue if invoice exists and not fully paid
    let diasEmAtraso = 0;
    if (service.fatura && executadoEmDebito > 0) {
      const [day, month, year] = service.data.split('/').map(Number);
      const serviceDate = new Date(year, month - 1, day);
      const today = new Date();
      const diffTime = today.getTime() - serviceDate.getTime();
      diasEmAtraso = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }

    return {
      ...service,
      liquidado: liquidadoCalculated,
      executadoEmDebito,
      diasEmAtraso,
      percentualLiquidado,
      liquidacoes: serviceLiquidacoes,
    };
  };

  const servicesWithCalculations = useMemo(() => {
    return services.map(calculateServiceMetrics);
  }, [services]);

  const dashboardMetrics = useMemo((): DashboardMetrics => {
    const servicesWithCalc = servicesWithCalculations;
    const faturados = servicesWithCalc.filter(s => s.fatura);
    const naoFaturados = services.filter(s => !s.fatura);
    
    const totalFaturado = faturados.reduce((sum, s) => sum + s.valorComIVA, 0);
    const totalLiquidado = faturados.reduce((sum, s) => sum + s.liquidado, 0);
    const totalEmDebito = totalFaturado - totalLiquidado;
    const percentualLiquidado = totalFaturado > 0 ? (totalLiquidado / totalFaturado) * 100 : 0;
    const totalNaoFaturado = naoFaturados.reduce((sum, s) => sum + s.valorComIVA, 0);
    
    const servicosEmAtraso = servicesWithCalc.filter(s => s.diasEmAtraso > 0).length;

    return {
      totalFaturado,
      totalLiquidado,
      totalEmDebito,
      percentualLiquidado,
      totalNaoFaturado,
      servicosEmAtraso,
    };
  }, [services, servicesWithCalculations]);

  const addService = async (service: Omit<Service, 'id' | 'createdAt'>, liquidacoes?: Omit<Liquidacao, 'id' | 'createdAt' | 'serviceId'>[]) => {
    const newService: Service = {
      ...service,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setServices(prev => [...prev, newService]);
    await saveServiceToDatabase(newService);
    
    // Adicionar liquidações se fornecidas
    if (liquidacoes && liquidacoes.length > 0) {
      for (const liquidacao of liquidacoes) {
        await addLiquidacao({
          serviceId: newService.id,
          valor: liquidacao.valor,
          dataPagamento: liquidacao.dataPagamento,
          observacoes: liquidacao.observacoes
        });
      }
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    setServices(prev => prev.map(service => {
      if (service.id === id) {
        const updatedService = { ...service, ...updates };
        saveServiceToDatabase(updatedService);
        return updatedService;
      }
      return service;
    }));
  };

  const deleteService = async (id: string) => {
    setServices(prev => prev.filter(service => service.id !== id));
    
    // Delete from database
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('service_id', id);
      
      if (error) {
        console.error('Error deleting service from database:', error);
      }

      // Also delete associated liquidacoes
      const { error: liquidacoesError } = await supabase
        .from('liquidacoes')
        .delete()
        .eq('service_id', id);
      
      if (liquidacoesError) {
        console.error('Error deleting liquidacoes from database:', liquidacoesError);
      }
      
      // Remove from local state
      setLiquidacoes(prev => {
        const newLiquidacoes = { ...prev };
        delete newLiquidacoes[id];
        return newLiquidacoes;
      });
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const addLiquidacao = async (liquidacao: Omit<Liquidacao, 'id' | 'createdAt'>) => {
    const newLiquidacao: Liquidacao = {
      ...liquidacao,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    
    setLiquidacoes(prev => ({
      ...prev,
      [liquidacao.serviceId]: [...(prev[liquidacao.serviceId] || []), newLiquidacao]
    }));
    
    await saveLiquidacaoToDatabase(newLiquidacao);
  };

  const removeLiquidacao = async (liquidacaoId: string, serviceId: string) => {
    setLiquidacoes(prev => ({
      ...prev,
      [serviceId]: (prev[serviceId] || []).filter(l => l.id !== liquidacaoId)
    }));
    
    try {
      const { error } = await supabase
        .from('liquidacoes')
        .delete()
        .eq('id', liquidacaoId);
      
      if (error) {
        console.error('Error deleting liquidacao from database:', error);
      }
    } catch (error) {
      console.error('Error deleting liquidacao:', error);
    }
  };

  return {
    services: servicesWithCalculations,
    dashboardMetrics,
    addService,
    updateService,
    deleteService,
    addLiquidacao,
    removeLiquidacao,
    isLoading,
  };
};