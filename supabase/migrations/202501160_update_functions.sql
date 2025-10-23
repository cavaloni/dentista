-- Migration: Update database functions for multitenancy

-- Update the attempt_claim function to use company_id
CREATE OR REPLACE FUNCTION public.attempt_claim(_company_id uuid, _slot_id uuid, _claim_id uuid, _response text)
returns table(claim_id uuid, won boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  slot_record public.slots;
  claim_record public.claims;
begin
  select * into slot_record
  from public.slots
  where id = _slot_id
    and company_id = _company_id
  for update;

  if not found then
    raise exception 'slot_not_found';
  end if;

  select * into claim_record
  from public.claims
  where id = _claim_id
    and slot_id = _slot_id
    and company_id = _company_id
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

-- Update the release_slot function to use company_id
CREATE OR REPLACE FUNCTION public.release_slot(
  _company_id uuid,
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
security definer
set search_path = public
as $$
declare
  new_slot_id uuid;
  new_claim_id uuid;
  slot_rec record;
  has_recipients boolean := false;
  cutoff timestamptz := timezone(coalesce(_timezone, 'Europe/Amsterdam'), now()) + make_interval(mins => _claim_window_minutes);
begin
  insert into public.slots (
    company_id,
    start_at,
    duration_minutes,
    notes,
    status,
    expires_at,
    wave_number,
    claim_window_minutes,
    released_by
  ) values (
    _company_id,
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
    where company_id = _company_id
      and active is true
    order by priority desc, created_at asc
    limit _wave_size
  loop
    insert into public.claims (
      company_id,
      slot_id,
      waitlist_member_id,
      status,
      wave_number,
      notified_at
    ) values (
      _company_id,
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

-- Update expire_open_slots function to work with multitenancy
CREATE OR REPLACE FUNCTION public.expire_open_slots()
returns setof public.slots
language plpgsql
security definer
set search_path = public
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

-- Create new service role function for slot operations with company context
CREATE OR REPLACE FUNCTION public.expire_open_slots_for_company(_company_id uuid)
returns setof public.slots
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.slots s
    set status = 'expired'
  where s.status = 'open'
    and s.company_id = _company_id
    and s.expires_at <= timezone('Europe/Amsterdam', now())
  returning *;
end;
$$;

grant execute on function public.expire_open_slots_for_company(uuid) to service_role;