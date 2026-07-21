-- Complete the RoyalWin786 points-based lottery lifecycle.
-- Real-money deposits, withdrawals and cash prizes are intentionally out of scope.

alter table public.tickets
  add column if not exists matched_numbers integer[] not null default '{}'::integer[],
  add column if not exists match_count integer not null default 0 check (match_count >= 0),
  add column if not exists prize_points bigint not null default 0 check (prize_points >= 0),
  add column if not exists settled_at timestamptz;

create table if not exists public.draw_prize_tiers (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  matches_required integer not null check (matches_required > 0),
  prize_points bigint not null check (prize_points >= 0),
  label text not null,
  created_at timestamptz not null default now(),
  unique (draw_id, matches_required)
);

create index if not exists draw_prize_tiers_draw_idx
  on public.draw_prize_tiers(draw_id, matches_required desc);

alter table public.draw_prize_tiers enable row level security;

drop policy if exists "draw_prize_tiers_public_read" on public.draw_prize_tiers;
create policy "draw_prize_tiers_public_read" on public.draw_prize_tiers
for select to anon, authenticated
using (true);

drop policy if exists "draw_prize_tiers_admin_insert" on public.draw_prize_tiers;
create policy "draw_prize_tiers_admin_insert" on public.draw_prize_tiers
for insert to authenticated
with check (public.is_admin());

drop policy if exists "draw_prize_tiers_admin_update" on public.draw_prize_tiers;
create policy "draw_prize_tiers_admin_update" on public.draw_prize_tiers
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "draw_prize_tiers_admin_delete" on public.draw_prize_tiers;
create policy "draw_prize_tiers_admin_delete" on public.draw_prize_tiers
for delete to authenticated
using (public.is_admin());

revoke all on public.draw_prize_tiers from anon, authenticated;
grant select on public.draw_prize_tiers to anon, authenticated;
grant insert, update, delete on public.draw_prize_tiers to authenticated;

insert into public.draw_prize_tiers (draw_id, matches_required, prize_points, label)
select id, tier.matches_required, tier.prize_points, tier.label
from public.draws
cross join lateral (
  values
    (3, 250::bigint, '3 numbers'),
    (4, 2500::bigint, '4 numbers'),
    (5, 25000::bigint, '5 numbers'),
    (6, 250000::bigint, 'Jackpot')
) as tier(matches_required, prize_points, label)
where game_type = 'lottery' and picks_required >= tier.matches_required
on conflict (draw_id, matches_required) do nothing;

update public.draws
set prize_label = '2,50,000 reward points'
where code = 'RW-S7-042';

create or replace function public.purchase_lottery_ticket(p_draw_id uuid, p_numbers integer[])
returns table(ticket_id uuid, ticket_code text, balance_after bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player_id uuid := (select auth.uid());
  v_draw public.draws%rowtype;
  v_balance bigint;
  v_unique_count integer;
  v_ticket_id uuid;
  v_ticket_code text;
  v_daily_limit integer;
  v_spent_today bigint;
begin
  if v_player_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_player_id and role = 'player' and status = 'active'
  ) then
    raise exception 'Active player account required';
  end if;

  select * into v_draw from public.draws
  where id = p_draw_id and game_type = 'lottery'
  for update;

  if v_draw.id is null or v_draw.status <> 'open' or v_draw.closes_at <= now() then
    raise exception 'This lottery draw is not open';
  end if;

  if cardinality(p_numbers) <> v_draw.picks_required then
    raise exception 'Select exactly % numbers', v_draw.picks_required;
  end if;

  select count(distinct number) into v_unique_count from unnest(p_numbers) as number;
  if v_unique_count <> v_draw.picks_required then
    raise exception 'Lottery numbers must be unique';
  end if;

  if exists (select 1 from unnest(p_numbers) as number where number < 1 or number > v_draw.max_number) then
    raise exception 'Lottery number is outside the allowed range';
  end if;

  select daily_point_limit into v_daily_limit
  from public.responsible_play_settings
  where player_id = v_player_id;

  select coalesce(sum(-amount), 0) into v_spent_today
  from public.wallet_ledger
  where player_id = v_player_id
    and kind = 'debit'
    and reference_type = 'lottery_ticket'
    and created_at >= date_trunc('day', now());

  if v_daily_limit is not null and v_spent_today + v_draw.entry_points > v_daily_limit then
    raise exception 'Daily play limit reached';
  end if;

  select points_balance into v_balance from public.wallets
  where player_id = v_player_id
  for update;

  if v_balance is null or v_balance < v_draw.entry_points then
    raise exception 'Insufficient points balance';
  end if;

  update public.wallets
  set points_balance = points_balance - v_draw.entry_points
  where player_id = v_player_id
  returning points_balance into v_balance;

  insert into public.tickets (player_id, draw_id, selected_numbers, points_spent)
  values (
    v_player_id,
    p_draw_id,
    (select array_agg(number order by number) from unnest(p_numbers) as number),
    v_draw.entry_points
  )
  returning id, public.tickets.ticket_code into v_ticket_id, v_ticket_code;

  insert into public.wallet_ledger (
    player_id, kind, amount, balance_after, reference_type, reference_id, description, created_by
  ) values (
    v_player_id, 'debit', -v_draw.entry_points, v_balance, 'lottery_ticket', v_ticket_id,
    'RoyalWin lottery ticket purchase', v_player_id
  );

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, metadata)
  values (
    v_player_id, 'ticket.purchased', 'ticket', v_ticket_id::text,
    jsonb_build_object('draw_id', p_draw_id, 'points', v_draw.entry_points)
  );

  return query select v_ticket_id, v_ticket_code, v_balance;
end;
$$;

revoke all on function public.purchase_lottery_ticket(uuid, integer[]) from public;
grant execute on function public.purchase_lottery_ticket(uuid, integer[]) to authenticated;

create or replace function public.admin_create_lottery_draw(
  p_code text,
  p_name text,
  p_draw_at timestamptz,
  p_closes_at timestamptz,
  p_max_number integer default 36,
  p_picks_required integer default 6,
  p_entry_points integer default 100,
  p_prize_label text default '2,50,000 reward points'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_draw_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if nullif(trim(p_code), '') is null or nullif(trim(p_name), '') is null then
    raise exception 'Draw code and name are required';
  end if;
  if p_closes_at >= p_draw_at or p_draw_at <= now() then
    raise exception 'Draw timing is invalid';
  end if;
  if p_picks_required < 4 then
    raise exception 'Lottery draws require at least 4 numbers';
  end if;
  if p_max_number < p_picks_required then
    raise exception 'Maximum number must be at least the pick count';
  end if;

  insert into public.draws (
    code, name, game_type, status, draw_at, closes_at, max_number,
    picks_required, entry_points, prize_label, created_by
  ) values (
    upper(trim(p_code)), trim(p_name), 'lottery', 'draft', p_draw_at, p_closes_at,
    p_max_number, p_picks_required, p_entry_points, trim(p_prize_label), v_admin_id
  ) returning id into v_draw_id;

  insert into public.draw_prize_tiers (draw_id, matches_required, prize_points, label)
  select v_draw_id, tier.matches_required, tier.prize_points, tier.label
  from (
    values
      (greatest(1, p_picks_required - 3), (p_entry_points * 2)::bigint, 'Starter win'),
      (greatest(1, p_picks_required - 2), (p_entry_points * 10)::bigint, 'Bronze win'),
      (greatest(1, p_picks_required - 1), (p_entry_points * 100)::bigint, 'Silver win'),
      (p_picks_required, (p_entry_points * 2500)::bigint, 'Jackpot')
  ) as tier(matches_required, prize_points, label)
  on conflict (draw_id, matches_required) do update
    set prize_points = excluded.prize_points, label = excluded.label;

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, metadata)
  values (v_admin_id, 'draw.created', 'draw', v_draw_id::text, jsonb_build_object('code', upper(trim(p_code))));

  return v_draw_id;
end;
$$;

revoke all on function public.admin_create_lottery_draw(text, text, timestamptz, timestamptz, integer, integer, integer, text) from public;
grant execute on function public.admin_create_lottery_draw(text, text, timestamptz, timestamptz, integer, integer, integer, text) to authenticated;

create or replace function public.admin_open_lottery_draw(p_draw_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid := (select auth.uid());
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.draws
  set status = 'open'
  where id = p_draw_id and game_type = 'lottery' and status = 'draft' and closes_at > now();

  if not found then
    raise exception 'Only a future draft draw can be opened';
  end if;

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id)
  values (v_admin_id, 'draw.opened', 'draw', p_draw_id::text);
end;
$$;

revoke all on function public.admin_open_lottery_draw(uuid) from public;
grant execute on function public.admin_open_lottery_draw(uuid) to authenticated;

create or replace function public.admin_cancel_lottery_draw(p_draw_id uuid, p_reason text)
returns table(refunded_tickets integer, refunded_points bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_draw public.draws%rowtype;
  v_ticket record;
  v_balance bigint;
  v_refunded_tickets integer := 0;
  v_refunded_points bigint := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'Cancellation reason is required';
  end if;

  select * into v_draw from public.draws where id = p_draw_id for update;
  if v_draw.id is null or v_draw.status not in ('draft', 'open', 'closed') then
    raise exception 'This draw cannot be cancelled';
  end if;

  update public.draws set status = 'cancelled' where id = p_draw_id;

  for v_ticket in
    select * from public.tickets
    where draw_id = p_draw_id and status = 'confirmed'
    for update
  loop
    update public.wallets
    set points_balance = points_balance + v_ticket.points_spent
    where player_id = v_ticket.player_id
    returning points_balance into v_balance;

    update public.tickets
    set status = 'cancelled', settled_at = now()
    where id = v_ticket.id;

    insert into public.wallet_ledger (
      player_id, kind, amount, balance_after, reference_type, reference_id,
      idempotency_key, description, created_by
    ) values (
      v_ticket.player_id, 'release', v_ticket.points_spent, v_balance,
      'lottery_refund', v_ticket.id, 'lottery-refund:' || v_ticket.id::text,
      'Refund for cancelled draw ' || v_draw.code, v_admin_id
    ) on conflict (idempotency_key) do nothing;

    v_refunded_tickets := v_refunded_tickets + 1;
    v_refunded_points := v_refunded_points + v_ticket.points_spent;
  end loop;

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, metadata)
  values (
    v_admin_id, 'draw.cancelled', 'draw', p_draw_id::text,
    jsonb_build_object(
      'reason', trim(p_reason),
      'refunded_tickets', v_refunded_tickets,
      'refunded_points', v_refunded_points
    )
  );

  return query select v_refunded_tickets, v_refunded_points;
end;
$$;

revoke all on function public.admin_cancel_lottery_draw(uuid, text) from public;
grant execute on function public.admin_cancel_lottery_draw(uuid, text) to authenticated;

create or replace function public.admin_set_prize_tier(
  p_draw_id uuid,
  p_matches_required integer,
  p_prize_points bigint,
  p_label text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_prize_points < 0 or nullif(trim(p_label), '') is null then
    raise exception 'Prize tier is invalid';
  end if;
  if not exists (
    select 1 from public.draws
    where id = p_draw_id and status = 'draft' and p_matches_required between 1 and picks_required
  ) then
    raise exception 'Prize tiers can only be changed on draft draws';
  end if;

  insert into public.draw_prize_tiers (draw_id, matches_required, prize_points, label)
  values (p_draw_id, p_matches_required, p_prize_points, trim(p_label))
  on conflict (draw_id, matches_required) do update
    set prize_points = excluded.prize_points, label = excluded.label;
end;
$$;

revoke all on function public.admin_set_prize_tier(uuid, integer, bigint, text) from public;
grant execute on function public.admin_set_prize_tier(uuid, integer, bigint, text) to authenticated;

create or replace function public.admin_publish_lottery_result(p_draw_id uuid, p_result_numbers integer[])
returns table(settled_tickets integer, winning_tickets integer, awarded_points bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_draw public.draws%rowtype;
  v_result_numbers integer[];
  v_ticket record;
  v_matches integer[];
  v_match_count integer;
  v_prize_points bigint;
  v_balance bigint;
  v_settled integer := 0;
  v_winners integer := 0;
  v_awarded bigint := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select * into v_draw from public.draws where id = p_draw_id for update;
  if v_draw.id is null or v_draw.game_type <> 'lottery' or v_draw.status not in ('open', 'closed') then
    raise exception 'This draw cannot be published';
  end if;
  if v_draw.closes_at > now() then
    raise exception 'Draw sales must be closed before publishing a result';
  end if;
  if v_draw.draw_at > now() then
    raise exception 'The scheduled draw time has not been reached';
  end if;
  if cardinality(p_result_numbers) <> v_draw.picks_required then
    raise exception 'Result must contain exactly % numbers', v_draw.picks_required;
  end if;
  if (select count(distinct number) from unnest(p_result_numbers) as number) <> v_draw.picks_required then
    raise exception 'Result numbers must be unique';
  end if;
  if exists (
    select 1 from unnest(p_result_numbers) as number
    where number < 1 or number > v_draw.max_number
  ) then
    raise exception 'A result number is outside the allowed range';
  end if;

  select array_agg(number order by number) into v_result_numbers
  from unnest(p_result_numbers) as number;

  update public.draws
  set status = 'published', result_numbers = v_result_numbers, published_at = now()
  where id = p_draw_id;

  for v_ticket in
    select * from public.tickets
    where draw_id = p_draw_id and status = 'confirmed'
    for update
  loop
    select coalesce(array_agg(number order by number), '{}'::integer[])
      into v_matches
    from unnest(v_ticket.selected_numbers) as number
    where number = any(v_result_numbers);

    v_match_count := cardinality(v_matches);
    select coalesce(max(prize_points), 0) into v_prize_points
    from public.draw_prize_tiers
    where draw_id = p_draw_id and matches_required = v_match_count;

    update public.tickets
    set matched_numbers = v_matches,
        match_count = v_match_count,
        prize_points = v_prize_points,
        status = case when v_prize_points > 0 then 'winner'::public.ticket_status else 'non_winner'::public.ticket_status end,
        settled_at = now()
    where id = v_ticket.id;

    v_settled := v_settled + 1;

    if v_prize_points > 0 then
      update public.wallets
      set points_balance = points_balance + v_prize_points
      where player_id = v_ticket.player_id
      returning points_balance into v_balance;

      insert into public.wallet_ledger (
        player_id, kind, amount, balance_after, reference_type, reference_id,
        idempotency_key, description, created_by
      ) values (
        v_ticket.player_id, 'win', v_prize_points, v_balance, 'lottery_result', v_ticket.id,
        'lottery-result:' || v_ticket.id::text, 'RoyalWin lottery prize', v_admin_id
      ) on conflict (idempotency_key) do nothing;

      v_winners := v_winners + 1;
      v_awarded := v_awarded + v_prize_points;
    end if;
  end loop;

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, metadata)
  values (
    v_admin_id, 'draw.published', 'draw', p_draw_id::text,
    jsonb_build_object(
      'result_numbers', v_result_numbers,
      'settled_tickets', v_settled,
      'winning_tickets', v_winners,
      'awarded_points', v_awarded
    )
  );

  return query select v_settled, v_winners, v_awarded;
end;
$$;

revoke all on function public.admin_publish_lottery_result(uuid, integer[]) from public;
grant execute on function public.admin_publish_lottery_result(uuid, integer[]) to authenticated;

create or replace function public.admin_adjust_player_points(
  p_player_email text,
  p_points bigint,
  p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_player_id uuid;
  v_balance bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_points = 0 or abs(p_points) > 1000000 or nullif(trim(p_reason), '') is null then
    raise exception 'Point adjustment is invalid';
  end if;

  select id into v_player_id from public.profiles
  where lower(email) = lower(trim(p_player_email)) and role = 'player';
  if v_player_id is null then
    raise exception 'Player not found';
  end if;

  update public.wallets
  set points_balance = points_balance + p_points
  where player_id = v_player_id and points_balance + p_points >= 0
  returning points_balance into v_balance;

  if v_balance is null then
    raise exception 'Adjustment would create a negative balance';
  end if;

  insert into public.wallet_ledger (
    player_id, kind, amount, balance_after, reference_type, description, created_by
  ) values (
    v_player_id, 'adjustment', p_points, v_balance, 'admin_adjustment', trim(p_reason), v_admin_id
  );

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, metadata)
  values (
    v_admin_id, 'wallet.adjusted', 'profile', v_player_id::text,
    jsonb_build_object('points', p_points, 'reason', trim(p_reason))
  );

  return v_balance;
end;
$$;

revoke all on function public.admin_adjust_player_points(text, bigint, text) from public;
grant execute on function public.admin_adjust_player_points(text, bigint, text) to authenticated;

create or replace function public.admin_lottery_summary()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when public.is_admin() then jsonb_build_object(
    'players', (select count(*) from public.profiles where role = 'player'),
    'open_draws', (select count(*) from public.draws where game_type = 'lottery' and status = 'open'),
    'tickets', (select count(*) from public.tickets where status <> 'cancelled'),
    'points_sales', (select coalesce(sum(points_spent), 0) from public.tickets where status <> 'cancelled'),
    'winner_points', (select coalesce(sum(prize_points), 0) from public.tickets where status = 'winner')
  ) else null end;
$$;

revoke all on function public.admin_lottery_summary() from public;
grant execute on function public.admin_lottery_summary() to authenticated;

create or replace function public.verify_lottery_ticket(p_ticket_code text)
returns table(
  ticket_code text,
  draw_code text,
  draw_name text,
  draw_at timestamptz,
  selected_numbers integer[],
  result_numbers integer[],
  ticket_status public.ticket_status,
  match_count integer,
  prize_points bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    t.ticket_code,
    d.code,
    d.name,
    d.draw_at,
    t.selected_numbers,
    d.result_numbers,
    t.status,
    t.match_count,
    t.prize_points
  from public.tickets t
  join public.draws d on d.id = t.draw_id
  where upper(t.ticket_code) = upper(trim(p_ticket_code))
    and ((select auth.uid()) = t.player_id or public.is_admin());
$$;

revoke all on function public.verify_lottery_ticket(text) from public;
grant execute on function public.verify_lottery_ticket(text) to authenticated;

insert into public.audit_events (actor_id, event_type, entity_type, entity_id, metadata)
values (null, 'schema.upgraded', 'system', 'complete-lottery-system', jsonb_build_object('version', 3));
