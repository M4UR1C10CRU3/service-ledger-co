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
    tipoServico: 'fatura',
    valorFaturado: 0,
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
    tipoServico: 'fatura',
    valorFaturado: 0,
  },
  {
    id: '3',
    data: '10/09/2025',
    servico: 'Construção Edifício Comercial',
    cliente: 'Cliente C',
    resumo: 'Obra completa de 24 meses',
    proposta: 'P-103',
    fatura: '',
    valorComIVA: 100000.00,
    valorSemIVA: 81301.00,
    liquidado: 0.00,
    aRealizar: true,
    createdAt: new Date('2025-09-10'),
    tipoServico: 'contrato',
    valorFaturado: 0,
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
    tipoServico: 'fatura',
    valorFaturado: 0,
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
    tipoServico: 'fatura',
    valorFaturado: 0,
  },
];

// Helper functions for database operations
const saveServiceToDatabase = async (service: Service, empresaId: string) => {
  try {
    // Primeiro verificar se existe
    const { data: existing } = await supabase
      .from('services')
      .select('id')
      .eq('service_id', service.id)
      .single();
    
    if (existing) {
      // Update
      const { error } = await supabase
        .from('services')
        .update({
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
          tipo_servico: service.tipoServico,
          contrato_id: service.contratoId || null,
          valor_faturado: service.valorFaturado || 0,
          numero_fatura: service.numeroFatura || null,
          telefone: service.telefone || null,
          email: service.email || null,
        })
        .eq('service_id', service.id);
      
      if (error) {
        console.error('Error updating service in database:', error);
      }
    } else {
      // Insert
      const { error } = await supabase
        .from('services')
        .insert({
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
          tipo_servico: service.tipoServico,
          contrato_id: service.contratoId || null,
          valor_faturado: service.valorFaturado || 0,
          numero_fatura: service.numeroFatura || null,
          telefone: service.telefone || null,
          email: service.email || null,
          empresa_id: empresaId,
          created_at: service.createdAt.toISOString(),
        });
      
      if (error) {
        console.error('Error inserting service in database:', error);
      }
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
      formaPagamento: (row as any).forma_pagamento || undefined,
      observacoes: row.observacoes || undefined,
      createdAt: new Date(row.created_at),
    })) || [];
  } catch (error) {
    console.error('Error loading liquidacoes from database:', error);
    return [];
  }
};

const saveLiquidacaoToDatabase = async (liquidacao: Omit<Liquidacao, 'id'>) => {
  try {
    const { error } = await supabase
      .from('liquidacoes')
      .insert({
        service_id: liquidacao.serviceId,
        valor: liquidacao.valor,
        data_pagamento: liquidacao.dataPagamento,
        forma_pagamento: liquidacao.formaPagamento || null,
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

const loadServicesFromDatabase = async (empresaId?: string): Promise<Service[]> => {
  try {
    let query = supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filtrar por empresa se especificado
    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }
    
    const { data, error } = await query;
    
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
      tipoServico: (row as any).tipo_servico || 'fatura',
      contratoId: (row as any).contrato_id || undefined,
      valorFaturado: parseFloat(((row as any).valor_faturado ?? 0).toString()),
      numeroFatura: (row as any).numero_fatura || undefined,
      telefone: (row as any).telefone || undefined,
      email: (row as any).email || undefined,
      empresaId: (row as any).empresa_id || undefined,
    })) || initialServices;
  } catch (error) {
    console.error('Error loading services from database:', error);
    return initialServices;
  }
};

export const useServices = (empresaId?: string) => {
  const [services, setServices] = useState<Service[]>([]);
  const [liquidacoes, setLiquidacoes] = useState<Record<string, Liquidacao[]>>({});
  const [currentEmpresaId, setCurrentEmpresaId] = useState<string | null>(empresaId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [empresaIdLoaded, setEmpresaIdLoaded] = useState(false);

  // Atualizar currentEmpresaId quando empresaId prop mudar
  useEffect(() => {
    if (empresaId) {
      console.log('useServices: empresaId from prop:', empresaId);
      setCurrentEmpresaId(empresaId);
      setEmpresaIdLoaded(true);
    }
  }, [empresaId]);

  // Carregar empresa ID do localStorage se não fornecido via prop
  useEffect(() => {
    const loadEmpresaId = async () => {
      // Se já temos empresaId via prop, não precisamos buscar do localStorage
      if (empresaId) {
        return;
      }
      
      // Obter empresa do localStorage
      const savedSlug = localStorage.getItem('selectedEmpresa');
      console.log('useServices: Loading empresa from localStorage, slug:', savedSlug);
      
      if (savedSlug) {
        try {
          const { data, error } = await supabase
            .from('empresas')
            .select('id')
            .eq('slug', savedSlug)
            .single();
          
          if (error) {
            console.error('Error fetching empresa by slug:', error);
          }
          
          if (data) {
            console.log('useServices: Found empresa id:', data.id);
            setCurrentEmpresaId(data.id);
          }
        } catch (error) {
          console.error('Error loading empresa id:', error);
        }
      }
      setEmpresaIdLoaded(true);
    };
    
    loadEmpresaId();
  }, [empresaId]);

  // Load services from database when empresa is set
  useEffect(() => {
    const loadServices = async () => {
      if (!currentEmpresaId) {
        console.log('useServices: No empresa ID, skipping load');
        setIsInitialized(true);
        return;
      }
      
      console.log('useServices: Loading services for empresa:', currentEmpresaId);
      setIsLoading(true);
      
      try {
        const servicesFromDb = await loadServicesFromDatabase(currentEmpresaId);
        console.log('useServices: Loaded', servicesFromDb.length, 'services');
        setServices(servicesFromDb);
        
        // Load liquidacoes for each service
        const allLiquidacoes: Record<string, Liquidacao[]> = {};
        for (const service of servicesFromDb) {
          const serviceLiquidacoes = await loadLiquidacoesFromDatabase(service.id);
          allLiquidacoes[service.id] = serviceLiquidacoes;
        }
        setLiquidacoes(allLiquidacoes);
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    // Só carregar quando tivermos tentado obter o empresaId
    if (empresaIdLoaded || currentEmpresaId) {
      loadServices();
    }
  }, [currentEmpresaId, empresaIdLoaded]);

  const calculateServiceMetrics = (service: Service): ServiceWithCalculations => {
    let serviceLiquidacoes = liquidacoes[service.id] || [];
    
    // Calcular valor liquidado a partir das liquidações registradas
    let liquidadoFromLiquidacoes = serviceLiquidacoes.reduce((total, liq) => total + liq.valor, 0);
    
    // Para contratos: agregar liquidações das faturas vinculadas
    if (service.tipoServico === 'contrato') {
      // Encontrar todas as faturas vinculadas a este contrato
      const faturasVinculadas = services.filter(s => s.contratoId === service.id);
      
      // Somar liquidações de todas as faturas vinculadas
      for (const fatura of faturasVinculadas) {
        const faturaLiquidacoes = liquidacoes[fatura.id] || [];
        liquidadoFromLiquidacoes += faturaLiquidacoes.reduce((total, liq) => total + liq.valor, 0);
      }
    }
    
    // Usar o valor de liquidações registradas, ou o valor do campo liquidado do serviço como fallback
    // (para dados legados onde o valor foi preenchido diretamente sem registrar liquidações)
    const liquidadoCalculated = liquidadoFromLiquidacoes > 0 
      ? liquidadoFromLiquidacoes 
      : service.liquidado;
    
    // Novo modelo simplificado:
    // - valorComIVA = valor total da proposta
    // - valorFaturado = valor efetivamente faturado (pode ser menor que o total)
    // - valorNaoFaturado = valorComIVA - valorFaturado (calculado)
    // - executadoEmDebito: Para faturas = valorComIVA - liquidado; Para contratos = 0
    
    const valorFaturado = service.valorFaturado || 0;
    const valorNaoFaturado = service.valorComIVA - valorFaturado;
    
    // Débito: para faturas é baseado no valorComIVA menos o que foi liquidado
    // Para contratos o débito é 0 (o débito real está nas faturas vinculadas)
    const executadoEmDebito = service.tipoServico === 'fatura' 
      ? Math.max(0, service.valorComIVA - liquidadoCalculated)
      : 0;
    
    // Percentual liquidado: para faturas é sobre valorComIVA; para contratos é sobre valorFaturado
    const percentualLiquidado = service.tipoServico === 'fatura'
      ? (service.valorComIVA > 0 ? (liquidadoCalculated / service.valorComIVA) * 100 : 0)
      : (valorFaturado > 0 ? (liquidadoCalculated / valorFaturado) * 100 : 0);
    
    // Percentual faturado é sobre o valor total da proposta (para contratos)
    const percentualFaturado = service.valorComIVA > 0 ? (valorFaturado / service.valorComIVA) * 100 : 0;
    
    // Calculate days overdue if there is debt pending
    let diasEmAtraso = 0;
    if (executadoEmDebito > 0) {
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
      percentualFaturado,
      valorARealizar: valorNaoFaturado, // Valor não faturado
      liquidacoes: serviceLiquidacoes,
    };
  };

  const servicesWithCalculations = useMemo(() => {
    return services.map(calculateServiceMetrics);
  }, [services, liquidacoes]);

  const dashboardMetrics = useMemo((): DashboardMetrics => {
    // Novo modelo simplificado - todos os serviços
    const allServices = servicesWithCalculations;
    
    // Total da proposta (valor acordado)
    const totalContratado = allServices.reduce((sum, service) => sum + service.valorComIVA, 0);
    
    // Total efetivamente faturado
    const totalFaturado = allServices.reduce((sum, service) => sum + (service.valorFaturado || 0), 0);
    
    // Total não faturado (diferença entre proposta e faturado)
    const totalARealizar = allServices.reduce((sum, service) => sum + service.valorARealizar, 0);
    
    // Total liquidado (pagamentos recebidos)
    const totalLiquidado = allServices.reduce((sum, service) => sum + service.liquidado, 0);
    
    // Total em débito (faturado - liquidado)
    const totalEmDebito = allServices.reduce((sum, service) => sum + service.executadoEmDebito, 0);
    
    // Serviços em atraso
    const servicosEmAtraso = allServices.filter(service => service.diasEmAtraso > 0).length;
    
    return {
      // Métricas de faturamento
      totalFaturado,
      totalLiquidado,
      totalEmDebito,
      percentualLiquidado: totalFaturado > 0 ? (totalLiquidado / totalFaturado) * 100 : 0,
      servicosEmAtraso,
      
      // Métricas de propostas/contratos
      totalContratado,
      totalARealizar,
      totalJaFaturado: totalFaturado,
      percentualFaturado: totalContratado > 0 ? (totalFaturado / totalContratado) * 100 : 0,
    };
  }, [servicesWithCalculations]);

  const addService = async (service: Omit<Service, 'id' | 'createdAt'>, liquidacoesData?: Omit<Liquidacao, 'id' | 'createdAt' | 'serviceId'>[]) => {
    if (!currentEmpresaId) {
      console.error('No empresa selected');
      return;
    }
    
    const newService: Service = {
      ...service,
      id: Date.now().toString(),
      createdAt: new Date(),
      tipoServico: service.tipoServico || 'fatura',
      valorFaturado: service.valorFaturado || 0,
    };
    setServices(prev => [...prev, newService]);
    await saveServiceToDatabase(newService, currentEmpresaId);
    
    // Adicionar liquidações se fornecidas
    if (liquidacoesData && liquidacoesData.length > 0) {
      for (const liquidacao of liquidacoesData) {
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
        if (currentEmpresaId) {
          saveServiceToDatabase(updatedService, currentEmpresaId);
        }
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
    const liquidacaoToSave = {
      ...liquidacao,
      createdAt: new Date(),
    };
    
    await saveLiquidacaoToDatabase(liquidacaoToSave);
    
    // Reload liquidacoes for this service from database to get the generated ID
    const serviceLiquidacoes = await loadLiquidacoesFromDatabase(liquidacao.serviceId);
    setLiquidacoes(prev => ({
      ...prev,
      [liquidacao.serviceId]: serviceLiquidacoes
    }));
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

  const updateLiquidacao = async (liquidacaoId: string, serviceId: string, updates: Partial<Liquidacao>) => {
    // Update local state immediately
    setLiquidacoes(prev => ({
      ...prev,
      [serviceId]: (prev[serviceId] || []).map(l => 
        l.id === liquidacaoId ? { ...l, ...updates } : l
      )
    }));
    
    try {
      const updateData: any = {};
      if (updates.valor !== undefined) updateData.valor = updates.valor;
      if (updates.dataPagamento !== undefined) updateData.data_pagamento = updates.dataPagamento;
      if (updates.formaPagamento !== undefined) updateData.forma_pagamento = updates.formaPagamento;
      if (updates.observacoes !== undefined) updateData.observacoes = updates.observacoes;
      
      const { error } = await supabase
        .from('liquidacoes')
        .update(updateData)
        .eq('id', liquidacaoId);
      
      if (error) {
        console.error('Error updating liquidacao in database:', error);
      }
    } catch (error) {
      console.error('Error updating liquidacao:', error);
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
    updateLiquidacao,
    isLoading,
    isInitialized,
    liquidacoes,
  };
};