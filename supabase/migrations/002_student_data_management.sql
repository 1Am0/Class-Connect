-- Atomic, teacher-scoped year-end cleanup. Only the server's service role may call it.
create function public.manage_student_data(p_teacher uuid, p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_students integer; v_records integer; v_tags integer;
begin
  if p_action not in ('archive', 'clear_tags', 'delete_all') then
    raise exception 'Invalid student data action';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_teacher::text,0));
  if not exists(select 1 from public.teachers where id=p_teacher) then
    raise exception 'Teacher not found';
  end if;
  select count(*) into v_students from public.students where teacher_id=p_teacher;
  select count(*) into v_records from public.attendance_records where teacher_id=p_teacher;
  select count(*) into v_tags from public.rfid_tags where teacher_id=p_teacher;
  if p_action='archive' then
    update public.students set active=false where teacher_id=p_teacher;
  end if;
  if p_action in ('archive','clear_tags','delete_all') then
    delete from public.rfid_tags where teacher_id=p_teacher;
    update public.devices set enrollment_until=null,pending_uid=null where teacher_id=p_teacher;
  end if;
  if p_action='delete_all' then
    delete from public.attendance_records where teacher_id=p_teacher;
    delete from public.attendance_sessions where teacher_id=p_teacher;
    delete from public.period_students where teacher_id=p_teacher;
    delete from public.students where teacher_id=p_teacher;
  end if;
  return jsonb_build_object('students',v_students,'records',v_records,'tags',v_tags);
end $$;
revoke all on function public.manage_student_data(uuid,text) from public,anon,authenticated;
grant execute on function public.manage_student_data(uuid,text) to service_role;
