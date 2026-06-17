-- ============================================
-- سماء الأدب — مخطط قاعدة البيانات (Supabase)
-- شغّل هذا الملف في: Supabase Dashboard > SQL Editor
-- ============================================

-- جدول الطلاب
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- جدول القصائد (المعلقات)
create table if not exists poems (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- جدول التسجيل (الحضور)
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  poem_id uuid not null references poems(id) on delete cascade,
  week_number integer not null,
  week_start_date date not null,
  day_of_week integer not null check (day_of_week between 0 and 4), -- 0=الأحد .. 4=الخميس
  type text not null check (type in ('hifz','sharh')),             -- hifz=حفظ، sharh=شرح
  created_at timestamptz not null default now(),
  -- منع التكرار: لكل طالب/قصيدة/أسبوع/يوم/نوع سجل واحد فقط
  unique (student_id, poem_id, week_number, day_of_week, type)
);

-- فهارس لتسريع الاستعلامات
create index if not exists idx_attendance_student on attendance(student_id);
create index if not exists idx_attendance_poem on attendance(poem_id);
create index if not exists idx_attendance_week on attendance(poem_id, week_number);

-- ============================================
-- تفعيل صلاحيات الوصول العام (RLS)
-- ملاحظة: التطبيق عام بدون مصادقة مستخدمين،
-- لذلك نسمح بالقراءة والكتابة للجميع عبر anon key.
-- لوحة الإدارة محمية بكلمة مرور داخل الواجهة.
-- ============================================
alter table students enable row level security;
alter table poems enable row level security;
alter table attendance enable row level security;

create policy "public read students"  on students  for select using (true);
create policy "public write students" on students  for insert with check (true);
create policy "public update students" on students for update using (true) with check (true);

create policy "public read poems"  on poems  for select using (true);
create policy "public write poems" on poems  for insert with check (true);
create policy "public update poems" on poems for update using (true) with check (true);

create policy "public read attendance"  on attendance  for select using (true);
create policy "public write attendance" on attendance  for insert with check (true);
create policy "public delete attendance" on attendance for delete using (true);

-- ============================================
-- بيانات أولية
-- ============================================
-- القصيدة الأولى: معلقة عنترة (تبدأ 17 يونيو 2026)
insert into poems (name, start_date, is_current)
values ('معلقة عنترة', '2026-06-17', true)
on conflict do nothing;

-- أمثلة لأسماء الطلاب (يمكن تعديلها أو إضافة غيرها من لوحة الإدارة)
insert into students (name) values
  ('عبدالله'),
  ('محمد'),
  ('أحمد')
on conflict (name) do nothing;
