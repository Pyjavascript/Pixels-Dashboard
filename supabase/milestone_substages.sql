alter table public.milestones
  add column if not exists subtasks jsonb not null default '[]'::jsonb;