-- Vestigingen maken de planner bruikbaar voor eigenaren met meerdere winkels.
-- Een vestiging wordt één keer vastgelegd; orders en experts verwijzen daarna
-- alleen nog naar die vestiging.
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address_line text,
  postal_code text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.branches enable row level security;
grant select, insert, update, delete on table public.branches to authenticated;
drop policy if exists "authenticated users can manage branches" on public.branches;
create policy "authenticated users can manage branches"
on public.branches for all to authenticated
using (true) with check (true);

alter table public.orders
  add column if not exists branch_id uuid references public.branches(id) on delete set null;
create index if not exists orders_branch_id_idx on public.orders(branch_id);

alter table public.experts
  add column if not exists start_branch_id uuid references public.branches(id) on delete set null,
  add column if not exists lunch_branch_id uuid references public.branches(id) on delete set null,
  add column if not exists end_branch_id uuid references public.branches(id) on delete set null;

create index if not exists experts_start_branch_id_idx on public.experts(start_branch_id);
create index if not exists experts_lunch_branch_id_idx on public.experts(lunch_branch_id);
create index if not exists experts_end_branch_id_idx on public.experts(end_branch_id);
