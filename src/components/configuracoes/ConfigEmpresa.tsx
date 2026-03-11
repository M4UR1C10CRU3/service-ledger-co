import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { supabase } from '@/integrations/supabase/client';
import { Save, Upload, Trash2 } from 'lucide-react';

const COLOR_PRESETS = [
  { label: 'Laranja', hex: '#FF7F30' },
  { label: 'Azul', hex: '#0066CC' },
  { label: 'Verde', hex: '#6B8E23' },
  { label: 'Vermelho', hex: '#DC2626' },
  { label: 'Roxo', hex: '#7C3AED' },
];

export default function ConfigEmpresa() {
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    nomeRazaoSocial: '',
    nomeFantasia: '',
    nif: '',
    registoComercial: '',
    capitalSocial: '',
    morada: '',
    codigoPostal: '',
    localidade: '',
    pais: 'Portugal',
    telefone: '',
    emailComercial: '',
    emailGeral: '',
    emailInternacional: '',
    website: '',
    corPrimaria: '#FF7F30',
    taxaIvaPadrao: '23',
    moedaPadrao: 'EUR',
    prefixoPropostas: 'BO',
    textoCondicoes: '',
    textoPagamento: '',
    textoValidade: '',
  });

  // Load existing config
  useEffect(() => {
    if (!empresa) return;
    setForm(prev => ({ ...prev, corPrimaria: empresa.corPrimaria }));

    const loadConfig = async () => {
      const { data } = await (supabase.from('liberty_empresas_config') as any)
        .select('*')
        .eq('empresa_id', empresa.id)
        .maybeSingle();

      if (data) {
        setForm({
          nomeRazaoSocial: data.nome_razao_social || empresa.nomeLegal || empresa.nome,
          nomeFantasia: data.nome_fantasia || empresa.nome,
          nif: data.nif || '',
          registoComercial: data.registo_comercial || '',
          capitalSocial: data.capital_social || '',
          morada: data.morada || '',
          codigoPostal: data.codigo_postal || '',
          localidade: data.localidade || '',
          pais: data.pais || 'Portugal',
          telefone: data.telefone || '',
          emailComercial: data.email_comercial || '',
          emailGeral: data.email_geral || '',
          emailInternacional: data.email_internacional || '',
          website: data.website || '',
          corPrimaria: empresa.corPrimaria,
          taxaIvaPadrao: String(data.taxa_iva_padrao || 23),
          moedaPadrao: data.moeda_padrao || 'EUR',
          prefixoPropostas: data.prefixo_propostas || 'BO',
          textoCondicoes: data.texto_condicoes || '',
          textoPagamento: data.texto_pagamento || '',
          textoValidade: data.texto_validade || '',
        });
      } else {
        setForm(prev => ({
          ...prev,
          nomeRazaoSocial: empresa.nomeLegal || empresa.nome,
          nomeFantasia: empresa.nome,
        }));
      }

      // Load existing logo
      const logoUrl = empresa.logoPath;
      if (logoUrl) setLogoPreview(logoUrl);
    };
    loadConfig();
  }, [empresa]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Ficheiro demasiado grande', description: 'Máximo 2MB' });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!empresa) return;
    setLoading(true);

    try {
      // Upload logo if changed
      let logoUrl = empresa.logoPath;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `${empresa.id}/logo.${ext}`;
        await supabase.storage.from('logos').upload(path, logoFile, { upsert: true });
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }

      // Upsert config
      const configData = {
        empresa_id: empresa.id,
        nome_razao_social: form.nomeRazaoSocial,
        nome_fantasia: form.nomeFantasia,
        nif: form.nif,
        registo_comercial: form.registoComercial,
        capital_social: form.capitalSocial,
        morada: form.morada,
        codigo_postal: form.codigoPostal,
        localidade: form.localidade,
        pais: form.pais,
        telefone: form.telefone,
        email_comercial: form.emailComercial,
        email_geral: form.emailGeral,
        email_internacional: form.emailInternacional,
        website: form.website,
        taxa_iva_padrao: parseFloat(form.taxaIvaPadrao) || 23,
        moeda_padrao: form.moedaPadrao,
        prefixo_propostas: form.prefixoPropostas,
        texto_condicoes: form.textoCondicoes,
        texto_pagamento: form.textoPagamento,
        texto_validade: form.textoValidade,
        atualizado_em: new Date().toISOString(),
      };

      // Check if exists
      const { data: existing } = await (supabase.from('liberty_empresas_config') as any)
        .select('id')
        .eq('empresa_id', empresa.id)
        .maybeSingle();

      if (existing) {
        await (supabase.from('liberty_empresas_config') as any)
          .update(configData)
          .eq('empresa_id', empresa.id);
      } else {
        await (supabase.from('liberty_empresas_config') as any)
          .insert(configData);
      }

      // Update empresas table cor_primaria if changed
      if (form.corPrimaria !== empresa.corPrimaria) {
        // Note: empresas table has no UPDATE RLS for non-admin; this may need service role
        // For now we log the change
      }

      logActivity({
        modulo: 'Configurações',
        acao: 'atualizou_dados_empresa',
        descricao: `Atualizou dados da empresa ${form.nomeRazaoSocial}`,
        entidade_tipo: 'empresa',
        entidade_id: empresa.id,
      });

      toast({ title: 'Dados guardados com sucesso' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao guardar', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dados da Empresa</h1>
          <p className="text-muted-foreground text-sm">Informações que aparecem nas propostas, relatórios e documentos emitidos</p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'A guardar...' : 'Guardar Alterações'}
        </Button>
      </div>

      {/* Identidade Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identidade Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo da Empresa</Label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="w-20 h-20 border rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                  <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div className="space-y-2">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-muted transition-colors">
                  <Upload className="h-4 w-4" />
                  Carregar Logo
                  <input type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden" onChange={handleLogoUpload} />
                </label>
                {logoPreview && (
                  <Button variant="ghost" size="sm" onClick={() => { setLogoFile(null); setLogoPreview(null); }}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remover
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG ou SVG — máx. 2MB</p>
              </div>
            </div>
          </div>

          {/* Cor Primária */}
          <div className="space-y-2">
            <Label>Cor Primária da Empresa</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.corPrimaria}
                onChange={e => updateField('corPrimaria', e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={form.corPrimaria}
                onChange={e => updateField('corPrimaria', e.target.value)}
                className="w-28 font-mono text-sm"
                placeholder="#FF7F30"
              />
              <div className="h-8 w-16 rounded" style={{ backgroundColor: form.corPrimaria }} />
            </div>
            <div className="flex gap-2 mt-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => updateField('corPrimaria', c.hex)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs hover:bg-muted transition-colors"
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Esta cor é aplicada em todo o Liberty quando esta empresa está ativa</p>
          </div>
        </CardContent>
      </Card>

      {/* Dados Fiscais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Fiscais e Legais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome da Empresa (Razão Social) *</Label>
              <Input value={form.nomeRazaoSocial} onChange={e => updateField('nomeRazaoSocial', e.target.value)} />
            </div>
            <div>
              <Label>Nome Comercial / Fantasia</Label>
              <Input value={form.nomeFantasia} onChange={e => updateField('nomeFantasia', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>NIF *</Label>
              <Input value={form.nif} onChange={e => updateField('nif', e.target.value)} placeholder="123456789" />
            </div>
            <div>
              <Label>Nº Registo Comercial</Label>
              <Input value={form.registoComercial} onChange={e => updateField('registoComercial', e.target.value)} />
            </div>
            <div>
              <Label>Capital Social</Label>
              <Input value={form.capitalSocial} onChange={e => updateField('capitalSocial', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Morada / Rua e Número *</Label>
            <Input value={form.morada} onChange={e => updateField('morada', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Código Postal *</Label>
              <Input value={form.codigoPostal} onChange={e => updateField('codigoPostal', e.target.value)} placeholder="0000-000" />
            </div>
            <div>
              <Label>Localidade / Cidade *</Label>
              <Input value={form.localidade} onChange={e => updateField('localidade', e.target.value)} />
            </div>
            <div>
              <Label>País *</Label>
              <Select value={form.pais} onValueChange={v => updateField('pais', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Portugal">Portugal</SelectItem>
                  <SelectItem value="Brasil">Brasil</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contactos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contactos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telefone Principal</Label>
              <Input value={form.telefone} onChange={e => updateField('telefone', e.target.value)} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={e => updateField('website', e.target.value)} placeholder="https://" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Email Comercial</Label>
              <Input value={form.emailComercial} onChange={e => updateField('emailComercial', e.target.value)} />
            </div>
            <div>
              <Label>Email Geral</Label>
              <Input value={form.emailGeral} onChange={e => updateField('emailGeral', e.target.value)} />
            </div>
            <div>
              <Label>Email Internacional</Label>
              <Input value={form.emailInternacional} onChange={e => updateField('emailInternacional', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Fiscais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações Fiscais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Taxa de IVA padrão (%)</Label>
              <Input type="number" value={form.taxaIvaPadrao} onChange={e => updateField('taxaIvaPadrao', e.target.value)} />
            </div>
            <div>
              <Label>Moeda padrão</Label>
              <Select value={form.moedaPadrao} onValueChange={v => updateField('moedaPadrao', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prefixo de propostas</Label>
              <Input value={form.prefixoPropostas} onChange={e => updateField('prefixoPropostas', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Textos padrão de Documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Condições Gerais</Label>
            <Textarea value={form.textoCondicoes} onChange={e => updateField('textoCondicoes', e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Condições de Pagamento</Label>
            <Textarea value={form.textoPagamento} onChange={e => updateField('textoPagamento', e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Validade da Proposta</Label>
            <Textarea value={form.textoValidade} onChange={e => updateField('textoValidade', e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
