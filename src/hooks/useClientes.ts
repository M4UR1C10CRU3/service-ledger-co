import { useState, useEffect } from 'react';
import { Cliente, ClienteFormData } from '@/types/cliente';
import { supabase } from '@/integrations/supabase/client';

export const useClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadClientes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.error('Error loading clientes:', error);
        return;
      }

      setClientes(
        data?.map((row: any) => ({
          id: row.id,
          nome: row.nome,
          telefone: row.telefone || undefined,
          email: row.email || undefined,
          nif: row.nif || undefined,
          moradaRua: row.morada_rua || undefined,
          moradaNumero: row.morada_numero || undefined,
          moradaComplemento: row.morada_complemento || undefined,
          moradaConcelho: row.morada_concelho || undefined,
          moradaCodigoPostal: row.morada_codigo_postal || undefined,
          moradaDistrito: row.morada_distrito || undefined,
          moradaPais: row.morada_pais || undefined,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        })) || []
      );
    } catch (error) {
      console.error('Error loading clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const addCliente = async (clienteData: ClienteFormData): Promise<Cliente | null> => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nome: clienteData.nome,
          telefone: clienteData.telefone || null,
          email: clienteData.email || null,
          nif: clienteData.nif || null,
          morada_rua: clienteData.moradaRua || null,
          morada_numero: clienteData.moradaNumero || null,
          morada_complemento: clienteData.moradaComplemento || null,
          morada_concelho: clienteData.moradaConcelho || null,
          morada_codigo_postal: clienteData.moradaCodigoPostal || null,
          morada_distrito: clienteData.moradaDistrito || null,
          morada_pais: clienteData.moradaPais || 'Portugal',
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding cliente:', error);
        return null;
      }

      const newCliente: Cliente = {
        id: data.id,
        nome: data.nome,
        telefone: data.telefone || undefined,
        email: data.email || undefined,
        nif: data.nif || undefined,
        moradaRua: data.morada_rua || undefined,
        moradaNumero: data.morada_numero || undefined,
        moradaComplemento: data.morada_complemento || undefined,
        moradaConcelho: data.morada_concelho || undefined,
        moradaCodigoPostal: data.morada_codigo_postal || undefined,
        moradaDistrito: data.morada_distrito || undefined,
        moradaPais: data.morada_pais || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      setClientes(prev => [...prev, newCliente].sort((a, b) => a.nome.localeCompare(b.nome)));
      return newCliente;
    } catch (error) {
      console.error('Error adding cliente:', error);
      return null;
    }
  };

  const updateCliente = async (id: string, updates: Partial<ClienteFormData>): Promise<boolean> => {
    try {
      const updateData: any = {};
      if (updates.nome !== undefined) updateData.nome = updates.nome;
      if (updates.telefone !== undefined) updateData.telefone = updates.telefone || null;
      if (updates.email !== undefined) updateData.email = updates.email || null;
      if (updates.nif !== undefined) updateData.nif = updates.nif || null;
      if (updates.moradaRua !== undefined) updateData.morada_rua = updates.moradaRua || null;
      if (updates.moradaNumero !== undefined) updateData.morada_numero = updates.moradaNumero || null;
      if (updates.moradaComplemento !== undefined) updateData.morada_complemento = updates.moradaComplemento || null;
      if (updates.moradaConcelho !== undefined) updateData.morada_concelho = updates.moradaConcelho || null;
      if (updates.moradaCodigoPostal !== undefined) updateData.morada_codigo_postal = updates.moradaCodigoPostal || null;
      if (updates.moradaDistrito !== undefined) updateData.morada_distrito = updates.moradaDistrito || null;
      if (updates.moradaPais !== undefined) updateData.morada_pais = updates.moradaPais || null;

      const { error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating cliente:', error);
        return false;
      }

      await loadClientes();
      return true;
    } catch (error) {
      console.error('Error updating cliente:', error);
      return false;
    }
  };

  const deleteCliente = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting cliente:', error);
        return false;
      }

      setClientes(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting cliente:', error);
      return false;
    }
  };

  const findClienteByName = (name: string): Cliente | undefined => {
    return clientes.find(c => c.nome.toLowerCase() === name.toLowerCase());
  };

  return {
    clientes,
    isLoading,
    addCliente,
    updateCliente,
    deleteCliente,
    findClienteByName,
    refreshClientes: loadClientes,
  };
};
