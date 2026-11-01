-- Optional attendance notes ("nurse", "parent called"). A note is its own
-- queued change (action "note"), so it works offline and never touches the
-- status or check-in time.
alter table public.attendance_records
  add column if not exists note text;
alter table public.attendance_records
  drop constraint if exists attendance_note_length,
  add constraint attendance_note_length
    check (note is null or char_length(note) <= 200);

create or replace function public.apply_attendance_operation(p_teacher uuid, p_op jsonb)
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
    or v_action not in ('manual','scan','note') or v_expected is null then
    raise exception 'Invalid attendance operation';
  end if;
  if v_action='scan' and v_status <> 'present' then raise exception 'Invalid scanner status'; end if;
  if p_op ? 'restore' and (
    v_action <> 'manual' or (p_op->'restore'->>'status') is distinct from v_status
    or (p_op->'restore'->>'source') not in ('manual','rfid','qr')
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
  -- The browser's change wins over whatever is saved in the cloud. A scan
  -- still never downgrades a student who is already present or late.
  if v_action='note' then
    -- A note changes only the note; status and check-in time stay as they are.
    update public.attendance_records set note=nullif(btrim(coalesce(p_op->>'note','')),'')
      where id=v_record.id returning * into v_record;
    v_response := jsonb_build_object('operation_id',v_id,'record',to_jsonb(v_record),'already_checked_in',false);
  elsif v_action='scan' and v_record.status in ('present','late') then
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
