create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  project_id text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists calendar_events_event_date_idx
  on public.calendar_events (event_date);

alter table public.tasks
  add column if not exists created_at timestamptz;

alter table public.tasks
  alter column created_at set default now();

alter table public.calendar_events enable row level security;

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['projects', 'milestones', 'tasks', 'calendar_events']
    loop
      if to_regclass(format('public.%I', table_name)) is not null
        and not exists (
          select 1
          from pg_publication_tables
          where pubname = 'supabase_realtime'
            and schemaname = 'public'
            and tablename = table_name
        ) then
        execute format(
          'alter publication supabase_realtime add table public.%I',
          table_name
        );
      end if;
    end loop;
  end if;
end
$$;