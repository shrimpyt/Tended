-- Create inbox_scans table
create table public.inbox_scans (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  raw_barcode  text not null,
  status       text not null default 'unparsed' check (status in ('unparsed', 'parsed', 'rejected')),
  scanned_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Enable RLS
alter table public.inbox_scans enable row level security;

-- RLS Policies for inbox_scans
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
