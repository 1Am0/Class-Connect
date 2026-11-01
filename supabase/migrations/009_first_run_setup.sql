-- Existing teachers keep access. New accounts complete class and schedule setup first.
alter table public.teachers add column onboarding_completed boolean not null default false;
update public.teachers set onboarding_completed = true;

create function public.complete_first_run(
  p_teacher uuid, p_timezone text, p_name text, p_number integer,
  p_start time, p_end time, p_weekdays text[]
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_class uuid; v_preset uuid := gen_random_uuid(); v_day text; v_assignments jsonb := '{}'::jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_teacher::text, 0));
  if not exists(select 1 from public.teachers where id=p_teacher and not onboarding_completed for update) then
    raise exception 'Setup is already complete or account is unavailable';
  end if;
  if p_timezone is null or length(p_timezone) not between 1 and 100
    or p_name is null or length(btrim(p_name)) not between 1 and 100
    or p_number not between 1 and 20 or p_start is null or p_end is null or p_start >= p_end
    or coalesce(array_length(p_weekdays,1),0) not between 1 and 5 then
    raise exception 'Invalid class or schedule';
  end if;
  foreach v_day in array p_weekdays loop
    if v_day not in ('monday','tuesday','wednesday','thursday','friday') then
      raise exception 'Invalid weekday';
    end if;
    v_assignments := v_assignments || jsonb_build_object(v_day, v_preset);
  end loop;
  if (select count(*) from jsonb_object_keys(v_assignments)) <> array_length(p_weekdays,1) then
    raise exception 'Duplicate weekday';
  end if;
  insert into public.periods(teacher_id,name,period_number,start_time,end_time,active,time_source)
  values(p_teacher,btrim(p_name),p_number,p_start,p_end,true,'school') returning id into v_class;
  update public.teachers set timezone=p_timezone,
    schedule_presets=jsonb_build_array(jsonb_build_object('id',v_preset,'name','Regular schedule',
      'periods',jsonb_build_array(jsonb_build_object('period_number',p_number,
        'start_time',to_char(p_start,'HH24:MI'),'end_time',to_char(p_end,'HH24:MI'))))),
    weekday_schedule=v_assignments, weekly_schedule_version=weekly_schedule_version+1,
    onboarding_completed=true where id=p_teacher;
  return v_class;
end $$;
revoke all on function public.complete_first_run(uuid,text,text,integer,time,time,text[]) from public,anon,authenticated;
grant execute on function public.complete_first_run(uuid,text,text,integer,time,time,text[]) to service_role;
