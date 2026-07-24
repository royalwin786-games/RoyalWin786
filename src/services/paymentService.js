import { requireSupabase } from "./supabase";

// ===== PAYMENT SETTINGS =====
export async function getPaymentSettings() {
  const client = requireSupabase();
  const { data, error } = await client.from("payment_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

export async function updatePaymentSettings(settings) {
  const client = requireSupabase();
  const { error } = await client.from("payment_settings").update({ ...settings, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) throw error;
}

// ===== DEPOSITS =====
export async function submitDeposit({ method, amount, coinsToAdd, utrNumber, upiId, notes, playerName, playerEmail }) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  const { error } = await client.from("deposits").insert({
    player_id: user.id,
    player_email: playerEmail,
    player_name: playerName,
    method,
    amount,
    coins_to_add: coinsToAdd,
    utr_number: utrNumber,
    upi_id: upiId,
    notes,
    status: "pending",
  });
  if (error) throw error;
}

export async function getPlayerDeposits() {
  const client = requireSupabase();
  const { data, error } = await client.from("deposits").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllDeposits() {
  const client = requireSupabase();
  const { data, error } = await client.from("deposits").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function approveDeposit(depositId, adminNote = "") {
  const client = requireSupabase();
  const { data: deposit, error: fetchErr } = await client.from("deposits").select("*").eq("id", depositId).single();
  if (fetchErr) throw fetchErr;
  const { error: walletErr } = await client.rpc("admin_adjust_player_points", {
    p_player_email: deposit.player_email,
    p_delta: deposit.coins_to_add,
    p_reason: `Deposit approved: ₹${deposit.amount} via ${deposit.method.toUpperCase()}`,
  });
  if (walletErr) throw walletErr;
  const { error } = await client.from("deposits").update({ status: "approved", admin_note: adminNote, updated_at: new Date().toISOString() }).eq("id", depositId);
  if (error) throw error;
}

export async function rejectDeposit(depositId, adminNote) {
  const client = requireSupabase();
  const { error } = await client.from("deposits").update({ status: "rejected", admin_note: adminNote, updated_at: new Date().toISOString() }).eq("id", depositId);
  if (error) throw error;
}

// ===== WITHDRAWALS =====
export async function submitWithdrawal({ method, amount, coinsToDeduct, upiId, bankName, accountNumber, ifscCode, accountHolder, playerName, playerEmail }) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  const { error } = await client.from("withdrawals").insert({
    player_id: user.id,
    player_email: playerEmail,
    player_name: playerName,
    method,
    amount,
    coins_to_deduct: coinsToDeduct,
    upi_id: upiId,
    bank_name: bankName,
    account_number: accountNumber,
    ifsc_code: ifscCode,
    account_holder: accountHolder,
    status: "pending",
  });
  if (error) throw error;
  // Deduct coins immediately (hold)
  await client.rpc("admin_adjust_player_points", {
    p_player_email: playerEmail,
    p_delta: -coinsToDeduct,
    p_reason: `Withdrawal request: ₹${amount} via ${method.toUpperCase()} (pending)`,
  });
}

export async function getPlayerWithdrawals() {
  const client = requireSupabase();
  const { data, error } = await client.from("withdrawals").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllWithdrawals() {
  const client = requireSupabase();
  const { data, error } = await client.from("withdrawals").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function approveWithdrawal(withdrawalId, transactionId, adminNote = "") {
  const client = requireSupabase();
  const { error } = await client.from("withdrawals").update({ status: "paid", transaction_id: transactionId, admin_note: adminNote, updated_at: new Date().toISOString() }).eq("id", withdrawalId);
  if (error) throw error;
}

export async function rejectWithdrawal(withdrawalId, adminNote) {
  const client = requireSupabase();
  const { data: withdrawal, error: fetchErr } = await client.from("withdrawals").select("*").eq("id", withdrawalId).single();
  if (fetchErr) throw fetchErr;
  // Refund coins
  await requireSupabase().rpc("admin_adjust_player_points", {
    p_player_email: withdrawal.player_email,
    p_delta: withdrawal.coins_to_deduct,
    p_reason: `Withdrawal rejected — coins refunded`,
  });
  const { error } = await client.from("withdrawals").update({ status: "rejected", admin_note: adminNote, updated_at: new Date().toISOString() }).eq("id", withdrawalId);
  if (error) throw error;
}

// ===== PRIZE PAYOUTS =====
export async function getAllPrizePayouts() {
  const client = requireSupabase();
  const { data, error } = await client.from("prize_payouts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updatePrizePayout(payoutId, { status, transactionId, adminNote }) {
  const client = requireSupabase();
  const { error } = await client.from("prize_payouts").update({ status, transaction_id: transactionId, admin_note: adminNote, updated_at: new Date().toISOString() }).eq("id", payoutId);
  if (error) throw error;
}
