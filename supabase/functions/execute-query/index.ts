import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

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
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing execution token" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tokenData, error: tokenError } = await supabase
      .from('execution_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        buildHtmlResponse('Invalid Token', 'The execution token is invalid or has been removed.', 'error'),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html",
          },
        }
      );
    }

    if (tokenData.used_at) {
      return new Response(
        buildHtmlResponse('Already Executed', 'This query has already been executed using this link.', 'warning'),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html",
          },
        }
      );
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        buildHtmlResponse('Token Expired', 'This execution link has expired. Please request a new approval email.', 'error'),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html",
          },
        }
      );
    }

    const { data: query, error: queryError } = await supabase
      .from('queries')
      .select('*')
      .eq('id', tokenData.query_id)
      .maybeSingle();

    if (queryError || !query) {
      return new Response(
        buildHtmlResponse('Query Not Found', 'The associated query could not be found.', 'error'),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html",
          },
        }
      );
    }

    if (query.status !== 'approved') {
      return new Response(
        buildHtmlResponse('Invalid Query Status', 'This query is no longer in approved status and cannot be executed.', 'error'),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html",
          },
        }
      );
    }

    const executionTimestamp = new Date().toISOString();
    const executedBy = tokenData.executed_by || null;

    // Execute the query using the database function
    const { data: executeResult, error: executeError } = await supabase
      .rpc('execute_query_with_audit', {
        p_query_id: query.id,
        p_executed_by: executedBy
      });

    if (executeError) {
      return new Response(
        buildHtmlResponse('Execution Failed', `Failed to execute query: ${executeError.message}`, 'error'),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html",
          },
        }
      );
    }

    // Mark the token as used
    const { error: updateTokenError } = await supabase
      .from('execution_tokens')
      .update({
        used_at: executionTimestamp,
        executed_by: executedBy,
      })
      .eq('id', tokenData.id);

    if (updateTokenError) {
      console.error('Failed to update token:', updateTokenError);
    }

    return new Response(
      buildHtmlResponse(
        'Query Marked as Executed',
        `The query "${query.title}" has been marked as executed at ${new Date(executionTimestamp).toLocaleString()}.`,
        'success'
      ),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html",
        },
      }
    );
  } catch (error) {
    return new Response(
      buildHtmlResponse(
        'Error',
        error instanceof Error ? error.message : "Unknown error occurred",
        'error'
      ),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html",
        },
      }
    );
  }
});

function buildHtmlResponse(title: string, message: string, type: 'success' | 'error' | 'warning'): string {
  const colors = {
    success: { bg: '#d1fae5', border: '#059669', text: '#065f46' },
    error: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  };

  const color = colors[type];

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            text-align: center;
          }
          .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background-color: ${color.bg};
            border: 4px solid ${color.border};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
          }
          h1 {
            color: ${color.text};
            margin: 0 0 20px 0;
            font-size: 28px;
          }
          p {
            color: #4b5563;
            line-height: 1.6;
            font-size: 16px;
          }
          .timestamp {
            margin-top: 20px;
            padding: 12px;
            background-color: #f9fafb;
            border-radius: 6px;
            font-size: 14px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">
            ${type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠'}
          </div>
          <h1>${title}</h1>
          <p>${message}</p>
          <div class="timestamp">
            ${new Date().toLocaleString()}
          </div>
        </div>
      </body>
    </html>
  `;
}
