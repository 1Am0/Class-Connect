-- Each browser operation has one durable server receipt. Only the service role calls this function.
create table public.attendance_operation_receipts (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  operation_id uuid not null,
  request jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (teacher_id, operation_id)
);
alter table public.attendance_operation_receipts enable row level security;
revoke all on public.attendance_operation_receipts from anon, authenticated;

create function public.apply_attendance_operation(p_teacher uuid, p_op jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_id uuid; v_period uuid; v_student uuid; v_tag uuid; v_date date; v_at timestamptz;
  v_status text; v_action text; v_session uuid; v_record public.attendance_records;
  v_expected jsonb; v_saved public.attendance_operation_receipts; v_response jsonb;
begin
  if jsonb_typeof(p_op) is distinct from 'object' then raise exception 'Invalid attendance operation'; end if;
  v_id := (p_op->>'operation_id')::uuid;
  v_period := (p_op->>'period_id')::uuid;
  v_student := (p_op->>'student_id')::uuid;
  v_date := (p_op->>'date')::date;
  v_at := (p_op->>'at')::timestamptz;
  v_status := p_op->>'status';
  v_action := p_op->>'action';
  v_expected := p_op->'expected';
  if v_id is null or v_date is null or v_at is null or v_status not in ('present','absent','late','excused')
    or v_action not in ('manual','scan') or v_expected is null then
    raise exception 'Invalid attendance operation';
  end if;
  if v_action='scan' and v_status <> 'present' then raise exception 'Invalid scanner status'; end if;
  if p_op ? 'restore' and (
    v_action <> 'manual' or (p_op->'restore'->>'status') is distinct from v_status
    or (p_op->'restore'->>'source') not in ('manual','rfid')
    or ((v_status in ('present','late')) <> ((p_op->'restore'->>'checked_in_at') is not null))
  ) then raise exception 'Invalid restoration'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_teacher::text,0));
  select * into v_saved from public.attendance_operation_receipts
    where teacher_id=p_teacher and operation_id=v_id;
  if found then
    if v_saved.request <> p_op then raise exception 'Operation ID was reused'; end if;
    return v_saved.response;
  end if;
  if not exists(select 1 from public.periods where id=v_period and teacher_id=p_teacher and active)
    or not exists(select 1 from public.students where id=v_student and teacher_id=p_teacher and active)
    or not exists(select 1 from public.period_students where period_id=v_period and student_id=v_student and teacher_id=p_teacher) then
    raise exception 'Student is not active in this class';
  end if;
  if v_action='scan' then
    v_tag := (p_op->>'tag_id')::uuid;
    if not exists(select 1 from public.devices where id=(p_op->>'device_id')::uuid and teacher_id=p_teacher and active) then
      raise exception 'Scanner is not active';
    end if;
    if not exists(select 1 from public.rfid_tags where id=v_tag and teacher_id=p_teacher and student_id=v_student and active) then
      raise exception 'Tag is no longer assigned to this student';
    end if;
  end if;
  v_session := public.ensure_session(p_teacher,v_period,v_date,v_at);
  insert into public.attendance_records(teacher_id,attendance_session_id,student_id,status,source)
    values(p_teacher,v_session,v_student,'absent','manual')
    on conflict(attendance_session_id,student_id) do nothing;
  select * into v_record from public.attendance_records
    where attendance_session_id=v_session and student_id=v_student for update;
  if v_expected='null'::jsonb then
    if v_record.status <> 'absent' or v_record.checked_in_at is not null or v_record.source <> 'manual' then
      raise exception 'Attendance changed elsewhere';
    end if;
  elsif v_record.id::text is distinct from v_expected->>'id'
    or v_record.status is distinct from v_expected->>'status'
    or v_record.source is distinct from v_expected->>'source'
    or v_record.checked_in_at is distinct from (v_expected->>'checked_in_at')::timestamptz then
    raise exception 'Attendance changed elsewhere';
  end if;
  if v_action='scan' and v_record.status in ('present','late') then
    v_response := jsonb_build_object('operation_id',v_id,'record',to_jsonb(v_record),'already_checked_in',true);
  else
    update public.attendance_records set status=v_status,
      source=case when p_op ? 'restore' then p_op->'restore'->>'source' when v_action='scan' then 'rfid' else 'manual' end,
      checked_in_at=case when p_op ? 'restore' then (p_op->'restore'->>'checked_in_at')::timestamptz
        when v_status in ('present','late') then v_at else null end
      where id=v_record.id returning * into v_record;
    v_response := jsonb_build_object('operation_id',v_id,'record',to_jsonb(v_record),'already_checked_in',false);
  end if;
  insert into public.attendance_operation_receipts(teacher_id,operation_id,request,response)
    values(p_teacher,v_id,p_op,v_response);
  return v_response;
end $$;
revoke all on function public.apply_attendance_operation(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.apply_attendance_operation(uuid,jsonb) to service_role;
