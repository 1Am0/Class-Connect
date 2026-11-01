-- Different active periods may share meeting times. Period numbers remain
-- unique among active classes, and the scanner still uses the teacher's
-- selected class or the lowest numbered scheduled class.
create or replace function public.set_class_active(p_teacher uuid, p_period uuid, p_active boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_period public.periods; v_routing_reset boolean := false;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_teacher::text, 0));
  select * into v_period from public.periods
    where id = p_period and teacher_id = p_teacher for update;
  if not found then raise exception 'Class not found'; end if;
  if v_period.active = p_active then return false; end if;

  if p_active and exists (
    select 1 from public.periods p where p.teacher_id = p_teacher
      and p.id <> p_period and p.active
      and p.period_number = v_period.period_number
  ) then raise exception 'Another active class uses this period number'; end if;

  update public.periods set active = p_active where id = p_period and teacher_id = p_teacher;
  if not p_active then
    update public.teachers set override_period_id = null
      where id = p_teacher and override_period_id = p_period;
    v_routing_reset := found;
  end if;
  return v_routing_reset;
end $$;

create or replace function public.set_bell_schedule(p_teacher uuid, p_schedule jsonb, p_update_existing boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_teacher::text, 0));
  if jsonb_typeof(p_schedule) <> 'array' then
    raise exception 'School schedule must be an array';
  end if;
  update public.periods p set time_source = 'custom'
  where p.teacher_id = p_teacher and p.active and p.time_source = 'school'
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
    where p.teacher_id = p_teacher and p.active
      and p.period_number = (item->>'period_number')::integer
      and (
        p.time_source = 'school'
        or p.start_time <> (item->>'start_time')::time
        or p.end_time <> (item->>'end_time')::time
      );
  end if;
  update public.teachers set bell_schedule = p_schedule where id = p_teacher;
  if not found then raise exception 'Teacher not found'; end if;
end $$;
