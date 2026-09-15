-- Een klant staat één keer in de klantenlijst. Elke losse Vendit-order blijft bewaard in public.orders.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  source_order_number text unique,
  customer_id uuid not null references public.customers(id) on delete cascade,
  imported_customer_id uuid unique references public.customers(id) on delete set null,
  work_type text,
  duration_minutes integer check (duration_minutes > 0),
  required_people smallint not null default 1 check (required_people between 1 and 4),
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;
grant select, insert, update, delete on table public.orders to authenticated;
drop policy if exists "authenticated users can manage orders" on public.orders;
create policy "authenticated users can manage orders" on public.orders for all to authenticated using (true) with check (true);

-- Een order kan door een team worden uitgevoerd, bijvoorbeeld bij een tweepersoonslevering.
create table if not exists public.order_experts (
  order_id uuid not null references public.orders(id) on delete cascade,
  expert_id uuid not null references public.experts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (order_id, expert_id)
);
alter table public.order_experts enable row level security;
grant select, insert, update, delete on table public.order_experts to authenticated;
drop policy if exists "authenticated users can manage order teams" on public.order_experts;
create policy "authenticated users can manage order teams" on public.order_experts for all to authenticated using (true) with check (true);

alter table public.appointments add column if not exists order_id uuid references public.orders(id) on delete set null;

-- Zet de huidige geïmporteerde regels veilig om: elke regel wordt een order;
-- per gelijke naam + adres blijft één klant actief en de overige klantregels worden gearchiveerd.
with ranked as (
  select id, customer_number, name, address_line, postal_code, city, desired_visit_minutes, notes, extra_fields,
    first_value(id) over (partition by lower(trim(name)), lower(trim(address_line)), lower(coalesce(trim(postal_code), '')), lower(coalesce(trim(city), '')) order by created_at, id) as canonical_customer_id
  from public.customers
), inserted as (
  insert into public.orders (source_order_number, customer_id, imported_customer_id, work_type, duration_minutes, metadata)
  select coalesce(nullif(customer_number, ''), id::text), canonical_customer_id, id,
    nullif(extra_fields ->> 'work_type', ''), desired_visit_minutes,
    jsonb_build_object('migrated_from_customer_row', true, 'notes', coalesce(notes, ''))
  from ranked
  on conflict (source_order_number) do nothing
  returning id
)
update public.customers duplicate
set status = 'archived', extra_fields = duplicate.extra_fields || jsonb_build_object('merged_to_customer', ranked.canonical_customer_id)
from ranked
where duplicate.id = ranked.id and duplicate.id <> ranked.canonical_customer_id;

-- De actieve klant is een klant, geen ordernummer.
update public.customers set customer_number = null where status <> 'archived';
