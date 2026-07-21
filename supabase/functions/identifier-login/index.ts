import { createClient } from "npm:@supabase/supabase-js@2.110.7";

const productionOrigin = "https://royalwin786-games.github.io";
const allowedOrigins = new Set([productionOrigin, "http://localhost:3000", "http://127.0.0.1:3000"]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || productionOrigin;
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : productionOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function response(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return response(request, { error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return response(request, { error: "Login service is not configured." }, 503);

  try {
    const body = await request.json();
    const identifier = String(body?.identifier || "").trim();
    const password = String(body?.password || "");
    if (!/^\+[1-9]\d{7,14}$/.test(identifier) || password.length < 8) {
      return response(request, { error: "Invalid mobile number or password." }, 401);
    }

    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const attemptKey = await sha256(`${forwardedFor}:${identifier}`);
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: attemptAllowed, error: attemptError } = await adminClient.rpc("consume_auth_login_attempt", { p_attempt_key: attemptKey });
    if (attemptError) return response(request, { error: "Login service is temporarily unavailable." }, 503);
    if (!attemptAllowed) return response(request, { error: "Too many login attempts. Try again after 15 minutes." }, 429);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, role, status")
      .eq("login_phone", identifier)
      .maybeSingle();

    if (!profile?.email || profile.role !== "player" || profile.status !== "active") {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return response(request, { error: "Invalid mobile number or password." }, 401);
    }

    const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await publicClient.auth.signInWithPassword({ email: profile.email, password });
    if (error || !data.session) return response(request, { error: "Invalid mobile number or password." }, 401);

    return response(request, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    });
  } catch {
    return response(request, { error: "Unable to process the login request." }, 400);
  }
});

