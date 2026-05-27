import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { OsChecklistTemplate, OsChecklistTemplateItem } from '@/types/osChecklistTemplate';

function mapTpl(r: any): OsChecklistTemplate {
  return {
    id: r.id, empresaId: r.empresa_id, nome: r.nome, descricao: r.descricao,
    ordem: r.ordem ?? 0, ativo: r.ativo ?? true,
  };
}
function mapItem(r: any): OsChecklistTemplateItem {
  return {
    id: r.id, templateId: r.template_id, ordem: r.ordem,
    titulo: r.titulo, responsavelPadrao: r.responsavel_padrao,
    diasOffset: r.dias_offset,
  };
}

export function useOsChecklistTemplates() {
  const [templates, setTemplates] = useState<OsChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('os_checklist_templates').select('*').eq('ativo', true).order('ordem');
    setTemplates((data ?? []).map(mapTpl));
    setLoading(false);
  }, []);

  const fetchItems = async (templateId: string): Promise<OsChecklistTemplateItem[]> => {
    const { data } = await (supabase as any)
      .from('os_checklist_template_itens').select('*').eq('template_id', templateId).order('ordem');
    return (data ?? []).map(mapItem);
  };

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  return { templates, loading, fetchTemplates, fetchItems };
}
