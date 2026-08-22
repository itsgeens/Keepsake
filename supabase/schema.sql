-- ============================================================================
-- The Wedding Camera — Database Schema
-- ----------------------------------------------------------------------------
-- Apply this file in the Supabase dashboard: SQL Editor -> New query -> Run.
-- RLS is enabled on every table; all guest-facing access goes through the
-- `anon` role and is scoped to *active* events.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  couple_name     text not null,
  event_date      date not null,
  slug            text unique not null,
  access_token    text unique not null,
  status          text not null default 'active'
                  check (status in ('draft', 'active', 'closed', 'archived')),
  film_preset     jsonb not null default '{"grain": 0.06, "warmth": 0.12, "contrast": 1.06, "brightness": 0.98, "vignette": 0.3}'::jsonb,
  guest_photo_limit integer not null default 25,
  created_at      timestamptz not null default now()
);

create table if not exists public.guests (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  first_name      text not null,
  last_name       text,
  session_id      text not null,
  created_at      timestamptz not null default now(),
  last_active_at  timestamptz not null default now()
);

create table if not exists public.photos (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  guest_id        uuid references public.guests(id) on delete set null,
  guest_name      text not null,
  original_path   text,
  processed_path  text not null,
  status          text not null default 'uploaded',
  captured_at     timestamptz not null default now(),
  uploaded_at     timestamptz not null default now(),
  is_hidden       boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists events_slug_idx on public.events (slug);
create index if not exists events_access_token_idx on public.events (access_token);
create index if not exists guests_event_id_idx on public.guests (event_id);
create index if not exists photos_event_id_idx on public.photos (event_id);
create index if not exists photos_guest_id_idx on public.photos (guest_id);

-- ----------------------------------------------------------------------------
-- Helper: is an event active? (used by storage policies)
-- ----------------------------------------------------------------------------

create or replace function public.is_event_active(event_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = event_id and e.status = 'active'
  );
$$;

-- Secure lookup of an event by its access token (avoids exposing tokens in a
-- plain list query). Call from the client as an RPC.
create or replace function public.get_event_by_token(p_token text)
returns public.events
language sql
security definer
set search_path = public
as $$
  select * from public.events e
  where e.access_token = p_token
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.photos enable row level security;

-- Events: anyone may read active events; creation/modification is reserved
-- for the service role (admin).
create policy "Public can view active events"
  on public.events for select to anon
  using (status = 'active');

-- Guests: may join (insert) and be read only within active events.
create policy "Guests can join active events"
  on public.guests for insert to anon
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'active'
    )
  );

create policy "Guests visible within active events"
  on public.guests for select to anon
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'active'
    )
  );

-- Photos: guests upload to active events; the public roll only shows photos
-- that are not hidden and belong to active events.
create policy "Guests can upload photos to active events"
  on public.photos for insert to anon
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'active'
    )
  );

create policy "Public can view visible photos of active events"
  on public.photos for select to anon
  using (
    is_hidden = false
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'active'
    )
  );

-- ----------------------------------------------------------------------------
-- Storage: wedding-photos bucket
-- ----------------------------------------------------------------------------
-- Paths:  wedding-photos/{eventId}/processed/{photoId}.jpg
--         wedding-photos/{eventId}/originals/{photoId}.jpg
-- The bucket is public so processed photos can be served directly in the roll.

insert into storage.buckets (id, name, public)
values ('wedding-photos', 'wedding-photos', true)
on conflict (id) do nothing;

create policy "Guests can upload to active events"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'wedding-photos'
    and public.is_event_active((split_part(name, '/', 1))::uuid)
  );

create policy "Public can view wedding photos"
  on storage.objects for select to anon
  using (bucket_id = 'wedding-photos');
