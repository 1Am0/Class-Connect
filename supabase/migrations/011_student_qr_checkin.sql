-- Link a roster entry to a verified school Google account without creating a Supabase teacher account.
alter table public.students add column school_email text;
alter table public.students add constraint students_school_email_format check (
  school_email is null or (
    school_email = lower(btrim(school_email)) and
    length(school_email) between 5 and 254 and
    school_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);
create unique index students_teacher_school_email on public.students(teacher_id, school_email)
  where school_email is not null;

alter table public.attendance_records drop constraint attendance_records_source_check;
alter table public.attendance_records add constraint attendance_records_source_check
  check(source in ('rfid','manual','qr'));

-- Called only after the server verifies the Google ID token, QR signature, and class time.
create function public.qr_student_checkin(
  p_teacher uuid, p_period uuid, p_student uuid, p_date date, p_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_session uuid; v_record public.attendance_records; v_already boolean;
begin
  if p_teacher is null or p_period is null or p_student is null or p_date is null or p_at is null then
    raise exception 'Invalid QR check-in';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_teacher::text,0));
  if not exists(select 1 from public.periods where id=p_period and teacher_id=p_teacher and active)
    or not exists(select 1 from public.students where id=p_student and teacher_id=p_teacher and active and school_email is not null)
    or not exists(select 1 from public.period_students where period_id=p_period and student_id=p_student and teacher_id=p_teacher) then
    raise exception 'Student is not active in this class';
  end if;
  v_session := public.ensure_session(p_teacher,p_period,p_date,p_at);
  insert into public.attendance_records(teacher_id,attendance_session_id,student_id,status,source)
    values(p_teacher,v_session,p_student,'absent','manual')
    on conflict(attendance_session_id,student_id) do nothing;
  select * into v_record from public.attendance_records
    where attendance_session_id=v_session and student_id=p_student for update;
  v_already := v_record.status <> 'absent';
  if not v_already then
    update public.attendance_records set status='present',source='qr',checked_in_at=p_at
      where id=v_record.id returning * into v_record;
  end if;
  return jsonb_build_object('record',to_jsonb(v_record),'already_checked_in',v_already);
end $$;
revoke all on function public.qr_student_checkin(uuid,uuid,uuid,date,timestamptz) from public,anon,authenticated;
grant execute on function public.qr_student_checkin(uuid,uuid,uuid,date,timestamptz) to service_role;

-- Preserve QR provenance when a teacher undoes a later manual correction.
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
    or v_action not in ('manual','scan') or v_expected is null then
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

-- Accept optional school emails in the existing atomic roster import.
create or replace function public.import_class_roster(
  p_teacher uuid, p_period uuid, p_mode text, p_rows jsonb, p_expected_ids uuid[]
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
  v_student uuid;
  v_number text;
  v_email text;
  v_first text;
  v_last text;
  v_existing uuid;
  v_saved_number text;
  v_saved_email text;
  v_expected uuid[];
  v_current uuid[];
  v_keep uuid[] := array[]::uuid[];
  v_numbers text[] := array[]::text[];
  v_emails text[] := array[]::text[];
  v_added integer := 0;
  v_existing_count integer := 0;
  v_removed integer := 0;
  v_reactivated integer := 0;
begin
  if p_mode not in ('add','sync') or p_rows is null or jsonb_typeof(p_rows) <> 'array'
     or jsonb_array_length(p_rows) not between 1 and 500 then
    raise exception 'Invalid roster import';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_teacher::text, 0));
  perform 1 from public.periods where id = p_period and teacher_id = p_teacher and active for update;
  if not found then raise exception 'Class is unavailable'; end if;
  select coalesce(array_agg(student_id order by student_id), array[]::uuid[]) into v_current
    from public.period_students where teacher_id = p_teacher and period_id = p_period;
  select coalesce(array_agg(id order by id), array[]::uuid[]) into v_expected
    from unnest(coalesce(p_expected_ids, array[]::uuid[])) as id;
  if v_current <> v_expected then raise exception 'Roster changed. Refresh and preview again'; end if;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_first := btrim(coalesce(v_row->>'first_name', ''));
    v_last := btrim(coalesce(v_row->>'last_name', ''));
    v_number := nullif(btrim(coalesce(v_row->>'school_student_id', '')), '');
    v_email := nullif(lower(btrim(coalesce(v_row->>'school_email', ''))), '');
    v_existing := nullif(v_row->>'existing_student_id', '')::uuid;
    if length(v_first) not between 1 and 100 or length(v_last) not between 1 and 100
       or (v_number is not null and (length(v_number) > 64 or v_number ~ '[[:cntrl:]]'))
       or (v_email is not null and (length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) then
      raise exception 'Invalid student name, Student Number, or school email';
    end if;
    if v_number is not null then
      if v_number = any(v_numbers) then raise exception 'Duplicate Student Number'; end if;
      v_numbers := array_append(v_numbers, v_number);
    end if;
    if v_email is not null then
      if v_email = any(v_emails) then raise exception 'Duplicate school email'; end if;
      v_emails := array_append(v_emails, v_email);
    end if;
    if v_existing is not null then
      if v_existing = any(v_keep) then raise exception 'Duplicate student'; end if;
      select school_student_id, school_email into v_saved_number, v_saved_email from public.students
        where id = v_existing and teacher_id = p_teacher for update;
      if not found then raise exception 'Student is unavailable'; end if;
      if v_number is not null and v_saved_number is not null and v_number <> v_saved_number then
        raise exception 'Student Number differs from saved record';
      end if;
      if v_email is not null and v_saved_email is not null and v_email <> v_saved_email then
        raise exception 'School email differs from saved record';
      end if;
      if v_number is not null and exists (
        select 1 from public.students where teacher_id = p_teacher and school_student_id = v_number and id <> v_existing
      ) then raise exception 'Student Number belongs to another student'; end if;
      if v_saved_number is null and v_number is not null then
        update public.students set school_student_id = v_number where id = v_existing;
      end if;
      if v_email is not null and v_saved_email is null then
        update public.students set school_email = v_email where id = v_existing;
      end if;
      update public.students set active = true where id = v_existing and not active;
      if found then v_reactivated := v_reactivated + 1; end if;
      v_student := v_existing;
      v_existing_count := v_existing_count + 1;
    else
      if v_number is not null and exists (
        select 1 from public.students where teacher_id = p_teacher and school_student_id = v_number
      ) then raise exception 'Student Number already exists'; end if;
      if v_email is not null and exists (
        select 1 from public.students where teacher_id = p_teacher and school_email = v_email
      ) then raise exception 'School email already exists'; end if;
      insert into public.students(teacher_id, first_name, last_name, display_name, school_student_id, school_email)
        values(p_teacher, v_first, v_last, v_first || ' ' || v_last, v_number, v_email) returning id into v_student;
      v_added := v_added + 1;
    end if;
    v_keep := array_append(v_keep, v_student);
    insert into public.period_students(teacher_id, period_id, student_id)
      values(p_teacher, p_period, v_student) on conflict(period_id, student_id) do nothing;
    -- Only today's open session receives a default absence for newly enrolled students.
    insert into public.attendance_records(teacher_id, attendance_session_id, student_id, status, source)
      select p_teacher, sess.id, v_student, 'absent', 'manual'
      from public.attendance_sessions sess join public.teachers t on t.id = p_teacher
      where sess.teacher_id = p_teacher and sess.period_id = p_period and sess.status = 'open'
        and sess.date = (now() at time zone t.timezone)::date
      on conflict(attendance_session_id, student_id) do nothing;
  end loop;
  if p_mode = 'sync' then
    delete from public.period_students
      where teacher_id = p_teacher and period_id = p_period and not (student_id = any(v_keep));
    get diagnostics v_removed = row_count;
  end if;
  return jsonb_build_object('added', v_added, 'existing', v_existing_count,
    'removed', v_removed, 'reactivated', v_reactivated);
end $$;
