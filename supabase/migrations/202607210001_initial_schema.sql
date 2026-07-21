-- RoyalWin786 MVP schema: Auth profiles, lottery draws/tickets, points ledger,
-- responsible-play settings, audit events, and demo roulette history.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('player', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_status as enum ('active', 'blocked', 'self_excluded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.draw_status as enum ('draft', 'open', 'closed', 'published', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ticket_status as enum ('confirmed', 'winner', 'non_winner', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ledger_kind as enum ('credit', 'debit', 'hold', 'release', 'win', 'adjustment');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'player',
  display_name text,
  email text,
  phone text,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  game_type text not null default 'lottery' check (game_type in ('lottery', 'roulette_demo')),
  status public.draw_status not null default 'draft',
  draw_at timestamptz not null,
  closes_at timestamptz not null,
  max_number integer not null default 36 check (max_number between 6 and 99),
  picks_required integer not null default 6 check (picks_required between 1 and 12),
  entry_points integer not null default 100 check (entry_points >= 0),
  prize_label text,
  result_numbers integer[],
  created_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at <= draw_at)
);

create table if not exists public.wallets (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  points_balance bigint not null default 2500 check (points_balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null unique default ('RW786-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  player_id uuid not null references public.profiles(id) on delete restrict,
  draw_id uuid not null references public.draws(id) on delete restrict,
  selected_numbers integer[] not null,
  points_spent integer not null check (points_spent >= 0),
  status public.ticket_status not null default 'confirmed',
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete restrict,
  kind public.ledger_kind not null,
  amount bigint not null,
  balance_after bigint not null check (balance_after >= 0),
  reference_type text not null,
  reference_id uuid,
  idempotency_key text unique,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.roulette_demo_rounds (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  choice text not null check (choice in ('Red', 'Black', 'Even', 'Odd')),
  result_number integer not null check (result_number between 0 and 36),
  result_color text not null check (result_color in ('Red', 'Black', 'Green')),
  won boolean not null,
  demo_points_delta integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.responsible_play_settings (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  daily_point_limit integer not null default 1000 check (daily_point_limit >= 0),
  session_limit_minutes integer not null default 60 check (session_limit_minutes between 5 and 1440),
  self_excluded_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tickets_player_created_idx on public.tickets(player_id, created_at desc);
create index if not exists tickets_draw_idx on public.tickets(draw_id);
create index if not exists draws_status_date_idx on public.draws(status, draw_at);
create index if not exists ledger_player_created_idx on public.wallet_ledger(player_id, created_at desc);
create index if not exists roulette_player_created_idx on public.roulette_demo_rounds(player_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists draws_set_updated_at on public.draws;
create trigger draws_set_updated_at before update on public.draws
for each row execute function public.set_updated_at();

drop trigger if exists wallets_set_updated_at on public.wallets;
create trigger wallets_set_updated_at before update on public.wallets
for each row execute function public.set_updated_at();

drop trigger if exists responsible_play_set_updated_at on public.responsible_play_settings;
create trigger responsible_play_set_updated_at before update on public.responsible_play_settings
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, role, display_name, email, phone)
  values (new.id, 'player', nullif(new.raw_user_meta_data ->> 'display_name', ''), new.email, new.phone)
  on conflict (id) do nothing;

  insert into public.wallets (player_id, points_balance)
  values (new.id, 2500)
  on conflict (player_id) do nothing;

  insert into public.responsible_play_settings (player_id)
  values (new.id)
  on conflict (player_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.draws enable row level security;
alter table public.wallets enable row level security;
alter table public.tickets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.roulette_demo_rounds enable row level security;
alter table public.responsible_play_settings enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
for select to authenticated
using ((select auth.uid()) = id or public.is_admin());

create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "draws_public_read" on public.draws
for select to anon, authenticated
using (status in ('open', 'closed', 'published') or public.is_admin());

create policy "draws_admin_insert" on public.draws
for insert to authenticated
with check (public.is_admin());

create policy "draws_admin_update" on public.draws
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "draws_admin_delete" on public.draws
for delete to authenticated
using (public.is_admin());

create policy "wallets_select_own_or_admin" on public.wallets
for select to authenticated
using ((select auth.uid()) = player_id or public.is_admin());

create policy "tickets_select_own_or_admin" on public.tickets
for select to authenticated
using ((select auth.uid()) = player_id or public.is_admin());

create policy "tickets_admin_update" on public.tickets
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "ledger_select_own_or_admin" on public.wallet_ledger
for select to authenticated
using ((select auth.uid()) = player_id or public.is_admin());

create policy "roulette_select_own_or_admin" on public.roulette_demo_rounds
for select to authenticated
using ((select auth.uid()) = player_id or public.is_admin());

create policy "responsible_play_select_own_or_admin" on public.responsible_play_settings
for select to authenticated
using ((select auth.uid()) = player_id or public.is_admin());

create policy "responsible_play_update_own" on public.responsible_play_settings
for update to authenticated
using ((select auth.uid()) = player_id)
with check ((select auth.uid()) = player_id);

create policy "audit_admin_read" on public.audit_events
for select to authenticated
using (public.is_admin());

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

revoke all on public.draws from anon, authenticated;
grant select on public.draws to anon, authenticated;
grant insert, update, delete on public.draws to authenticated;

revoke all on public.wallets from anon, authenticated;
revoke all on public.wallet_ledger from anon, authenticated;
grant select on public.wallets, public.wallet_ledger to authenticated;

revoke all on public.tickets from anon, authenticated;
grant select on public.tickets to authenticated;
grant update (status) on public.tickets to authenticated;

revoke all on public.roulette_demo_rounds from anon, authenticated;
grant select on public.roulette_demo_rounds to authenticated;

revoke all on public.responsible_play_settings from anon, authenticated;
grant select, update on public.responsible_play_settings to authenticated;

revoke all on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

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
  values (v_player_id, p_draw_id, (select array_agg(number order by number) from unnest(p_numbers) as number), v_draw.entry_points)
  returning id, public.tickets.ticket_code into v_ticket_id, v_ticket_code;

  insert into public.wallet_ledger (
    player_id, kind, amount, balance_after, reference_type, reference_id, description, created_by
  ) values (
    v_player_id, 'debit', -v_draw.entry_points, v_balance, 'lottery_ticket', v_ticket_id,
    'RoyalWin lottery ticket purchase', v_player_id
  );

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, metadata)
  values (v_player_id, 'ticket.purchased', 'ticket', v_ticket_id::text, jsonb_build_object('draw_id', p_draw_id));

  return query select v_ticket_id, v_ticket_code, v_balance;
end;
$$;

revoke all on function public.purchase_lottery_ticket(uuid, integer[]) from public;
grant execute on function public.purchase_lottery_ticket(uuid, integer[]) to authenticated;

create or replace function public.play_demo_roulette(p_choice text)
returns table(round_id uuid, result_number integer, result_color text, won boolean, demo_points_delta integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player_id uuid := (select auth.uid());
  v_numbers integer[] := array[0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27];
  v_red integer[] := array[32, 19, 21, 25, 34, 27];
  v_number integer;
  v_color text;
  v_won boolean;
  v_delta integer;
  v_round_id uuid;
begin
  if v_player_id is null or not exists (
    select 1 from public.profiles
    where id = v_player_id and role = 'player' and status = 'active'
  ) then
    raise exception 'Active player account required';
  end if;

  if p_choice not in ('Red', 'Black', 'Even', 'Odd') then
    raise exception 'Invalid roulette choice';
  end if;

  v_number := v_numbers[1 + floor(random() * cardinality(v_numbers))::integer];
  v_color := case
    when v_number = 0 then 'Green'
    when v_number = any(v_red) then 'Red'
    else 'Black'
  end;
  v_won := p_choice = v_color
    or (p_choice = 'Even' and v_number <> 0 and mod(v_number, 2) = 0)
    or (p_choice = 'Odd' and mod(v_number, 2) = 1);
  v_delta := case when v_won then 100 else -50 end;

  insert into public.roulette_demo_rounds (
    player_id, choice, result_number, result_color, won, demo_points_delta
  ) values (
    v_player_id, p_choice, v_number, v_color, v_won, v_delta
  ) returning id into v_round_id;

  return query select v_round_id, v_number, v_color, v_won, v_delta;
end;
$$;

revoke all on function public.play_demo_roulette(text) from public;
grant execute on function public.play_demo_roulette(text) to authenticated;

insert into public.draws (
  code, name, game_type, status, draw_at, closes_at, max_number, picks_required, entry_points, prize_label
) values (
  'RW-S7-042', 'RoyalWin Super 7', 'lottery', 'open', now() + interval '7 days',
  now() + interval '6 days 23 hours', 36, 6, 100, '2,50,000 reward points'
)
on conflict (code) do update set
  name = excluded.name,
  game_type = excluded.game_type,
  max_number = excluded.max_number,
  picks_required = excluded.picks_required,
  entry_points = excluded.entry_points,
  prize_label = excluded.prize_label;
