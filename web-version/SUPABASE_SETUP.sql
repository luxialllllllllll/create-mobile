create table if not exists public.user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_states enable row level security;

drop policy if exists "Users can read their own state" on public.user_states;
create policy "Users can read their own state"
on public.user_states
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own state" on public.user_states;
create policy "Users can insert their own state"
on public.user_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own state" on public.user_states;
create policy "Users can update their own state"
on public.user_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('user-media', 'user-media', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can read their own media" on storage.objects;
create policy "Users can read their own media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'user-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload their own media" on storage.objects;
create policy "Users can upload their own media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'user-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their own media" on storage.objects;
create policy "Users can update their own media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'user-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'user-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their own media" on storage.objects;
create policy "Users can delete their own media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'user-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
