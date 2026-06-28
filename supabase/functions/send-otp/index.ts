import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_EXPIRY_MINUTES = 5;

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
    const { email, purpose = "signup" } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normEmail = email.trim().toLowerCase();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check resend cooldown — look at most recent OTP for this email/purpose
    const { data: recent } = await supabase
      .from("email_otps")
      .select("last_sent_at")
      .eq("email", normEmail)
      .eq("purpose", purpose)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      const elapsed = (Date.now() - new Date(recent.last_sent_at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        return new Response(
          JSON.stringify({ error: "cooldown", retryAfter: wait }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Invalidate previous unused OTPs for this email/purpose
    await supabase
      .from("email_otps")
      .update({ used_at: new Date().toISOString() })
      .eq("email", normEmail)
      .eq("purpose", purpose)
      .is("used_at", null);

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = normEmail;
    const codeHash = await hashCode(code, salt);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000).toISOString();

    const { error: insErr } = await supabase.from("email_otps").insert({
      email: normEmail,
      code_hash: codeHash,
      purpose,
      expires_at: expiresAt,
      last_sent_at: new Date().toISOString(),
    });
    if (insErr) throw insErr;

    // TODO: Send via email provider once domain is configured.
    // For now, log to function logs so dev can read the code.
    console.log(`[OTP] email=${normEmail} purpose=${purpose} code=${code} expiresAt=${expiresAt}`);

    return new Response(
      JSON.stringify({ success: true, expiresInSeconds: OTP_EXPIRY_MINUTES * 60 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-otp error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});