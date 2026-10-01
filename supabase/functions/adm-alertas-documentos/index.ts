// Alerta diário dos licenciamentos.
//
// Escreve em notificacoes_internas — a tabela que o sininho da aplicação já lê
// — quando um documento entra na janela de aviso, e outra vez no dia em que
// vence. Nada de motor novo: a infraestrutura já existia.
//
// Duas regras que evitam que isto se torne ruído:
//   · UMA notificação por documento e por marco. O registo fica em
//     adm_documento_alertas, com a data de validade na chave — quando o
//     documento é renovado a validade muda e o ciclo recomeça do zero.
//   · Documentos marcados como "rotina" (certidões de 30 dias) só avisam no
//     próprio vencimento. Se avisassem com antecedência como um alvará,
//     enchiam o sininho todos os meses e ensinavam toda a gente a ignorá-lo.
//
// Invocada por pg_cron uma vez por dia.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Documento {
  id: string;
  empresa_id: string;
  titulo: string;
  tipo_nome: string;
  numero: string | null;
  data_validade: string;
  aviso_dias: number;
  rotina: boolean;
  responsavel_nome: string | null;
  arquivado: boolean;
  dispensado: boolean;
}

const soData = (d: Date) => d.toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const hoje = soData(new Date());

    const { data: documentos, error } = await supabase
      .from("adm_documentos")
      .select("id, empresa_id, titulo, tipo_nome, numero, data_validade, aviso_dias, rotina, responsavel_nome, arquivado, dispensado")
      .eq("arquivado", false)
      .eq("dispensado", false)
      .not("data_validade", "is", null);

    if (error) throw error;

    // Alertas já enviados, para não repetir. A chave inclui a validade.
    const { data: jaEnviados } = await supabase
      .from("adm_documento_alertas")
      .select("documento_id, marco, data_validade");

    const enviado = new Set(
      (jaEnviados ?? []).map((a) => `${a.documento_id}|${a.marco}|${a.data_validade}`),
    );

    const notificacoes: Record<string, unknown>[] = [];
    const registos: Record<string, unknown>[] = [];

    for (const d of (documentos ?? []) as Documento[]) {
      const dias = Math.round(
        (new Date(d.data_validade + "T00:00:00").getTime() -
          new Date(hoje + "T00:00:00").getTime()) / 86400000,
      );

      let marco: "a_vencer" | "vencido" | null = null;
      if (dias < 0) marco = "vencido";
      else if (!d.rotina && dias <= (d.aviso_dias ?? 60)) marco = "a_vencer";
      else if (d.rotina && dias === 0) marco = "vencido";

      if (!marco) continue;
      const chave = `${d.id}|${marco}|${d.data_validade}`;
      if (enviado.has(chave)) continue;

      const quem = d.responsavel_nome ? ` Responsável: ${d.responsavel_nome}.` : "";
      const ref = d.numero ? ` (n.º ${d.numero})` : "";

      notificacoes.push({
        empresa_id: d.empresa_id,
        tipo: "administrativo_documento",
        titulo: marco === "vencido"
          ? `Documento vencido: ${d.titulo}`
          : `Documento a vencer em ${dias} dias: ${d.titulo}`,
        mensagem: marco === "vencido"
          ? `O ${d.tipo_nome}${ref} venceu a ${d.data_validade}.${quem}`
          : `O ${d.tipo_nome}${ref} vence a ${d.data_validade}.${quem}`,
        // Sem responsável definido, o aviso sobe à administração — nunca fica
        // sem destinatário.
        perfil_destino: d.responsavel_nome ? "gestor" : "administrador",
        referencia_id: d.id,
        referencia_tipo: "adm_documento",
      });

      registos.push({
        empresa_id: d.empresa_id,
        documento_id: d.id,
        marco,
        data_validade: d.data_validade,
      });
      enviado.add(chave);
    }

    if (notificacoes.length > 0) {
      const { error: eNotif } = await supabase.from("notificacoes_internas").insert(notificacoes);
      if (eNotif) throw eNotif;
      // Só se marca como enviado DEPOIS de a notificação entrar. Ao contrário,
      // uma falha aqui calava o aviso para sempre.
      const { error: eReg } = await supabase.from("adm_documento_alertas").insert(registos);
      if (eReg) throw eReg;
    }

    return new Response(
      JSON.stringify({ ok: true, analisados: documentos?.length ?? 0, avisos: notificacoes.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, erro: String((e as Error)?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
