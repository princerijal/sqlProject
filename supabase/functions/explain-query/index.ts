import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ExplainRequest {
  sql: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sql }: ExplainRequest = await req.json();

    if (!sql || typeof sql !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid SQL query provided' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const explainQuery = `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS, VERBOSE) ${sql}`;

    const { data, error } = await supabase.rpc('execute_sql', {
      query: explainQuery,
    });

    if (error) {
      const explainQueryWithoutAnalyze = `EXPLAIN (FORMAT JSON, VERBOSE) ${sql}`;

      const { data: planData, error: planError } = await supabase.rpc('execute_sql', {
        query: explainQueryWithoutAnalyze,
      });

      if (planError) {
        return new Response(
          JSON.stringify({
            error: 'Failed to generate execution plan',
            details: planError.message,
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          plan: planData,
          analyzed: false,
          message: 'Execution plan generated (without ANALYZE)',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan: data,
        analyzed: true,
        message: 'Execution plan with analysis generated successfully',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
