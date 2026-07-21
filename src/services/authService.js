import { requireSupabase } from "../lib/supabase";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  if (emailPattern.test(value)) return value;
  throw new Error("Enter a valid email address.");
}

export function normalizePhone(phone) {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  const value = digits.length === 10
    ? `+91${digits}`
    : `+${digits}`;
  if (/^\+[1-9]\d{7,14}$/.test(value)) return value;
  throw new Error("Enter a valid mobile number with country code.");
}

function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw new Error("Password must contain at least 8 characters, including a letter and number.");
  }
  return value;
}

async function getProfile(userId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id, role, display_name, email, phone, age, status")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

function assertActivePlayer(profile) {
  if (profile.role !== "player" || profile.status !== "active") {
    throw new Error("This account does not have active player access.");
  }
}

export async function registerPlayer({ name, email, phone, age, password, redirectTo }) {
  const client = requireSupabase();
  const normalizedName = String(name || "").trim().replace(/\s+/g, " ");
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const numericAge = Number(age);
  const safePassword = validatePassword(password);

  if (normalizedName.length < 2 || normalizedName.length > 80) {
    throw new Error("Enter your full name.");
  }
  if (!Number.isInteger(numericAge) || numericAge < 18 || numericAge > 100) {
    throw new Error("Players must be 18 years or older.");
  }

  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password: safePassword,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        account_type: "player",
        display_name: normalizedName,
        phone: normalizedPhone,
        phone_e164: normalizedPhone,
        age: numericAge,
      },
    },
  });
  if (error) throw error;
  return { email: normalizedEmail, user: data.user, session: data.session };
}

export async function verifyRegistrationOtp(email, token) {
  const client = requireSupabase();
  const normalizedEmail = normalizeEmail(email);
  const normalizedToken = String(token || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(normalizedToken)) throw new Error("Enter the 6-digit OTP from your email.");

  const { data, error } = await client.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type: "email",
  });
  if (error) throw error;
  if (!data.user) throw new Error("Email verification could not be completed.");

  const profile = await getProfile(data.user.id);
  assertActivePlayer(profile);
  return { session: data.session, user: data.user, profile };
}

export async function resendRegistrationOtp(email, redirectTo) {
  const client = requireSupabase();
  const { error } = await client.auth.resend({
    type: "signup",
    email: normalizeEmail(email),
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signInPlayer(identifier, password) {
  const client = requireSupabase();
  const value = String(identifier || "").trim();
  const safePassword = validatePassword(password);
  let authData;

  if (value.includes("@")) {
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizeEmail(value),
      password: safePassword,
    });
    if (error) throw error;
    authData = data;
  } else {
    const { data, error } = await client.functions.invoke("identifier-login", {
      body: { identifier: normalizePhone(value), password: safePassword },
    });
    if (error) {
      let message = "Invalid mobile number or password.";
      try {
        const payload = await error.context?.json();
        if (payload?.error) message = payload.error;
      } catch {
        // Keep a generic authentication error if the function response is unavailable.
      }
      throw new Error(message);
    }
    if (!data?.access_token || !data?.refresh_token) throw new Error(data?.error || "Invalid mobile number or password.");
    const { data: sessionData, error: sessionError } = await client.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessionError) throw sessionError;
    authData = sessionData;
  }

  const user = authData.user || authData.session?.user;
  if (!user) throw new Error("Login could not be completed.");
  const profile = await getProfile(user.id);
  try {
    assertActivePlayer(profile);
  } catch (error) {
    await client.auth.signOut();
    throw error;
  }
  return { session: authData.session, user, profile };
}

export async function requestPasswordReset(email, redirectTo) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo });
  if (error) throw error;
}

export async function updateRecoveredPassword(password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.updateUser({ password: validatePassword(password) });
  if (error) throw error;
  return data.user;
}

export function subscribeToAuthChanges(callback) {
  const client = requireSupabase();
  const { data } = client.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

export async function signInAdmin(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email: normalizeEmail(email), password });
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
