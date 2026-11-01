-- Optional school identifier. Text preserves leading zeroes from roster exports.
alter table public.students add column school_student_id text;
alter table public.students add constraint school_student_id_valid check (
  school_student_id is null or (length(school_student_id) between 1 and 64 and school_student_id = btrim(school_student_id) and school_student_id !~ '[[:cntrl:]]')
);
create unique index students_teacher_school_id on public.students(teacher_id, school_student_id)
  where school_student_id is not null;

-- One call and one PostgreSQL transaction for the entire confirmed import.
-- Only the server's service role can execute this function.
create function public.import_class_roster(
  p_teacher uuid, p_period uuid, p_mode text, p_rows jsonb, p_expected_ids uuid[]
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
  v_student uuid;
  v_number text;
  v_first text;
  v_last text;
  v_existing uuid;
  v_saved_number text;
  v_expected uuid[];
  v_current uuid[];
  v_keep uuid[] := array[]::uuid[];
  v_numbers text[] := array[]::text[];
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
    v_existing := nullif(v_row->>'existing_student_id', '')::uuid;
    if length(v_first) not between 1 and 100 or length(v_last) not between 1 and 100
       or (v_number is not null and (length(v_number) > 64 or v_number ~ '[[:cntrl:]]')) then
      raise exception 'Invalid student name or Student Number';
    end if;
    if v_number is not null then
      if v_number = any(v_numbers) then raise exception 'Duplicate Student Number'; end if;
      v_numbers := array_append(v_numbers, v_number);
    end if;
    if v_existing is not null then
      if v_existing = any(v_keep) then raise exception 'Duplicate student'; end if;
      select school_student_id into v_saved_number from public.students
        where id = v_existing and teacher_id = p_teacher for update;
      if not found then raise exception 'Student is unavailable'; end if;
      if v_number is not null and v_saved_number is not null and v_number <> v_saved_number then
        raise exception 'Student Number differs from saved record';
      end if;
      if v_number is not null and exists (
        select 1 from public.students where teacher_id = p_teacher and school_student_id = v_number and id <> v_existing
      ) then raise exception 'Student Number belongs to another student'; end if;
      if v_saved_number is null and v_number is not null then
        update public.students set school_student_id = v_number where id = v_existing;
      end if;
      update public.students set active = true where id = v_existing and not active;
      if found then v_reactivated := v_reactivated + 1; end if;
      v_student := v_existing;
      v_existing_count := v_existing_count + 1;
    else
      if v_number is not null and exists (
        select 1 from public.students where teacher_id = p_teacher and school_student_id = v_number
      ) then raise exception 'Student Number already exists'; end if;
      insert into public.students(teacher_id, first_name, last_name, display_name, school_student_id)
        values(p_teacher, v_first, v_last, v_first || ' ' || v_last, v_number) returning id into v_student;
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
revoke all on function public.import_class_roster(uuid,uuid,text,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.import_class_roster(uuid,uuid,text,jsonb,uuid[]) to service_role;
