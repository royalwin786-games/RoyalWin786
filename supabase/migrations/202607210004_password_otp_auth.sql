-- Player registration details, secure phone-login aliases and Edge Function rate limiting.

alter table public.profiles add column if not exists age smallint;
alter table public.profiles add column if not exists login_phone text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_age_check') then
    alter table public.profiles
      add constraint profiles_age_check check (age is null or age between 18 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_login_phone_check') then
    alter table public.profiles
      add constraint profiles_login_phone_check check (login_phone is null or login_phone ~ '^\+[1-9][0-9]{7,14}$');
  end if;
end
$$;

create unique index if not exists profiles_login_phone_unique_idx
on public.profiles(login_phone)
where login_phone is not null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  v_phone text := nullif(trim(new.raw_user_meta_data ->> 'phone_e164'), '');
  v_age smallint := case
    when coalesce(new.raw_user_meta_data ->> 'age', '') ~ '^[0-9]{1,3}$'
      then (new.raw_user_meta_data ->> 'age')::smallint
    else null
  end;
begin
  if new.raw_user_meta_data ->> 'account_type' = 'player' then
    if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 80 then
      raise exception 'A valid player name is required';
    end if;
    if v_phone is null or v_phone !~ '^\+[1-9][0-9]{7,14}$' then
      raise exception 'A valid mobile number is required';
    end if;
    if v_age is null or v_age < 18 or v_age > 100 then
      raise exception 'Players must be 18 years or older';
    end if;
  end if;

  insert into public.profiles (id, role, display_name, email, phone, login_phone, age)
  values (new.id, 'player', v_name, new.email, v_phone, v_phone, v_age)
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, profiles.display_name),
    email = excluded.email,
    phone = coalesce(excluded.phone, profiles.phone),
    login_phone = coalesce(excluded.login_phone, profiles.login_phone),
    age = coalesce(excluded.age, profiles.age),
    updated_at = now();

  insert into public.wallets (player_id, points_balance)
  values (new.id, 2500)
  on conflict (player_id) do nothing;

  insert into public.responsible_play_settings (player_id)
  values (new.id)
  on conflict (player_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

create table if not exists public.auth_login_attempts (
  attempt_key text primary key,
  attempt_count integer not null default 1,
  window_started timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.auth_login_attempts enable row level security;
revoke all on public.auth_login_attempts from public, anon, authenticated;

create or replace function public.consume_auth_login_attempt(p_attempt_key text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if p_attempt_key is null or char_length(p_attempt_key) <> 64 then
    return false;
  end if;

  insert into public.auth_login_attempts (attempt_key, attempt_count, window_started, updated_at)
  values (p_attempt_key, 1, now(), now())
  on conflict (attempt_key) do update set
    attempt_count = case
      when auth_login_attempts.window_started < now() - interval '15 minutes' then 1
      else auth_login_attempts.attempt_count + 1
    end,
    window_started = case
      when auth_login_attempts.window_started < now() - interval '15 minutes' then now()
      else auth_login_attempts.window_started
    end,
    updated_at = now()
  returning attempt_count into v_count;

  delete from public.auth_login_attempts
  where updated_at < now() - interval '1 day';

  return v_count <= 10;
end;
$$;

revoke all on function public.consume_auth_login_attempt(text) from public;
grant execute on function public.consume_auth_login_attempt(text) to service_role;
