-- Teacher-owned bell times used when creating or editing classes.
alter table public.teachers
  add column if not exists bell_schedule jsonb not null default '[]'::jsonb;

alter table public.teachers
  add constraint teachers_bell_schedule_array
  check (jsonb_typeof(bell_schedule) = 'array' and jsonb_array_length(bell_schedule) <= 20);

alter table public.periods
  add column if not exists time_source text not null default 'custom'
  check (time_source in ('school', 'custom'));

-- One transaction keeps linked class times and the teacher's bell schedule together.
create function public.set_bell_schedule(p_teacher uuid, p_schedule jsonb, p_update_existing boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_teacher::text, 0));
  if jsonb_typeof(p_schedule) <> 'array' then
    raise exception 'School schedule must be an array';
  end if;
  -- A class left at its old time becomes custom; it must not remain falsely linked.
  update public.periods p set time_source = 'custom'
  where p.teacher_id = p_teacher and p.time_source = 'school'
    and not exists (
      select 1 from jsonb_array_elements(p_schedule) item
      where (item->>'period_number')::integer = p.period_number
        and (item->>'start_time')::time = p.start_time
        and (item->>'end_time')::time = p.end_time
    );
  if p_update_existing then
    update public.periods p
    set start_time = (item->>'start_time')::time,
        end_time = (item->>'end_time')::time,
        time_source = 'school'
    from jsonb_array_elements(p_schedule) item
    where p.teacher_id = p_teacher
      and p.period_number = (item->>'period_number')::integer
      and (
        p.time_source = 'school'
        or p.start_time <> (item->>'start_time')::time
        or p.end_time <> (item->>'end_time')::time
      );
  end if;
  if exists (
    select 1 from public.periods a join public.periods b
      on a.teacher_id = b.teacher_id and a.id < b.id
    where a.teacher_id = p_teacher and a.active and b.active
      and a.start_time < b.end_time and a.end_time > b.start_time
  ) then
    raise exception 'Updated bell times overlap another active class';
  end if;
  update public.teachers set bell_schedule = p_schedule where id = p_teacher;
  if not found then raise exception 'Teacher not found'; end if;
end $$;
revoke all on function public.set_bell_schedule(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.set_bell_schedule(uuid,jsonb,boolean) to service_role;
