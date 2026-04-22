-- ============================================================
-- Migration 004: Meals Expansion (Shared Library & Saving)
-- ============================================================

BEGIN;

-- 1. Ensure recipes table exists and update its schema
CREATE TABLE IF NOT EXISTS public.recipes (
    id                uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
    title             text                     NOT NULL,
    ingredients       jsonb                    NOT NULL DEFAULT '[]'::jsonb,
    instructions      text,
    image             text,
    spoonacular_id    bigint                   UNIQUE,
    ready_in_minutes  integer,
    servings          integer,
    is_public         boolean                  NOT NULL DEFAULT true,
    household_id      uuid                     REFERENCES public.households(id) ON DELETE CASCADE,
    created_at        timestamp with time zone NOT NULL DEFAULT now()
);

-- Handling renames or additions if table already existed (from drift)
DO $$ 
BEGIN
    -- Rename 'name' to 'title' if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='recipes' AND column_name='name'
    ) THEN
        ALTER TABLE public.recipes RENAME COLUMN name TO title;
    END IF;

    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='spoonacular_id') THEN
        ALTER TABLE public.recipes ADD COLUMN spoonacular_id bigint UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='image') THEN
        ALTER TABLE public.recipes ADD COLUMN image text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='ready_in_minutes') THEN
        ALTER TABLE public.recipes ADD COLUMN ready_in_minutes integer;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='servings') THEN
        ALTER TABLE public.recipes ADD COLUMN servings integer;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='is_public') THEN
        ALTER TABLE public.recipes ADD COLUMN is_public boolean NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='household_id') THEN
        ALTER TABLE public.recipes ADD COLUMN household_id uuid REFERENCES public.households(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Create saved_meals table
CREATE TABLE IF NOT EXISTS public.saved_meals (
    id            uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  uuid                     NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    recipe_id     uuid                     NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    created_at    timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(household_id, recipe_id)
);

-- 3. Row-Level Security
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;

-- Recipes Policies
-- Everyone can read public recipes or their own household's recipes
DROP POLICY IF EXISTS "everyone can read public recipes" ON public.recipes;
CREATE POLICY "everyone can read public recipes"
    ON public.recipes FOR SELECT
    USING (is_public = true OR household_id IN (
        SELECT household_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Users can insert their own recipes
DROP POLICY IF EXISTS "users can insert their own recipes" ON public.recipes;
CREATE POLICY "users can insert their own recipes"
    ON public.recipes FOR INSERT
    WITH CHECK (true); -- We rely on household_id check in saved_meals for control, 
                       -- but technically recipes can be public.

-- Saved Meals Policies
-- Users can read their household's saved meals
DROP POLICY IF EXISTS "household members can read saved meals" ON public.saved_meals;
CREATE POLICY "household members can read saved meals"
    ON public.saved_meals FOR SELECT
    USING (household_id IN (
        SELECT household_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Users can save meals for their household
DROP POLICY IF EXISTS "household members can save meals" ON public.saved_meals;
CREATE POLICY "household members can save meals"
    ON public.saved_meals FOR INSERT
    WITH CHECK (household_id IN (
        SELECT household_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Users can delete their saved meals
DROP POLICY IF EXISTS "household members can delete saved meals" ON public.saved_meals;
CREATE POLICY "household members can delete saved meals"
    ON public.saved_meals FOR DELETE
    USING (household_id IN (
        SELECT household_id FROM public.profiles WHERE id = auth.uid()
    ));

COMMIT;
