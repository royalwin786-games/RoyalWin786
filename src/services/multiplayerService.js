import { requireSupabase } from "../lib/supabase";

// Generate random code
function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Shuffle deck
function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function createDeck() {
  const suits = ["♠","♥","♦","♣"], ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const vals = {A:14,K:13,Q:12,J:11,10:10,9:9,8:8,7:7,6:6,5:5,4:4,3:3,2:2};
  return suits.flatMap(suit => ranks.map(rank => ({ suit, rank, val: vals[rank] })));
}

// ===== ROOM MANAGEMENT =====
export async function createRoom({ gameType = 'teen-patti', ante = 10, maxPlayers = 6 }) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  const { data: profile } = await client.from('profiles').select('display_name').eq('id', user.id).single();
  const code = makeCode();

  const { data: room, error } = await client.from('game_rooms').insert({
    code, game_type: gameType, host_id: user.id,
    host_name: profile?.display_name || 'Player',
    ante, max_players: maxPlayers, status: 'waiting',
  }).select().single();
  if (error) throw error;

  // Host joins as first player
  await joinRoom(room.code);
  return room;
}

export async function joinRoom(code) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  const { data: profile } = await client.from('profiles').select('display_name, wallets(points_balance)').eq('id', user.id).single();

  const { data: room, error: roomErr } = await client.from('game_rooms').select('*').eq('code', code.toUpperCase()).single();
  if (roomErr || !room) throw new Error('Room not found!');
  if (room.status !== 'waiting') throw new Error('Game already started!');

  const { data: players } = await client.from('room_players').select('*').eq('room_id', room.id).neq('status', 'left');
  if (players?.length >= room.max_players) throw new Error('Room is full!');

  const alreadyJoined = players?.find(p => p.player_id === user.id);
  if (alreadyJoined) return { room, player: alreadyJoined };

  const wallet = Array.isArray(profile?.wallets) ? profile.wallets[0] : profile?.wallets;
  const balance = Number(wallet?.points_balance || 0);
  if (balance < room.ante) throw new Error(`Not enough coins! Need ${room.ante} coins to join.`);

  const { data: player, error } = await client.from('room_players').insert({
    room_id: room.id, player_id: user.id,
    player_name: profile?.display_name || 'Player',
    seat: (players?.length || 0) + 1, status: 'active',
  }).select().single();
  if (error) throw error;

  await client.from('game_moves').insert({ room_id: room.id, player_id: user.id, player_name: profile?.display_name, move_type: 'join' });
  return { room, player };
}

export async function startGame(roomId) {
  const client = requireSupabase();
  const { data: players } = await client.from('room_players').select('*').eq('room_id', roomId).eq('status', 'active');
  if (!players || players.length < 2) throw new Error('Need at least 2 players to start!');

  const { data: room } = await client.from('game_rooms').select('ante').eq('id', roomId).single();

  // Shuffle and deal 13 cards each
  const deck = shuffle(createDeck());
  const gameState = { deck: deck.slice(players.length * 13), round: 1, phase: 'playing' };

  // Deal cards to each player
  for (let i = 0; i < players.length; i++) {
    const cards = deck.slice(i * 13, (i + 1) * 13);
    await client.from('room_players').update({ cards: JSON.stringify(cards), current_bet: room.ante }).eq('id', players[i].id);
    // Deduct ante from wallet
    await client.rpc('admin_adjust_player_points', {
      p_player_email: '', p_delta: -room.ante, p_reason: `Teen Patti ante: Room ${roomId}`
    }).eq('player_id', players[i].player_id);
  }

  const pot = players.length * room.ante;
  await client.from('game_rooms').update({
    status: 'playing', pot,
    current_turn: players[0].player_id,
    game_state: gameState, updated_at: new Date().toISOString()
  }).eq('id', roomId);

  await client.from('game_moves').insert({ room_id: roomId, player_id: players[0].player_id, player_name: players[0].player_name, move_type: 'start' });
}

export async function makeMove(roomId, moveType, amount = 0) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  const { data: profile } = await client.from('profiles').select('display_name').eq('id', user.id).single();

  const { data: room } = await client.from('game_rooms').select('*').eq('id', roomId).single();
  const { data: players } = await client.from('room_players').select('*').eq('room_id', roomId).neq('status', 'left').order('seat');

  const myPlayer = players?.find(p => p.player_id === user.id);
  if (!myPlayer) throw new Error('You are not in this room!');

  if (moveType === 'fold') {
    await client.from('room_players').update({ status: 'folded' }).eq('id', myPlayer.id);
  } else if (moveType === 'see') {
    await client.from('room_players').update({ is_seen: true }).eq('id', myPlayer.id);
  } else if (moveType === 'bet') {
    const newPot = (room.pot || 0) + amount;
    await client.from('game_rooms').update({ pot: newPot }).eq('id', roomId);
    await client.from('room_players').update({ current_bet: amount }).eq('id', myPlayer.id);
  }

  // Log move
  await client.from('game_moves').insert({ room_id: roomId, player_id: user.id, player_name: profile?.display_name, move_type: moveType, amount });

  // Next turn
  const activePlayers = players?.filter(p => p.status === 'active');
  if (activePlayers?.length <= 1 || moveType === 'show') {
    await endGame(roomId, activePlayers, room.pot);
    return;
  }

  const myIdx = activePlayers.findIndex(p => p.player_id === user.id);
  const nextPlayer = activePlayers[(myIdx + 1) % activePlayers.length];
  await client.from('game_rooms').update({ current_turn: nextPlayer.player_id, updated_at: new Date().toISOString() }).eq('id', roomId);
}

async function endGame(roomId, winners, pot) {
  const client = requireSupabase();
  // Simple: last active player wins (or showdown logic)
  const winner = winners?.[0];
  if (winner) {
    await client.rpc('admin_adjust_player_points', {
      p_player_email: '', p_delta: pot || 0, p_reason: `Teen Patti win: Room ${roomId}`
    });
    await client.from('game_rooms').update({ status: 'finished', game_state: { winner: winner.player_name, pot }, updated_at: new Date().toISOString() }).eq('id', roomId);
  }
}

export async function getRoomData(roomId) {
  const client = requireSupabase();
  const [{ data: room }, { data: players }, { data: moves }] = await Promise.all([
    client.from('game_rooms').select('*').eq('id', roomId).single(),
    client.from('room_players').select('*').eq('room_id', roomId).order('seat'),
    client.from('game_moves').select('*').eq('room_id', roomId).order('created_at', { ascending: false }).limit(20),
  ]);
  return { room, players: players || [], moves: moves || [] };
}

export async function subscribeToRoom(roomId, onUpdate) {
  const client = requireSupabase();
  return client.channel(`room:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_moves', filter: `room_id=eq.${roomId}` }, onUpdate)
    .subscribe();
}

export async function leaveRoom(roomId) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  await client.from('room_players').update({ status: 'left' }).eq('room_id', roomId).eq('player_id', user.id);
  await client.from('game_moves').insert({ room_id: roomId, player_id: user.id, move_type: 'leave' });
}

export async function getOpenRooms() {
  const { data, error } = await requireSupabase().from('game_rooms')
    .select('*, room_players(count)').eq('status', 'waiting').order('created_at', { ascending: false }).limit(10);
  if (error) throw error;
  return data || [];
}
