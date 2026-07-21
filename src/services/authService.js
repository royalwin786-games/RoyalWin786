import { requireSupabase } from "../lib/supabase";

function normalizeEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
  throw new Error("Enter a valid email address.");
}

async function getProfile(userId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id, role, display_name, email, phone, status")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function requestPlayerMagicLink(email, redirectTo) {
  const client = requireSupabase();
  const normalizedEmail = normalizeEmail(email);
  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo, data: { account_type: "player" } },
  });
  if (error) throw error;
  return normalizedEmail;
}

export async function signInAdmin(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  const profile = await getProfile(data.user.id);
  if (profile.role !== "admin" || profile.status !== "active") {
    await client.auth.signOut();
    throw new Error("This account does not have active admin access.");
  }
  return { session: data.session, user: data.user, profile };
}

export async function getCurrentIdentity() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session?.user) return null;
  const profile = await getProfile(data.session.user.id);
  if (profile.status !== "active") {
    await client.auth.signOut();
    throw new Error("This account is not active.");
  }
  return { session: data.session, user: data.session.user, profile };
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}
