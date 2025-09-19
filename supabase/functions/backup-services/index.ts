import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting backup process...');
    
    // Fetch all services from the database
    const { data: services, error: fetchError } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching services:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch services' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${services?.length || 0} services to backup`);

    // Create backup entry
    const backupData = {
      services: services || [],
      timestamp: new Date().toISOString(),
      metadata: {
        total_services: services?.length || 0,
        backup_type: 'automatic_hourly',
        version: '1.0'
      }
    };

    const { data: backup, error: backupError } = await supabase
      .from('backups')
      .insert({
        backup_data: backupData,
        services_count: services?.length || 0
      })
      .select()
      .single();

    if (backupError) {
      console.error('Error creating backup:', backupError);
      return new Response(JSON.stringify({ error: 'Failed to create backup' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Backup created successfully with ID: ${backup.id}`);

    // Clean up old backups (keep only last 168 backups - 7 days worth)
    const { data: oldBackups } = await supabase
      .from('backups')
      .select('id')
      .order('backup_timestamp', { ascending: false })
      .range(168, 1000);

    if (oldBackups && oldBackups.length > 0) {
      const oldBackupIds = oldBackups.map(b => b.id);
      const { error: deleteError } = await supabase
        .from('backups')
        .delete()
        .in('id', oldBackupIds);

      if (deleteError) {
        console.error('Error cleaning up old backups:', deleteError);
      } else {
        console.log(`Cleaned up ${oldBackups.length} old backups`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      backup_id: backup.id,
      services_backed_up: services?.length || 0,
      timestamp: backup.backup_timestamp
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in backup function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
