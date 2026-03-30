import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Delete user function called');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('User verification failed:', userError);
      return new Response(
        JSON.stringify({ error: `Unauthorized: ${userError?.message || 'Invalid token'}` }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User verified:', user.id);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin, is_approved')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: `Profile check failed: ${profileError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!profile?.is_admin || !profile?.is_approved) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { userId } = await req.json();
    console.log('Attempting to delete user:', userId);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has any associated records that would prevent deletion
    console.log('Checking for associated records...');
    const { data: queriesCheck } = await supabaseAdmin
      .from('queries')
      .select('id')
      .eq('developer_id', userId)
      .limit(1);

    const { data: historyCheck } = await supabaseAdmin
      .from('query_history')
      .select('id')
      .eq('performed_by', userId)
      .limit(1);

    const { data: auditCheck } = await supabaseAdmin
      .from('audit_logs')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    // If user has historical records, perform soft delete instead of hard delete
    if (queriesCheck?.length || historyCheck?.length || auditCheck?.length) {
      console.log('User has historical records, performing soft delete');
      const { error: softDeleteError } = await supabaseAdmin
        .from('user_profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', userId);

      if (softDeleteError) {
        console.error('Soft delete error:', softDeleteError);
        return new Response(
          JSON.stringify({ error: `Soft delete failed: ${softDeleteError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      console.log('Soft delete successful');

      // Also disable the auth user to prevent login
      const { error: disableError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { ban_duration: '876000h' } // Ban for 100 years effectively
      );

      if (disableError) {
        // Log but don't fail - soft delete already succeeded
        console.error('Failed to disable user auth:', disableError);
      }

      return new Response(
        JSON.stringify({ success: true, softDelete: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // If no historical records, perform hard delete
    console.log('No historical records, performing hard delete');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Hard delete error:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Hard delete successful');
    return new Response(
      JSON.stringify({ success: true, hardDelete: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
