// Declare Deno to resolve "Cannot find name 'Deno'" TypeScript errors in standard React/Node setups
declare const Deno: any;

// @ts-ignore: URL imports cause errors in standard Node/React TypeScript setups but are correct for Deno Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Validate and get environment variables safely to prevent crashes
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Server Configuration Error: Missing environment variables.");
      return new Response(
        JSON.stringify({ error: "Server configuration error. Missing environment variables." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Safely parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      email,
      password,
      name,
      role = "cashier",
      position,
      salary = 0,
      deductions = 0,
      workingDays = 26,
      attendance = 0,
      absences = 0,
      status = "active",
      joinDate,
      phone = null,
    } = body;

    // 4. Validate required fields
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "Email, password, and name are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Initialize Supabase Admin client to bypass RLS
    // persistSession: false prevents local storage warnings in Edge runtime
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 6. Create the user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim() },
    });

    if (authError || !authData?.user) {
      console.error('Auth creation error:', authError);
      return new Response(
        JSON.stringify({ error: authError?.message || 'Failed to create user in Auth.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    const timestamp = new Date().toISOString();

    const employeePayload = {
      id: userId,
      name: name.trim(),
      email: email.trim(),
      phone,
      role: role.trim(),
      position: position?.trim() || 'Cashier',
      salary: Number(salary) || 0,
      deductions: Number(deductions) || 0,
      working_days: Number(workingDays) || 26,
      attendance: Number(attendance) || 0,
      absences: Number(absences) || 0,
      status: status?.trim() || 'active',
      join_date: joinDate || new Date().toISOString().slice(0, 10),
      created_at: timestamp,
      user_id: userId,
    };

    const { data: employeeData, error: employeeError } = await supabaseAdmin.from('employees').insert(employeePayload).select().single();

    if (employeeError || !employeeData) {
      console.error('Employee creation error:', employeeError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Failed to create employee record: ${employeeError?.message ?? 'unknown'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: userId,
      role: role.trim(),
    });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      await supabaseAdmin.from('employees').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Failed to assign role: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, employee: employeeData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Unexpected Edge Function Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unexpected server error occurred."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
