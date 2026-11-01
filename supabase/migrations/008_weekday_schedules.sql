-- Reusable teacher-owned bell schedules and weekday assignments.
alter table public.teachers
  add column schedule_presets jsonb not null default '[]'::jsonb,
  add column weekday_schedule jsonb not null default '{}'::jsonb,
  add column weekly_schedule_version integer not null default 1;
alter table public.teachers
  add constraint schedule_presets_array check (jsonb_typeof(schedule_presets) = 'array'),
  add constraint weekday_schedule_object check (jsonb_typeof(weekday_schedule) = 'object'),
  add constraint weekly_schedule_positive_version check (weekly_schedule_version > 0);

-- Keep the previous bell list and add active classes whose numbers were absent.
-- Existing records and class-specific times are not rewritten.
do $$
declare t record; v_periods jsonb; v_id uuid;
begin
  for t in select id, bell_schedule from public.teachers loop
    select coalesce(jsonb_agg(item order by (item->>'period_number')::integer), '[]'::jsonb)
      into v_periods from (
        select jsonb_build_object('period_number', (b->>'period_number')::integer,
          'start_time', left(b->>'start_time', 5), 'end_time', left(b->>'end_time', 5)) as item
        from jsonb_array_elements(coalesce(t.bell_schedule, '[]'::jsonb)) b
        union all
        select jsonb_build_object('period_number', p.period_number,
          'start_time', to_char(p.start_time, 'HH24:MI'), 'end_time', to_char(p.end_time, 'HH24:MI'))
        from public.periods p where p.teacher_id = t.id and p.active
          and not exists (select 1 from jsonb_array_elements(coalesce(t.bell_schedule, '[]'::jsonb)) b
            where (b->>'period_number')::integer = p.period_number)
      ) rows;
    if jsonb_array_length(v_periods) > 0 then
      v_id := gen_random_uuid();
      update public.teachers set
        schedule_presets = jsonb_build_array(jsonb_build_object('id', v_id, 'name', 'Current schedule', 'periods', v_periods)),
        weekday_schedule = jsonb_build_object('monday',v_id,'tuesday',v_id,'wednesday',v_id,'thursday',v_id,'friday',v_id)
      where id = t.id;
    end if;
  end loop;
end $$;

create function public.set_weekly_schedule(p_teacher uuid, p_presets jsonb, p_assignments jsonb, p_expected_version integer)
returns integer language plpgsql security definer set search_path='' as $$
declare v_version integer; v_preset jsonb; v_period jsonb; v_day text; v_id text; v_name text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_teacher::text, 0));
  select weekly_schedule_version into v_version from public.teachers where id = p_teacher for update;
  if not found then raise exception 'Teacher not found'; end if;
  if v_version <> p_expected_version then raise exception 'Schedule changed elsewhere. Reload and try again'; end if;
  if jsonb_typeof(p_presets) is distinct from 'array' or jsonb_array_length(p_presets) > 20 or jsonb_typeof(p_assignments) is distinct from 'object' then
    raise exception 'Invalid weekly schedule';
  end if;
  for v_preset in select value from jsonb_array_elements(p_presets) loop
    v_id := v_preset->>'id'; v_name := btrim(v_preset->>'name');
    if v_id is null or v_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or v_name is null or length(v_name) not between 1 and 60
      or jsonb_typeof(v_preset->'periods') is distinct from 'array'
      or jsonb_array_length(v_preset->'periods') > 20 then
      raise exception 'Invalid schedule preset';
    end if;
    if (select count(*) from jsonb_array_elements(p_presets) item where item->>'id' = v_id) <> 1
      or (select count(*) from jsonb_array_elements(p_presets) item where lower(btrim(item->>'name')) = lower(v_name)) <> 1 then
      raise exception 'Schedule names and IDs must be unique';
    end if;
    for v_period in select value from jsonb_array_elements(v_preset->'periods') loop
      if jsonb_typeof(v_period->'period_number') is distinct from 'number'
        or coalesce((v_period->>'period_number') !~ '^(20|1[0-9]|[1-9])$', true)
        or coalesce((v_period->>'start_time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$', true)
        or coalesce((v_period->>'end_time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$', true)
        or (v_period->>'start_time') >= (v_period->>'end_time') then
        raise exception 'Invalid period time or number';
      end if;
      if (select count(*) from jsonb_array_elements(v_preset->'periods') item
        where item->>'period_number' = v_period->>'period_number') <> 1 then
        raise exception 'Period numbers must be unique in a schedule';
      end if;
    end loop;
  end loop;
  for v_day, v_id in select key, value #>> '{}' from jsonb_each(p_assignments) loop
    if v_day not in ('monday','tuesday','wednesday','thursday','friday')
      or jsonb_typeof(p_assignments->v_day) <> 'string'
      or not exists (select 1 from jsonb_array_elements(p_presets) item where item->>'id' = v_id) then
      raise exception 'Weekday assignment refers to a missing schedule';
    end if;
  end loop;
  update public.teachers set schedule_presets = p_presets, weekday_schedule = p_assignments,
    weekly_schedule_version = weekly_schedule_version + 1 where id = p_teacher;
  return v_version + 1;
end $$;
revoke all on function public.set_weekly_schedule(uuid,jsonb,jsonb,integer) from public,anon,authenticated;
grant execute on function public.set_weekly_schedule(uuid,jsonb,jsonb,integer) to service_role;

-- Resolve the actual scanner destination while holding the same teacher lock
-- used by schedule edits, class archive, and attendance writes.
create function public.rfid_destination_at(p_teacher uuid, p_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare t public.teachers; v_local timestamp; v_day text; v_preset jsonb; v_number integer; v_time jsonb; v_period uuid;
begin
  select * into t from public.teachers where id = p_teacher;
  if not found then return null; end if;
  if t.override_period_id is not null and exists(select 1 from public.periods p where p.id=t.override_period_id and p.teacher_id=p_teacher and p.active) then
    return t.override_period_id;
  end if;
  v_local := p_at at time zone t.timezone;
  v_day := lower(to_char(v_local, 'FMDay'));
  if v_day not in ('monday','tuesday','wednesday','thursday','friday') then return null; end if;
  v_preset := (select value from jsonb_array_elements(t.schedule_presets) value where value->>'id' = t.weekday_schedule->>v_day limit 1);
  if v_preset is null then return null; end if;
  select p.id into v_period from public.periods p
    join lateral jsonb_array_elements(v_preset->'periods') item on (item->>'period_number')::integer = p.period_number
    where p.teacher_id = p_teacher and p.active
      and v_local::time >= case when p.time_source='custom' then p.start_time else (item->>'start_time')::time end
      and v_local::time < case when p.time_source='custom' then p.end_time else (item->>'end_time')::time end
    order by p.period_number limit 1;
  return v_period;
end $$;
revoke all on function public.rfid_destination_at(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.rfid_destination_at(uuid,timestamptz) to service_role;

create or replace function public.write_attendance(p_teacher uuid,p_student uuid,p_period uuid,p_date date,p_status text,p_source text,p_at timestamptz,p_uid text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_session uuid; v_record public.attendance_records;begin
 perform pg_advisory_xact_lock(hashtextextended(p_teacher::text,0));
 if p_source='rfid' and not exists(select 1 from public.periods where id=p_period and teacher_id=p_teacher and active)
   then raise exception 'Class is archived or unavailable'; end if;
 if p_source='rfid' and public.rfid_destination_at(p_teacher,p_at) is distinct from p_period
   then raise exception 'Scanner destination changed; retry tap'; end if;
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
