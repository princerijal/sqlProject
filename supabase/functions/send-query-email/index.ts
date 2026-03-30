import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  to: string;
  queryTitle: string;
  queryContent: string;
  queryId: string;
  dbAdminId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, queryTitle, queryContent, queryId, dbAdminId }: RequestPayload = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const mailjetApiKey = Deno.env.get("MAILJET_API_KEY");
    const mailjetSecretKey = Deno.env.get("MAILJET_SECRET_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@example.com";
    const fromName = Deno.env.get("FROM_NAME") || "SQL Query System";
    const appUrl = Deno.env.get("APP_URL") || supabaseUrl.replace('.supabase.co', '');

    if (!mailjetApiKey || !mailjetSecretKey) {
      return new Response(
        JSON.stringify({
          error: "Email service not configured. Please set MAILJET_API_KEY and MAILJET_SECRET_KEY."
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const executionToken = crypto.randomUUID() + '-' + crypto.randomUUID();

    const { error: tokenError } = await supabase
      .from('execution_tokens')
      .insert({
        query_id: queryId,
        token: executionToken,
        executed_by: dbAdminId,
      });

    if (tokenError) {
      throw new Error(`Failed to create execution token: ${tokenError.message}`);
    }

    const executionUrl = `${supabaseUrl}/functions/v1/execute-query?token=${executionToken}`;

    const emailData = {
      Messages: [
        {
          From: {
            Email: fromEmail,
            Name: fromName,
          },
          To: [
            {
              Email: to,
            },
          ],
          Subject: `Approved SQL Query: ${queryTitle}`,
          TextPart: `Your SQL query has been approved.\n\nQuery Title: ${queryTitle}\n\nQuery:\n${queryContent}\n\nTo execute this query, click the link below:\n${executionUrl}`,
          HTMLPart: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #059669;">SQL Query Approved</h2>
                  <p>Your SQL query has been approved and is ready for execution.</p>

                  <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1e293b;">Query Title:</h3>
                    <p style="margin-bottom: 0;">${queryTitle}</p>
                  </div>

                  <div style="background-color: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #f1f5f9;">SQL Query:</h3>
                    <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', monospace;">${queryContent}</pre>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${executionUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Execute Query Now
                    </a>
                  </div>

                  <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                    This execution link will expire in 7 days and can only be used once.
                  </p>

                  <p style="color: #64748b; font-size: 14px;">
                    This is an automated message from the SQL Query Management System.
                  </p>
                </div>
              </body>
            </html>
          `,
        },
      ],
    };

    const credentials = btoa(`${mailjetApiKey}:${mailjetSecretKey}`);

    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${credentials}`,
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Mailjet API error: ${JSON.stringify(result)}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
