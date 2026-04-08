-- ============================================================
-- Migration 002: waste tracking & per-item price
-- Run in Supabase SQL Editor (single transaction)
-- ============================================================

BEGIN;

-- 1. Add price and expiry tracking to items
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS price        numeric(10, 2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS expiry_date  timestamp with time zone;

-- 2. Create the waste_events (Graveyard) table
CREATE TABLE IF NOT EXISTS public.waste_events (
  id           uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid                     NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  item_id      uuid                     REFERENCES public.items(id) ON DELETE SET NULL,
  item_name    text                     NOT NULL,
  quantity     numeric(10, 4)           NOT NULL DEFAULT 0,
  unit         text,
  cost         numeric(10, 2)           NOT NULL DEFAULT 0,
  reason       text                     CHECK (reason IN ('expired', 'discarded', 'spoiled')) DEFAULT 'discarded',
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  recorded_by  uuid                     REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Index for household-based queries (most common access pattern)
CREATE INDEX IF NOT EXISTS waste_events_household_id_idx
  ON public.waste_events (household_id, created_at DESC);

-- 4. Row-Level Security
ALTER TABLE public.waste_events ENABLE ROW LEVEL SECURITY;

-- Members can read waste events for their household
CREATE POLICY "household members can read waste events"
  ON public.waste_events FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Members can insert waste events for their household
CREATE POLICY "household members can insert waste events"
  ON public.waste_events FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 5. Trigger: auto-create waste event when an item's expiry_date passes
--    (requires pg_cron or a scheduled function in Supabase Edge — placeholder trigger)
--    Left as a comment; wire up via Supabase Edge Function / cron in production.
--
-- CREATE OR REPLACE FUNCTION public.fn_expire_items()
-- RETURNS void LANGUAGE plpgsql AS $$
-- BEGIN
--   INSERT INTO public.waste_events (household_id, item_id, item_name, quantity, unit, cost, reason)
--   SELECT household_id, id, name, quantity, unit, price * quantity, 'expired'
--   FROM public.items
--   WHERE expiry_date < now() AND quantity > 0;
--
--   UPDATE public.items SET quantity = 0
--   WHERE expiry_date < now() AND quantity > 0;
-- END;
-- $$;

COMMIT;
