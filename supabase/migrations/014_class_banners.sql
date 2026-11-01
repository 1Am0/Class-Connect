-- Class banner themes, colors and photos follow the teacher across browsers.
-- Choices live on the teacher row; photos are in a private bucket that only
-- the service role reads and writes, through /api/class-banners.
alter table public.teachers
  add column if not exists class_banners jsonb not null default '{}'::jsonb;

alter table public.teachers
  drop constraint if exists class_banners_object,
  add constraint class_banners_object
    check (jsonb_typeof(class_banners) = 'object');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('class-banners', 'class-banners', false, 3145728,
        array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
