import { requireSupabase } from "../lib/supabase";

export async function getOrCreateReferralCode() {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  const { data: profile } = await client.from("profiles").select("referral_code").eq("id", user.id).single();
  if (profile?.referral_code) return profile.referral_code;
  const { data } = await client.rpc("generate_referral_code", { user_id: user.id });
  return data;
}

export async function applyReferralCode(code, newUserEmail) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  const { data: referrer } = await client.from("profiles").select("id, email").eq("referral_code", code.toUpperCase()).single();
  if (!referrer) throw new Error("Invalid referral code!");
  if (referrer.id === user.id) throw new Error("You cannot use your own referral code!");
  await client.from("referrals").insert({
    referrer_id: referrer.id, referrer_email: referrer.email,
    referred_id: user.id, referred_email: newUserEmail,
    referral_code: code.toUpperCase(),
  });
  await client.from("profiles").update({ referred_by: code.toUpperCase() }).eq("id", user.id);
  // Award bonuses via RPC
  await client.rpc("admin_adjust_player_points", { p_player_email: referrer.email, p_delta: 200, p_reason: `Referral bonus: ${newUserEmail} joined` });
  await client.rpc("admin_adjust_player_points", { p_player_email: newUserEmail, p_delta: 100, p_reason: "Welcome bonus: referral code applied" });
}

export async function getMyReferrals() {
  const client = requireSupabase();
  const { data, error } = await client.from("referrals").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getVipLevels() {
  const { data, error } = await requireSupabase().from("vip_levels").select("*").order("min_spent");
  if (error) throw error;
  return data || [];
}

export async function getPlayerVipInfo() {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  const { data, error } = await client.from("profiles").select("vip_level, total_spent, total_won, referral_code, referred_by").eq("id", user.id).single();
  if (error) throw error;
  return data;
}
