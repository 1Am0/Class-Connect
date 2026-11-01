-- Keep old classes and their history while allowing a period number to be reused
-- in a later school year. Only active classes need unique period numbers.
alter table public.periods
  drop constraint if exists periods_teacher_id_period_number_key;
create unique index if not exists one_active_period_number
  on public.periods(teacher_id, period_number) where active;
update public.teachers t set override_period_id = null
  from public.periods p
  where t.override_period_id = p.id and p.teacher_id = t.id and not p.active;

-- A single teacher-scoped transaction updates the class and scanner routing.
create function public.set_class_active(p_teacher uuid, p_period uuid, p_active boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_period public.periods; v_routing_reset boolean := false;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_teacher::text, 0));
  select * into v_period from public.periods
    where id = p_period and teacher_id = p_teacher for update;
  if not found then raise exception 'Class not found'; end if;
  if v_period.active = p_active then return false; end if;

  if p_active then
    if exists (
      select 1 from public.periods p where p.teacher_id = p_teacher
        and p.id <> p_period and p.active
        and p.period_number = v_period.period_number
    ) then raise exception 'Another active class uses this period number'; end if;
    if exists (
      select 1 from public.periods p where p.teacher_id = p_teacher
        and p.id <> p_period and p.active
        and p.start_time < v_period.end_time
        and p.end_time > v_period.start_time
    ) then raise exception 'This class overlaps another active class'; end if;
  end if;

  update public.periods set active = p_active where id = p_period and teacher_id = p_teacher;
  if not p_active then
    update public.teachers set override_period_id = null
      where id = p_teacher and override_period_id = p_period;
    v_routing_reset := found;
  end if;
  return v_routing_reset;
end $$;
revoke all on function public.set_class_active(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_class_active(uuid,uuid,boolean) to service_role;

-- Both scans and archive operations take the teacher advisory lock. A scan
-- started just before archiving cannot write after the class becomes inactive.
create or replace function public.write_attendance(p_teacher uuid,p_student uuid,p_period uuid,p_date date,p_status text,p_source text,p_at timestamptz,p_uid text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_session uuid; v_record public.attendance_records;begin
 perform pg_advisory_xact_lock(hashtextextended(p_teacher::text,0));
 if p_source='rfid' and not exists(
   select 1 from public.periods where id=p_period and teacher_id=p_teacher and active
 ) then raise exception 'Class is archived or unavailable';end if;
 perform 1 from public.students where id=p_student and teacher_id=p_teacher and active for update;
 if not found then raise exception 'Student is inactive or unavailable';end if;
 if not exists(select 1 from public.period_students where student_id=p_student and period_id=p_period and teacher_id=p_teacher) then raise exception 'Student is not enrolled in current period';end if;
 if p_source='rfid' and not exists(select 1 from public.rfid_tags where student_id=p_student and teacher_id=p_teacher and uid=p_uid and active) then raise exception 'Tag is no longer active';end if;
 v_session := public.ensure_session(p_teacher,p_period,p_date,p_at);
 select * into v_record from public.attendance_records where attendance_session_id=v_session and student_id=p_student;
 if p_source='rfid' and v_record.status in ('present','late') then return jsonb_build_object('record',to_jsonb(v_record),'created',false);end if;
 insert into public.attendance_records(teacher_id,attendance_session_id,student_id,status,checked_in_at,source)
 values(p_teacher,v_session,p_student,p_status,case when p_status in ('present','late') then p_at else null end,p_source)
 on conflict(attendance_session_id,student_id) do update set status=excluded.status,checked_in_at=excluded.checked_in_at,source=excluded.source returning * into v_record;
 return jsonb_build_object('record',to_jsonb(v_record),'created',true);end $$;

-- A bell-time change should not rewrite the displayed times of archived classes.
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
