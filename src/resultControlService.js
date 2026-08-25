import { requireSupabase } from "./supabase";

// ===== HOUSE SETTINGS =====
export async function getHouseSettings() {
  const { data, error } = await requireSupabase().from("house_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

export async function updateHouseSettings(settings) {
  const { error } = await requireSupabase().from("house_settings")
    .update({ ...settings, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) throw error;
}

// ===== DRAW RESULT CONTROL =====
export async function setDrawResultControl({ drawId, winningNumbers, forcedWinnerEmail, announceAt }) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  const { data: existing } = await client.from("draw_result_controls").select("id").eq("draw_id", drawId).single();
  if (existing) {
    const { error } = await client.from("draw_result_controls").update({
      controlled: true, winning_numbers: winningNumbers, forced_winner_email: forcedWinnerEmail,
      announce_at: announceAt, status: "pending", updated_at: new Date().toISOString()
    }).eq("draw_id", drawId);
    if (error) throw error;
  } else {
    const { error } = await client.from("draw_result_controls").insert({
      draw_id: drawId, controlled: true, winning_numbers: winningNumbers,
      forced_winner_email: forcedWinnerEmail, announce_at: announceAt,
      status: "pending", created_by: user.id
    });
    if (error) throw error;
  }
}

export async function getDrawResultControl(drawId) {
  const { data, error } = await requireSupabase().from("draw_result_controls")
    .select("*").eq("draw_id", drawId).single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function getAllDrawControls() {
  const { data, error } = await requireSupabase().from("draw_result_controls")
    .select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ===== SCHEDULED RESULTS =====
export async function scheduleResult({ drawId, drawName, winningNumbers, forcedWinnerEmail, scheduledAt }) {
  const { error } = await requireSupabase().from("scheduled_results").insert({
    draw_id: drawId, draw_name: drawName, winning_numbers: winningNumbers,
    forced_winner_email: forcedWinnerEmail, scheduled_at: scheduledAt, status: "scheduled"
  });
  if (error) throw error;
}

export async function getScheduledResults() {
  const { data, error } = await requireSupabase().from("scheduled_results")
    .select("*").order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function cancelScheduledResult(id) {
  const { error } = await requireSupabase().from("scheduled_results")
    .update({ status: "cancelled" }).eq("id", id);
  if (error) throw error;
}

// ===== PLAYER GAME CONTROLS =====
export async function getPlayerGameControls() {
  const { data, error } = await requireSupabase().from("player_game_controls")
    .select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getPlayerGameControl(playerEmail, gameType) {
  const client = requireSupabase();
  // Check specific game control first
  const { data: specific } = await client.from("player_game_controls")
    .select("*").eq("player_email", playerEmail).eq("game_type", gameType).eq("active", true).single();
  if (specific) return specific;
  // Fall back to "all" games control
  const { data: all } = await client.from("player_game_controls")
    .select("*").eq("player_email", playerEmail).eq("game_type", "all").eq("active", true).single();
  return all || null;
}

export async function setPlayerGameControl({ playerEmail, gameType, outcomeControl, houseEdgePercent, winStreakLimit, note }) {
  const client = requireSupabase();
  const { data: existing } = await client.from("player_game_controls")
    .select("id").eq("player_email", playerEmail).eq("game_type", gameType).single();
  if (existing) {
    const { error } = await client.from("player_game_controls").update({
      outcome_control: outcomeControl, house_edge_percent: houseEdgePercent,
      win_streak_limit: winStreakLimit, note, active: true,
      updated_at: new Date().toISOString()
    }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await client.from("player_game_controls").insert({
      player_email: playerEmail, game_type: gameType, outcome_control: outcomeControl,
      house_edge_percent: houseEdgePercent, win_streak_limit: winStreakLimit, note, active: true
    });
    if (error) throw error;
  }
}

export async function removePlayerGameControl(id) {
  const { error } = await requireSupabase().from("player_game_controls")
    .update({ active: false }).eq("id", id);
  if (error) throw error;
}

// ===== OUTCOME RESOLVER (called by card games) =====
export async function resolveOutcome(playerEmail, gameType, houseSettings) {
  try {
    const control = await getPlayerGameControl(playerEmail, gameType);
    if (!control) {
      // Use global house edge
      const edge = houseSettings?.card_games_house_edge ?? 50;
      return { outcome: Math.random() * 100 > edge ? "win" : "lose", source: "house_edge_global" };
    }
    switch (control.outcome_control) {
      case "force_win": return { outcome: "win", source: "forced" };
      case "force_loss": return { outcome: "lose", source: "forced" };
      case "house_edge": {
        const edge = control.house_edge_percent ?? 50;
        return { outcome: Math.random() * 100 > edge ? "win" : "lose", source: "house_edge_player" };
      }
      default: return { outcome: "random", source: "random" };
    }
  } catch {
    return { outcome: "random", source: "fallback" };
  }
}
