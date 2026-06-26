-- ============================================================
-- Wolf Marketplace v6 — SQL Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. ADDRESS BOOK — saved delivery addresses per user
-- ────────────────────────────────────────────────
create table if not exists public.address_book (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text default 'Home',          -- "Home", "Hostel Room 204", etc.
  address     text not null,                -- full delivery address string
  phone       text default '',              -- contact phone at this address
  created_at  timestamptz default now()
);

alter table public.address_book enable row level security;

-- Users can only see and manage their own addresses
create policy "users_manage_own_addresses" on public.address_book
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ────────────────────────────────────────────────
-- 2. SEARCH ANALYTICS — track what people search for
-- ────────────────────────────────────────────────
create table if not exists public.search_analytics (
  id           uuid primary key default gen_random_uuid(),
  query        text not null,               -- normalised lowercase query string
  category     text,                        -- category filter used (null = All)
  result_count int default 0,               -- how many results the search returned
  searched_at  timestamptz default now()
);

-- Public insert only (no auth required so even guests contribute analytics)
alter table public.search_analytics enable row level security;

create policy "anyone_can_log_searches" on public.search_analytics
  for insert with check (true);

-- Only admins can read search analytics
create policy "admins_read_search_analytics" on public.search_analytics
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Materialised view for top searches (run this separately if you want a dashboard widget)
-- create or replace view public.top_searches as
--   select query, count(*) as search_count, avg(result_count)::int as avg_results
--   from public.search_analytics
--   where searched_at > now() - interval '30 days'
--   group by query
--   order by search_count desc
--   limit 100;


-- ────────────────────────────────────────────────
-- 3. VENDOR SCHEDULED HOURS — auto open/close
-- ────────────────────────────────────────────────
alter table public.vendors
  add column if not exists schedule_enabled boolean default false,
  add column if not exists schedule_open    text default '08:00',  -- 24-h "HH:MM"
  add column if not exists schedule_close   text default '20:00',  -- 24-h "HH:MM"
  add column if not exists schedule_days    text default '["Mon","Tue","Wed","Thu","Fri"]'; -- JSON array


-- ────────────────────────────────────────────────
-- 4. VENDORS — response_rate column (pre-computed, optional)
-- ────────────────────────────────────────────────
-- The app computes response rate live from messages, but you can also cache it:
alter table public.vendors
  add column if not exists response_rate int; -- 0–100 (%), updated by a cron job or trigger


-- ────────────────────────────────────────────────
-- 5. PRODUCTS — ensure images[] column exists
-- ────────────────────────────────────────────────
-- The image reordering feature stores all images as a JSONB array;
-- image_url is always kept in sync with images[0].
alter table public.products
  add column if not exists images text[] default array[]::text[];

-- Backfill: for any product that has image_url but no images array,
-- populate images[0] with image_url:
update public.products
set images = array[image_url]
where image_url is not null
  and (images is null or array_length(images, 1) is null);


-- ────────────────────────────────────────────────
-- 6. OPTIONAL: Cron function to apply vendor schedule
-- (requires pg_cron extension, enable in Supabase extensions)
-- ────────────────────────────────────────────────
-- This function marks vendors unavailable/available based on their schedule.
-- Call it every 15 minutes with pg_cron or a Vercel cron job hitting a Supabase edge function.

create or replace function public.apply_vendor_schedules()
returns void language plpgsql security definer as $$
declare
  v record;
  local_time time;
  local_day  text;
  should_be_open boolean;
begin
  for v in
    select id, schedule_open, schedule_close, schedule_days
    from public.vendors
    where schedule_enabled = true
  loop
    -- Use UTC+2 (Central Africa Time) — adjust if needed
    local_time := (now() at time zone 'Africa/Blantyre')::time;
    local_day  := to_char(now() at time zone 'Africa/Blantyre', 'Dy'); -- "Mon", "Tue", ...

    should_be_open :=
      local_time >= v.schedule_open::time
      and local_time < v.schedule_close::time
      and v.schedule_days::jsonb @> to_jsonb(local_day);

    update public.vendors
    set available = should_be_open
    where id = v.id;
  end loop;
end;
$$;

-- Grant exec to service role
grant execute on function public.apply_vendor_schedules() to service_role;

-- ────────────────────────────────────────────────
-- Done
-- ────────────────────────────────────────────────
-- After running, verify in Supabase Table Editor:
--   ✅ address_book table exists with RLS enabled
--   ✅ search_analytics table exists with RLS enabled
--   ✅ vendors table has schedule_enabled, schedule_open, schedule_close, schedule_days columns
--   ✅ products table has images[] column populated for existing products
