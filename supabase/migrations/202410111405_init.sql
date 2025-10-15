-- Enable useful extensions --------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Enumerated types ----------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'contact_channel') then
    create type public.contact_channel as enum ('whatsapp', 'sms', 'email');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'slot_status') then
    create type public.slot_status as enum ('open', 'claimed', 'booked', 'expired');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'claim_status') then
    create type public.claim_status as enum ('pending', 'won', 'lost', 'expired', 'cancelled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'message_direction') then
    create type public.message_direction as enum ('outbound', 'inbound');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'message_status') then
    create type public.message_status as enum ('queued', 'sent', 'failed', 'received');
  end if;
end $$;

-- Helper functions ----------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('Europe/Amsterdam', now());
  return new;
end;
$$;

create or replace function public.current_practice_id()
returns uuid
security definer
set search_path = public
language sql stable
as $$
  select p.practice_id
  from public.profiles p
  where p.user_id = auth.uid();
$$;

grant execute on function public.current_practice_id() to authenticated;

-- Core tables ---------------------------------------------------------------
create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Europe/Amsterdam',
  claim_window_minutes integer not null default 10,
  recipients_per_wave integer not null default 5,
  default_duration_minutes integer not null default 30,
  resend_cooldown_minutes integer not null default 3,
  confirmation_template text not null default 'Hi {{name}}, your appointment at {{slot_start}} is confirmed.',
  taken_template text not null default 'Hi {{name}}, sorry — the slot at {{slot_start}} has been taken.',
  invite_template text not null default 'Hi {{name}}, we have a {{duration}} minute opening at {{slot_start}}. Reply YES within {{claim_window}} minutes to claim.',
  created_at timestamptz not null default timezone('Europe/Amsterdam', now()),
  updated_at timestamptz not null default timezone('Europe/Amsterdam', now())
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  practice_id uuid not null references public.practices(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default timezone('Europe/Amsterdam', now()),
  updated_at timestamptz not null default timezone('Europe/Amsterdam', now())
);

create table if not exists public.waitlist_members (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  full_name text not null,
  channel public.contact_channel not null,
  address text not null,
  priority integer not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('Europe/Amsterdam', now()),
  updated_at timestamptz not null default timezone('Europe/Amsterdam', now()),
  last_notified_at timestamptz
);

create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  start_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  notes text,
  status public.slot_status not null default 'open',
  expires_at timestamptz not null,
  wave_number integer not null default 1,
  claim_window_minutes integer not null,
  released_by uuid references auth.users on delete set null,
  claimed_claim_id uuid,
  claimed_at timestamptz,
  created_at timestamptz not null default timezone('Europe/Amsterdam', now()),
  updated_at timestamptz not null default timezone('Europe/Amsterdam', now())
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  slot_id uuid not null references public.slots(id) on delete cascade,
  waitlist_member_id uuid not null references public.waitlist_members(id) on delete cascade,
  status public.claim_status not null default 'pending',
  wave_number integer not null,
  response_body text,
  response_received_at timestamptz,
  notified_at timestamptz not null default timezone('Europe/Amsterdam', now()),
  created_at timestamptz not null default timezone('Europe/Amsterdam', now()),
  updated_at timestamptz not null default timezone('Europe/Amsterdam', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  slot_id uuid references public.slots(id) on delete set null,
  claim_id uuid references public.claims(id) on delete set null,
  waitlist_member_id uuid references public.waitlist_members(id) on delete set null,
  channel public.contact_channel not null,
  direction public.message_direction not null,
  status public.message_status not null default 'queued',
  template_key text,
  body text not null,
  external_message_id text,
  attempt integer not null default 0,
  error text,
  metadata jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('Europe/Amsterdam', now()),
  updated_at timestamptz not null default timezone('Europe/Amsterdam', now())
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid references public.practices(id) on delete set null,
  provider text not null,
  payload jsonb not null,
  headers jsonb,
  received_at timestamptz not null default timezone('Europe/Amsterdam', now())
);

create unique index if not exists messages_external_id_idx
  on public.messages(channel, external_message_id)
  where external_message_id is not null;

create unique index if not exists one_winner_per_slot
  on public.claims(slot_id)
  where status = 'won';

create index if not exists waitlist_members_practice_active_priority_idx
  on public.waitlist_members(practice_id, active, priority desc, created_at asc);

create index if not exists slots_practice_status_idx
  on public.slots(practice_id, status, expires_at);

create index if not exists claims_slot_status_idx
  on public.claims(slot_id, status);

create index if not exists messages_practice_created_idx
  on public.messages(practice_id, created_at desc);

-- Triggers ------------------------------------------------------------------
create trigger set_practices_updated_at
  before update on public.practices
  for each row execute procedure public.handle_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_waitlist_members_updated_at
  before update on public.waitlist_members
  for each row execute procedure public.handle_updated_at();

create trigger set_slots_updated_at
  before update on public.slots
  for each row execute procedure public.handle_updated_at();

create trigger set_claims_updated_at
  before update on public.claims
  for each row execute procedure public.handle_updated_at();

create trigger set_messages_updated_at
  before update on public.messages
  for each row execute procedure public.handle_updated_at();

-- Concurrency safe claim function ------------------------------------------
create or replace function public.attempt_claim(_practice_id uuid, _slot_id uuid, _claim_id uuid, _response text)
returns table(claim_id uuid, won boolean)
language plpgsql
as $$
declare
  slot_record public.slots;
  claim_record public.claims;
begin
  select * into slot_record
  from public.slots
  where id = _slot_id
    and practice_id = _practice_id
  for update;

  if not found then
    raise exception 'slot_not_found';
  end if;

  select * into claim_record
  from public.claims
  where id = _claim_id
    and slot_id = _slot_id
    and practice_id = _practice_id
  for update;

  if not found then
    raise exception 'claim_not_found';
  end if;

  if slot_record.status <> 'open' then
    update public.claims
      set status = 'lost',
          response_body = coalesce(_response, response_body),
          response_received_at = timezone('Europe/Amsterdam', now())
      where id = _claim_id;
    return query select claim_record.id, false;
  end if;

  update public.claims
    set status = 'won',
        response_body = coalesce(_response, response_body),
        response_received_at = timezone('Europe/Amsterdam', now())
    where id = _claim_id
      and status = 'pending'
    returning id
    into claim_record.id;

  if not found then
    -- Already processed elsewhere
    return query select _claim_id, false;
  end if;

  update public.slots
    set status = 'claimed',
        claimed_claim_id = claim_record.id,
        claimed_at = timezone('Europe/Amsterdam', now())
    where id = _slot_id;

  update public.claims
    set status = 'lost'
    where slot_id = _slot_id
      and id <> claim_record.id
      and status in ('pending', 'expired');

  return query select claim_record.id, true;
end;
$$;

grant execute on function public.attempt_claim(uuid, uuid, uuid, text) to authenticated;

create or replace function public.release_slot(
  _practice_id uuid,
  _start_at timestamptz,
  _duration_minutes integer,
  _notes text,
  _claim_window_minutes integer,
  _wave_size integer,
  _released_by uuid,
  _timezone text
)
returns table(slot_id uuid, claim_id uuid, waitlist_member_id uuid, wave_number integer)
language plpgsql
as $$
declare
  new_slot_id uuid;
  new_claim_id uuid;
  slot_rec record;
  has_recipients boolean := false;
  cutoff timestamptz := timezone(coalesce(_timezone, 'Europe/Amsterdam'), now()) + make_interval(mins => _claim_window_minutes);
begin
  insert into public.slots (
    practice_id,
    start_at,
    duration_minutes,
    notes,
    status,
    expires_at,
    wave_number,
    claim_window_minutes,
    released_by
  ) values (
    _practice_id,
    _start_at,
    _duration_minutes,
    _notes,
    'open',
    cutoff,
    1,
    _claim_window_minutes,
    _released_by
  ) returning id into new_slot_id;

  for slot_rec in
    select id
    from public.waitlist_members
    where practice_id = _practice_id
      and active is true
    order by priority desc, created_at asc
    limit _wave_size
  loop
    insert into public.claims (
      practice_id,
      slot_id,
      waitlist_member_id,
      status,
      wave_number,
      notified_at
    ) values (
      _practice_id,
      new_slot_id,
      slot_rec.id,
      'pending',
      1,
      timezone('Europe/Amsterdam', now())
    ) returning id into new_claim_id;

    update public.waitlist_members
      set last_notified_at = timezone('Europe/Amsterdam', now())
      where id = slot_rec.id;

    has_recipients := true;
    return query select new_slot_id, new_claim_id, slot_rec.id, 1;
  end loop;

  if not has_recipients then
    return query select new_slot_id, null::uuid, null::uuid, 1;
  end if;

  return;
end;
$$;

grant execute on function public.release_slot(uuid, timestamptz, integer, text, integer, integer, uuid, text) to authenticated;

-- Slot expiry helper --------------------------------------------------------
create or replace function public.expire_open_slots()
returns setof public.slots
language plpgsql
as $$
begin
  return query
  update public.slots s
    set status = 'expired'
  where s.status = 'open'
    and s.expires_at <= timezone('Europe/Amsterdam', now())
  returning *;
end;
$$;

grant execute on function public.expire_open_slots() to service_role;

-- RLS Policies --------------------------------------------------------------
alter table public.practices enable row level security;
alter table public.profiles enable row level security;
alter table public.waitlist_members enable row level security;
alter table public.slots enable row level security;
alter table public.claims enable row level security;
alter table public.messages enable row level security;
alter table public.webhook_events enable row level security;

create policy "practice_select" on public.practices
  for select using (id = public.current_practice_id());

create policy "practice_update" on public.practices
  for update using (id = public.current_practice_id());

create policy "profiles_select" on public.profiles
  for select using (user_id = auth.uid());

create policy "profiles_update" on public.profiles
  for update using (user_id = auth.uid());

create policy "waitlist_select" on public.waitlist_members
  for select using (practice_id = public.current_practice_id());

create policy "waitlist_change" on public.waitlist_members
  for all using (practice_id = public.current_practice_id())
  with check (practice_id = public.current_practice_id());

create policy "slots_select" on public.slots
  for select using (practice_id = public.current_practice_id());

create policy "slots_change" on public.slots
  for all using (practice_id = public.current_practice_id())
  with check (practice_id = public.current_practice_id());

create policy "claims_select" on public.claims
  for select using (practice_id = public.current_practice_id());

create policy "claims_change" on public.claims
  for all using (practice_id = public.current_practice_id())
  with check (practice_id = public.current_practice_id());

create policy "messages_select" on public.messages
  for select using (practice_id = public.current_practice_id());

create policy "messages_insert" on public.messages
  for insert with check (practice_id = public.current_practice_id());

create policy "messages_update" on public.messages
  for update using (practice_id = public.current_practice_id());

create policy "webhooks_select" on public.webhook_events
  for select using (practice_id is null or practice_id = public.current_practice_id());

create policy "webhooks_insert" on public.webhook_events
  for insert with check (practice_id is null or practice_id = public.current_practice_id());

-- Ensure RLS enforced -------------------------------------------------------
alter table public.practices force row level security;
alter table public.profiles force row level security;
alter table public.waitlist_members force row level security;
alter table public.slots force row level security;
alter table public.claims force row level security;
alter table public.messages force row level security;
alter table public.webhook_events force row level security;
