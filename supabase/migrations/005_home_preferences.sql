-- Teacher-only Home notes and class-card preferences. Existing RLS on teachers
-- already limits reads to the teacher; writes continue through /api/manage.
alter table public.teachers
  add column if not exists home_note text not null default '',
  add column if not exists home_class_preferences jsonb not null
    default '{"order":[],"accents":{}}'::jsonb;

alter table public.teachers
  add constraint home_note_length check (char_length(home_note) <= 2000);
