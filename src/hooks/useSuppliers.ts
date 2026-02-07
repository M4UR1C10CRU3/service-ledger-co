import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { Supplier, SupplierFormData } from '@/types/supplier';

function mapRow(row: any): Supplier {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    tipoPessoa: row.tipo_pessoa,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpjCpf: row.cnpj_cpf,
    categoria: row.categoria,
    telefone: row.telefone,
    telefoneSecundario: row.telefone_secundario,
    email: row.email,
    contatoPrincipal: row.contato_principal,
    cep: row.cep,
    logradouro: row.logradouro,
    numero: row.numero,
    complemento: row.complemento,
    bairro: row.bairro,
    cidade: row.cidade,
    estado: row.estado,
    banco: row.banco,
    agencia: row.agencia,
    conta: row.conta,
    observacoes: row.observacoes,
    status: row.status,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useSuppliers() {
  const { empresa } = useEmpresa();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    if (!empresa) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('empresa_id', empresa.id)
      .is('deleted_at', null)
      .order('razao_social');

    if (!error && data) {
      setSuppliers(data.map(mapRow));
    }
    setIsLoading(false);
  }, [empresa]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const addSupplier = async (form: SupplierFormData): Promise<boolean> => {
    if (!empresa) return false;
    const { error } = await supabase.from('suppliers').insert({
      empresa_id: empresa.id,
      tipo_pessoa: form.tipoPessoa,
      razao_social: form.razaoSocial.trim(),
      nome_fantasia: form.nomeFantasia.trim() || null,
      cnpj_cpf: form.cnpjCpf.trim(),
      categoria: form.categoria,
      telefone: form.telefone.trim() || null,
      telefone_secundario: form.telefoneSecundario.trim() || null,
      email: form.email.trim() || null,
      contato_principal: form.contatoPrincipal.trim() || null,
      cep: form.cep.trim() || null,
      logradouro: form.logradouro.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.trim() || null,
      banco: form.banco.trim() || null,
      agencia: form.agencia.trim() || null,
      conta: form.conta.trim() || null,
      observacoes: form.observacoes.trim() || null,
      status: form.status,
    });
    if (!error) {
      await fetchSuppliers();
      return true;
    }
    console.error('Error adding supplier:', error);
    return false;
  };

  const updateSupplier = async (id: string, form: SupplierFormData): Promise<boolean> => {
    const { error } = await supabase.from('suppliers').update({
      tipo_pessoa: form.tipoPessoa,
      razao_social: form.razaoSocial.trim(),
      nome_fantasia: form.nomeFantasia.trim() || null,
      cnpj_cpf: form.cnpjCpf.trim(),
      categoria: form.categoria,
      telefone: form.telefone.trim() || null,
      telefone_secundario: form.telefoneSecundario.trim() || null,
      email: form.email.trim() || null,
      contato_principal: form.contatoPrincipal.trim() || null,
      cep: form.cep.trim() || null,
      logradouro: form.logradouro.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.trim() || null,
      banco: form.banco.trim() || null,
      agencia: form.agencia.trim() || null,
      conta: form.conta.trim() || null,
      observacoes: form.observacoes.trim() || null,
      status: form.status,
    }).eq('id', id);
    if (!error) {
      await fetchSuppliers();
      return true;
    }
    console.error('Error updating supplier:', error);
    return false;
  };

  const deleteSupplier = async (id: string): Promise<boolean> => {
    // Soft delete
    const { error } = await supabase
      .from('suppliers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      await fetchSuppliers();
      return true;
    }
    console.error('Error deleting supplier:', error);
    return false;
  };

  return { suppliers, isLoading, addSupplier, updateSupplier, deleteSupplier, refreshSuppliers: fetchSuppliers };
}
