-- ============================================================
-- Migration 001: quantity-based inventory tracking
-- Run in Supabase SQL Editor (single transaction)
-- Replaces stock_level (0-100 integer %) with quantity + max_quantity (real floats)
-- ============================================================

BEGIN;

-- 1. Add new columns to items (nullable initially so existing rows don't fail)
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS quantity      float,
  ADD COLUMN IF NOT EXISTS max_quantity  float;

-- 2. Backfill: convert existing percentage values
--    stock_level 75 -> quantity 0.75, max_quantity 1.0
--    threshold   25 -> 0.25 (real unit fraction)
UPDATE public.items
SET
  quantity     = ROUND((stock_level / 100.0)::numeric, 4),
  max_quantity = 1.0;

-- 3. Apply NOT NULL + CHECK constraints
ALTER TABLE public.items
  ALTER COLUMN quantity     SET NOT NULL,
  ALTER COLUMN max_quantity SET NOT NULL,
  ADD CONSTRAINT items_quantity_non_negative  CHECK (quantity >= 0),
  ADD CONSTRAINT items_max_quantity_positive  CHECK (max_quantity > 0),
  ADD CONSTRAINT items_quantity_lte_max       CHECK (quantity <= max_quantity);

-- 4. Migrate threshold: integer (0-100 %) -> float (real units)
ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_threshold_check,
  ALTER COLUMN threshold TYPE float USING (threshold / 100.0),
  ADD CONSTRAINT items_threshold_non_negative CHECK (threshold >= 0);

-- 5. Drop the hard category CHECK so user-defined categories work
ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_category_check;

-- 6. Rename old stock_level column (keep for one release cycle as safety net)
ALTER TABLE public.items RENAME COLUMN stock_level TO legacy_stock_level;

-- 7. Migrate stock_events: add float columns, backfill, rename old integer columns
ALTER TABLE public.stock_events
  ADD COLUMN IF NOT EXISTS old_quantity float,
  ADD COLUMN IF NOT EXISTS new_quantity float;

UPDATE public.stock_events
SET
  old_quantity = ROUND((old_level / 100.0)::numeric, 4),
  new_quantity = ROUND((new_level / 100.0)::numeric, 4);

ALTER TABLE public.stock_events
  ALTER COLUMN old_quantity SET NOT NULL,
  ALTER COLUMN new_quantity SET NOT NULL;

ALTER TABLE public.stock_events
  RENAME COLUMN old_level TO legacy_old_level;
ALTER TABLE public.stock_events
  RENAME COLUMN new_level TO legacy_new_level;

COMMIT;

-- ============================================================
-- Follow-up migration (run after all clients are on new version):
--
-- ALTER TABLE public.items DROP COLUMN legacy_stock_level;
-- ALTER TABLE public.stock_events DROP COLUMN legacy_old_level;
-- ALTER TABLE public.stock_events DROP COLUMN legacy_new_level;
-- ============================================================
