alter table public.profiles add column if not exists email text;

update public.profiles as profile
set email = auth_user.email
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.email is distinct from auth_user.email;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, role, display_name, email, phone)
  values (
    new.id,
    'player',
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    new.email,
    new.phone
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = excluded.phone,
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
