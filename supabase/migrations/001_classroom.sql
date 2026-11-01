-- Run in a new Supabase project using SQL Editor or `supabase db push`.
create extension if not exists pgcrypto;
create table public.teachers (
 id uuid primary key references auth.users on delete cascade,
 name text not null, email text not null, timezone text not null default 'America/Los_Angeles',
 override_period_id uuid, created_at timestamptz not null default now()
);
create table public.periods (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teachers on delete cascade,
 name text not null, period_number integer not null check(period_number between 1 and 20), start_time time not null, end_time time not null,
 active boolean not null default true, created_at timestamptz not null default now(), unique(id,teacher_id), unique(teacher_id,period_number), check(end_time>start_time)
);
alter table public.teachers add constraint owned_override foreign key (override_period_id,id) references public.periods(id,teacher_id);
create table public.students (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teachers on delete cascade,
 first_name text not null,last_name text not null,display_name text not null,optional_notes text not null default '',active boolean not null default true,
 created_at timestamptz not null default now(),unique(id,teacher_id)
);
create table public.period_students (
 id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.teachers on delete cascade,period_id uuid not null,student_id uuid not null,
 foreign key(period_id,teacher_id) references public.periods(id,teacher_id), foreign key(student_id,teacher_id) references public.students(id,teacher_id),unique(period_id,student_id)
);
create table public.rfid_tags (
 id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.teachers on delete cascade,student_id uuid not null,
 uid text not null unique check(uid ~ '^([0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})$'),active boolean not null default true,assigned_at timestamptz not null default now(),
 foreign key(student_id,teacher_id) references public.students(id,teacher_id)
);
create unique index one_active_tag on public.rfid_tags(student_id) where active;
create table public.attendance_sessions (
 id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.teachers on delete cascade,period_id uuid not null,date date not null,
 started_at timestamptz not null default now(),ended_at timestamptz,status text not null default 'open' check(status in ('open','closed')),
 foreign key(period_id,teacher_id) references public.periods(id,teacher_id),unique(period_id,date),unique(id,teacher_id)
);
create table public.attendance_records (
 id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.teachers on delete cascade,attendance_session_id uuid not null,student_id uuid not null,
 status text not null check(status in ('present','absent','late','excused')),checked_in_at timestamptz,source text not null check(source in ('rfid','manual')),
 foreign key(attendance_session_id,teacher_id) references public.attendance_sessions(id,teacher_id),foreign key(student_id,teacher_id) references public.students(id,teacher_id),unique(attendance_session_id,student_id)
);
create table public.devices (
 id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.teachers on delete cascade,device_name text not null,device_identifier text not null unique,
 hashed_api_key text not null check(length(hashed_api_key)=64),active boolean not null default true,last_seen_at timestamptz,enrollment_until timestamptz,pending_uid text,
 created_at timestamptz not null default now()
);
-- Authenticated users can read only their own data. All writes pass validated server routes.
do $$ declare t text; begin
 foreach t in array array['periods','students','period_students','rfid_tags','attendance_sessions','attendance_records','devices'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy own_read on public.%I for select to authenticated using (teacher_id = auth.uid())',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 if t <> 'devices' then execute format('grant select on public.%I to authenticated',t); end if;
 execute format('create index on public.%I(teacher_id)',t);
 end loop;
end $$;
grant select(id,teacher_id,device_name,device_identifier,active,last_seen_at,enrollment_until,pending_uid) on public.devices to authenticated;
alter table public.teachers enable row level security;
create policy own_read on public.teachers for select to authenticated using(id=auth.uid());
revoke all on public.teachers from anon,authenticated;
grant select on public.teachers to authenticated;
create function public.new_teacher() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.teachers(id,name,email) values(new.id,coalesce(new.raw_user_meta_data->>'name','Teacher'),new.email);return new;end $$;
create trigger on_teacher_created after insert on auth.users for each row execute function public.new_teacher();
-- Student lock serializes RFID, manual changes, and tag replacement. Unique constraints
-- independently prevent duplicate sessions/records across concurrent server instances.
create function public.ensure_session(p_teacher uuid,p_period uuid,p_date date,p_at timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare v_session uuid;begin
 perform pg_advisory_xact_lock(hashtextextended(p_teacher::text,0));
 insert into public.attendance_sessions(teacher_id,period_id,date,started_at) values(p_teacher,p_period,p_date,p_at) on conflict(period_id,date) do nothing returning id into v_session;
 if v_session is not null then
  insert into public.attendance_records(teacher_id,attendance_session_id,student_id,status,source)
  select p_teacher,v_session,m.student_id,'absent','manual' from public.period_students m join public.students s on s.id=m.student_id
  where m.teacher_id=p_teacher and m.period_id=p_period and s.active;
 else select id into v_session from public.attendance_sessions where teacher_id=p_teacher and period_id=p_period and date=p_date;end if;
 return v_session;end $$;
revoke all on function public.ensure_session(uuid,uuid,date,timestamptz) from public,anon,authenticated;
grant execute on function public.ensure_session(uuid,uuid,date,timestamptz) to service_role;
create function public.write_attendance(p_teacher uuid,p_student uuid,p_period uuid,p_date date,p_status text,p_source text,p_at timestamptz,p_uid text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_session uuid; v_record public.attendance_records;begin
 perform pg_advisory_xact_lock(hashtextextended(p_teacher::text,0));
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
create function public.replace_tag(p_teacher uuid,p_student uuid,p_uid text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_teacher::text,0));
 perform 1 from public.students where id=p_student and teacher_id=p_teacher and active for update;
 if not found then raise exception 'Student unavailable';end if;
 if exists(select 1 from public.rfid_tags where uid=p_uid and (student_id<>p_student or teacher_id<>p_teacher)) then raise exception 'Tag is assigned to another student';end if;
 update public.rfid_tags set active=false where student_id=p_student and teacher_id=p_teacher;
 insert into public.rfid_tags(teacher_id,student_id,uid) values(p_teacher,p_student,p_uid)
 on conflict(uid) do update set active=true,assigned_at=now();
end $$;
revoke all on function public.write_attendance(uuid,uuid,uuid,date,text,text,timestamptz,text) from public,anon,authenticated;
revoke all on function public.replace_tag(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.new_teacher() from public,anon,authenticated;
grant execute on function public.write_attendance(uuid,uuid,uuid,date,text,text,timestamptz,text) to service_role;
grant execute on function public.replace_tag(uuid,uuid,text) to service_role;
alter publication supabase_realtime add table public.attendance_records,public.attendance_sessions,public.rfid_tags,public.period_students,public.students,public.periods,public.teachers;
