-- Teacher-owned reusable content for classroom activities.
create table public.activity_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  kind text not null check (kind in ('vocabulary', 'conversation', 'scramble')),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id)
);
create index activity_sets_teacher_updated on public.activity_sets(teacher_id, updated_at desc);
alter table public.activity_sets enable row level security;
create policy own_read on public.activity_sets for select to authenticated
  using (teacher_id = auth.uid());
revoke all on public.activity_sets from anon, authenticated;
grant select on public.activity_sets to authenticated;
