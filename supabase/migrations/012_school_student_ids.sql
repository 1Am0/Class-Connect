-- Existing six-digit IDs can support QR check-in without re-entering students.
-- One-time backfill for students added before school emails existed. It uses
-- the same domain as NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN, set in the same run:
--   set app.student_email_domain = 'students.example.edu';
-- Without that setting nothing changes (a new database has no students yet).
-- Leave ambiguous or conflicting addresses for the teacher to review in Edit student.
with setting as (
  select nullif(lower(btrim(current_setting('app.student_email_domain', true))), '') as domain
)
update public.students as student
set school_email = student.school_student_id || '@' || setting.domain
from setting
where setting.domain is not null
  and student.school_email is null
  and student.school_student_id ~ '^[0-9]{6}$'
  and not exists (
    select 1 from public.students as other
    where other.teacher_id = student.teacher_id
      and other.id <> student.id
      and other.school_email = student.school_student_id || '@' || setting.domain
  );
