import { requireSupabase } from "../lib/supabase";

export async function getFeaturedLotteryDraw() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("draws")
    .select("id, code, name, draw_at, closes_at, max_number, picks_required, entry_points, prize_label")
    .eq("game_type", "lottery")
    .eq("status", "open")
    .order("draw_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPlayerWallet() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("wallets")
    .select("points_balance, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function getPlayerTickets() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("tickets")
    .select("id, ticket_code, selected_numbers, status, created_at, draws(name, draw_at)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((ticket) => ({
    id: ticket.ticket_code,
    numbers: ticket.selected_numbers,
    draw: ticket.draws?.name || "RoyalWin Lottery",
    drawAt: ticket.draws?.draw_at || null,
    status: ticket.status === "confirmed" ? "Upcoming" : ticket.status,
  }));
}

export async function purchaseLotteryTicket(drawId, numbers) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("purchase_lottery_ticket", {
    p_draw_id: drawId,
    p_numbers: numbers,
  });
  if (error) throw error;
  return data;
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
    pointsDelta: round.demo_points_delta,
  };
}
