-- Add notification settings to practices table
alter table public.practices
add column if not exists enable_browser_notifications boolean not null default true,
add column if not exists enable_sound_notifications boolean not null default true,
add column if not exists auto_confirm_bookings boolean not null default false;

-- Add index for performance
create index if not exists practices_notification_settings_idx
on public.practices(enable_browser_notifications, enable_sound_notifications, auto_confirm_bookings);