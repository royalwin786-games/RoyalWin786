import { requireSupabase } from "../lib/supabase";

const drawFields = `
  id, code, name, status, draw_at, closes_at, max_number, picks_required,
  entry_points, prize_label, result_numbers, published_at,
  draw_prize_tiers(matches_required, prize_points, label)
`;

function normalizeDraw(draw) {
  if (!draw) return null;
  return {
    ...draw,
    entry_points: Number(draw.entry_points || 0),
    draw_prize_tiers: [...(draw.draw_prize_tiers || [])].sort(
      (a, b) => Number(b.matches_required) - Number(a.matches_required),
    ),
  };
}

function normalizeTicket(ticket) {
  return {
    id: ticket.ticket_code,
    databaseId: ticket.id,
    numbers: ticket.selected_numbers || [],
    matchedNumbers: ticket.matched_numbers || [],
    matchCount: Number(ticket.match_count || 0),
    prizePoints: Number(ticket.prize_points || 0),
    pointsSpent: Number(ticket.points_spent || 0),
    draw: ticket.draws?.name || "RoyalWin Lottery",
    drawCode: ticket.draws?.code || "",
    drawAt: ticket.draws?.draw_at || null,
    resultNumbers: ticket.draws?.result_numbers || [],
    status: ticket.status,
    createdAt: ticket.created_at,
  };
}

export async function getFeaturedLotteryDraw() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("draws")
    .select(drawFields)
    .eq("game_type", "lottery")
    .eq("status", "open")
    .gt("closes_at", new Date().toISOString())
    .order("draw_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return normalizeDraw(data);
}

export async function getLotteryDraws() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("draws")
    .select(drawFields)
    .eq("game_type", "lottery")
    .in("status", ["open", "closed", "published"])
    .order("draw_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data || []).map(normalizeDraw);
}

export async function getPlayerWallet() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("wallets")
    .select("points_balance, updated_at")
    .single();
  if (error) throw error;
  return { ...data, points_balance: Number(data.points_balance || 0) };
}

export async function getWalletLedger() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("wallet_ledger")
    .select("id, kind, amount, balance_after, reference_type, description, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []).map((entry) => ({
    ...entry,
    amount: Number(entry.amount || 0),
    balance_after: Number(entry.balance_after || 0),
  }));
}

export async function getPlayerTickets() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("tickets")
    .select(`
      id, ticket_code, selected_numbers, matched_numbers, match_count,
      prize_points, points_spent, status, created_at,
      draws(code, name, draw_at, result_numbers)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeTicket);
}

export async function getResponsiblePlaySettings() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("responsible_play_settings")
    .select("daily_point_limit, session_limit_minutes, self_excluded_until, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function updateResponsiblePlaySettings(settings) {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const { data, error } = await client
    .from("responsible_play_settings")
    .update({
      daily_point_limit: Number(settings.dailyPointLimit),
      session_limit_minutes: Number(settings.sessionLimitMinutes),
    })
    .eq("player_id", userData.user.id)
    .select("daily_point_limit, session_limit_minutes, self_excluded_until, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function purchaseLotteryTicket(drawId, numbers) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("purchase_lottery_ticket", {
    p_draw_id: drawId,
    p_numbers: numbers,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function verifyLotteryTicket(ticketCode) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("verify_lottery_ticket", {
    p_ticket_code: String(ticketCode || "").trim(),
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}

export async function playDemoRoulette(choice) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("play_demo_roulette", { p_choice: choice });
  if (error) throw error;
  const round = Array.isArray(data) ? data[0] : data;
  return {
    number: round.result_number,
    color: round.result_color,
    won: round.won,
    pointsDelta: Number(round.demo_points_delta || 0),
  };
}

export async function getAdminLotteryData() {
  const client = requireSupabase();
  const [{ data: summary, error: summaryError }, { data: draws, error: drawsError }, { data: players, error: playersError }] = await Promise.all([
    client.rpc("admin_lottery_summary"),
    client
      .from("draws")
      .select(`${drawFields}, tickets(count)`)
      .eq("game_type", "lottery")
      .order("draw_at", { ascending: false })
      .limit(30),
    client
      .from("profiles")
      .select("id, display_name, email, status, created_at, wallets(points_balance)")
      .eq("role", "player")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (summaryError) throw summaryError;
  if (drawsError) throw drawsError;
  if (playersError) throw playersError;
  return {
    summary: summary || {},
    draws: (draws || []).map((draw) => ({
      ...normalizeDraw(draw),
      ticketCount: Number(draw.tickets?.[0]?.count || 0),
    })),
    players: (players || []).map((player) => {
      const wallet = Array.isArray(player.wallets) ? player.wallets[0] : player.wallets;
      return { ...player, pointsBalance: Number(wallet?.points_balance || 0) };
    }),
  };
}

export async function createLotteryDraw(input) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("admin_create_lottery_draw", {
    p_code: input.code,
    p_name: input.name,
    p_draw_at: new Date(input.drawAt).toISOString(),
    p_closes_at: new Date(input.closesAt).toISOString(),
    p_max_number: Number(input.maxNumber),
    p_picks_required: Number(input.picksRequired),
    p_entry_points: Number(input.entryPoints),
    p_prize_label: input.prizeLabel,
  });
  if (error) throw error;
  return data;
}

export async function openLotteryDraw(drawId) {
  const client = requireSupabase();
  const { error } = await client.rpc("admin_open_lottery_draw", { p_draw_id: drawId });
  if (error) throw error;
}

export async function cancelLotteryDraw(drawId, reason) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("admin_cancel_lottery_draw", {
    p_draw_id: drawId,
    p_reason: reason,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function updatePrizeTier(drawId, tier) {
  const client = requireSupabase();
  const { error } = await client.rpc("admin_set_prize_tier", {
    p_draw_id: drawId,
    p_matches_required: Number(tier.matchesRequired),
    p_prize_points: Number(tier.prizePoints),
    p_label: tier.label,
  });
  if (error) throw error;
}

export async function publishLotteryResult(drawId, numbers) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("admin_publish_lottery_result", {
    p_draw_id: drawId,
    p_result_numbers: numbers,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function adjustPlayerPoints(email, points, reason) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("admin_adjust_player_points", {
    p_player_email: email,
    p_points: Number(points),
    p_reason: reason,
  });
  if (error) throw error;
  return Number(data || 0);
}

export async function updatePlayerStatus(playerId, status) {
  const client = requireSupabase();
  const { error } = await client
    .from("profiles")
    .update({ status })
    .eq("id", playerId);
  if (error) throw error;
}

export async function getPlayerProfile(playerId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id, display_name, email, phone, age, role, status, created_at, wallets(points_balance)")
    .eq("id", playerId)
    .single();
  if (error) throw error;
  const wallet = Array.isArray(data.wallets) ? data.wallets[0] : data.wallets;
  return { ...data, pointsBalance: Number(wallet?.points_balance || 0) };
}
