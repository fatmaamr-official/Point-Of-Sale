import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(code + salt);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, code, purpose = "signup" } = await req.json();
    if (!email || !code) {
      return new Response(JSON.stringify({ error: "email and code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normEmail = String(email).trim().toLowerCase();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: otp, error: fetchErr } = await supabase
      .from("email_otps")
      .select("*")
      .eq("email", normEmail)
      .eq("purpose", purpose)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!otp) {
      return new Response(JSON.stringify({ error: "no_active_code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      await supabase.from("email_otps").update({ used_at: new Date().toISOString() }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "too_many_attempts" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedHash = await hashCode(String(code), normEmail);
    if (expectedHash !== otp.code_hash) {
      await supabase.from("email_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return new Response(
        JSON.stringify({ error: "invalid_code", attemptsLeft: MAX_ATTEMPTS - otp.attempts - 1 }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Success: mark used + flag profile email_verified
    await supabase.from("email_otps").update({ used_at: new Date().toISOString() }).eq("id", otp.id);

    // Find the user by email and mark verified
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normEmail)
      .maybeSingle();

    if (profile) {
      await supabase
        .from("profiles")
        .update({
          email_verified: true,
          email_verified_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
    }

    return new Response(JSON.stringify({ success: true, verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-otp error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});