import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey      = Deno.env.get('SUPABASE_ANON_KEY')!;

    // ── 1. Verificar caller (JWT já validado pelo gateway se verify_jwt=true) ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    }

    // Criar cliente com o token do caller para verificar a sua identidade
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth:   { persistSession: false },
    });

    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    }

    // ── 2. Verificar que o caller é administrador em liberty_utilizadores ──
    const { data: lu, error: luErr } = await callerClient
      .from('liberty_utilizadores')
      .select('id, perfil, ativo, eliminado')
      .eq('auth_user_id', caller.id)
      .eq('ativo', true)
      .eq('eliminado', false)
      .maybeSingle();

    if (luErr || !lu || lu.perfil !== 'administrador') {
      return new Response(JSON.stringify({ error: 'Forbidden: apenas administradores podem criar utilizadores' }), {
        status: 403, headers: CORS,
      });
    }

    // ── 3. Parsear body ──
    const body = await req.json().catch(() => ({}));
    const { email, password, nome } = body as { email?: string; password?: string; nome?: string };

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email e password são obrigatórios' }), {
        status: 400, headers: CORS,
      });
    }

    // ── 4. Criar utilizador com service_role (não afecta a sessão do admin) ──
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,           // confirmar email automaticamente
      user_metadata: { nome: nome ?? '' },
    });

    if (createErr) {
      // Traduzir erros comuns
      const msg = createErr.message.includes('already registered')
        ? 'Este email já tem conta registada. O administrador pode adicioná-lo directamente via SQL ou contactar o suporte.'
        : createErr.message;
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: CORS });
    }

    return new Response(
      JSON.stringify({ user: created.user }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[admin-create-user]', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});
