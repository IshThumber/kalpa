-- Shared no-login ledger for this prototype.
-- Run in Supabase SQL Editor, then enable Realtime replication for public.expenses.
create table if not exists public.expenses (
  id text primary key,
  expense jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_expense_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at
before update on public.expenses
for each row execute function public.set_expense_updated_at();

alter table public.expenses enable row level security;

-- Deliberately open for the current no-login, single-group prototype.
-- Replace these policies with group-token or authenticated-user policies before
-- exposing the URL publicly.
create policy "Public ledger read" on public.expenses for select using (true);
create policy "Public ledger insert" on public.expenses for insert with check (true);
create policy "Public ledger update" on public.expenses for update using (true) with check (true);
create policy "Public ledger delete" on public.expenses for delete using (true);

alter publication supabase_realtime add table public.expenses;
