-- ============================================================
-- Tended — Database Schema
-- Run this in full in the Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 1. CREATE ALL TABLES FIRST
-- ============================================================

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text not null default '',
  household_id  uuid references public.households(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table public.items (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  category     text,
  quantity     float not null check (quantity >= 0),
  max_quantity float not null check (max_quantity > 0) check (quantity <= max_quantity),
  threshold    float not null default 0.2 check (threshold >= 0),
  unit         text,
  barcode      text,
  photo_url    text,
  created_by   uuid references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now()
);

create table public.stock_events (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.items(id) on delete cascade,
  old_quantity   float not null check (old_quantity >= 0),
  new_quantity   float not null check (new_quantity >= 0),
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table public.shopping_list (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  item_name    text not null,
  item_id      uuid references public.items(id) on delete set null,
  added_by     text not null,
  note         text,
  completed    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.spending_entries (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  amount       numeric(10, 2) not null check (amount >= 0),
  category     text not null,
  item_name    text,
  added_by     uuid references public.profiles(id) on delete set null,
  date         date not null default current_date,
  is_waste     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.recipes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  ingredients  jsonb not null default '[]'::jsonb,
  instructions text,
  created_at   timestamptz not null default now()
);

create table public.inbox_scans (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  raw_barcode  text not null,
  status       text not null default 'unparsed' check (status in ('unparsed', 'parsed', 'rejected')),
  scanned_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);


-- ============================================================
-- 2. TRIGGERS
-- ============================================================

-- Auto-create profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at on items
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_set_updated_at
  before update on public.items
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 3. ENABLE RLS ON ALL TABLES
-- ============================================================

alter table public.households      enable row level security;
alter table public.profiles        enable row level security;
alter table public.items           enable row level security;
alter table public.stock_events    enable row level security;
alter table public.shopping_list   enable row level security;
alter table public.spending_entries enable row level security;
alter table public.recipes         enable row level security;
alter table public.inbox_scans     enable row level security;


-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- households
create policy "household members can read"
  on public.households for select
  using (
    id in (
      select household_id from public.profiles
      where id = auth.uid()
    )
  );

create policy "authenticated users can create household"
  on public.households for insert
  to authenticated
  with check (true);

-- profiles
create policy "household members can read profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    or household_id in (
      select household_id from public.profiles
      where id = auth.uid()
        and household_id is not null
    )
  );

create policy "users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- items
create policy "household members can read items"
  on public.items for select
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can insert items"
  on public.items for insert
  with check (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can update items"
  on public.items for update
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can delete items"
  on public.items for delete
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

-- stock_events
create policy "household members can read stock events"
  on public.stock_events for select
  using (
    item_id in (
      select id from public.items
      where household_id in (
        select household_id from public.profiles
        where id = auth.uid() and household_id is not null
      )
    )
  );

create policy "household members can insert stock events"
  on public.stock_events for insert
  with check (
    item_id in (
      select id from public.items
      where household_id in (
        select household_id from public.profiles
        where id = auth.uid() and household_id is not null
      )
    )
  );

-- shopping_list
create policy "household members can read shopping list"
  on public.shopping_list for select
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can insert shopping list items"
  on public.shopping_list for insert
  with check (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can update shopping list items"
  on public.shopping_list for update
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can delete shopping list items"
  on public.shopping_list for delete
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

-- spending_entries
create policy "household members can read spending entries"
  on public.spending_entries for select
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can insert spending entries"
  on public.spending_entries for insert
  with check (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can update spending entries"
  on public.spending_entries for update
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can delete spending entries"
  on public.spending_entries for delete
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

-- recipes (global read-only for all authenticated users)
create policy "authenticated users can read recipes"
  on public.recipes for select
  to authenticated
  using (true);

-- inbox_scans
create policy "household members can read inbox scans"
  on public.inbox_scans for select
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can insert inbox scans"
  on public.inbox_scans for insert
  with check (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can update inbox scans"
  on public.inbox_scans for update
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );

create policy "household members can delete inbox scans"
  on public.inbox_scans for delete
  using (
    household_id in (
      select household_id from public.profiles
      where id = auth.uid() and household_id is not null
    )
  );
