-- ============================================================
-- Migration 003: RBAC — roles, dietary restrictions, onboarding
-- Run this in the Supabase SQL Editor after schema.sql
-- ============================================================

-- 1. Role enum
DO $$ BEGIN
  CREATE TYPE public.profile_role AS ENUM ('creator', 'admin', 'member', 'restricted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.profile_role NOT NULL DEFAULT 'member';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dietary_restrictions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Allowed inventory categories for restricted users (null = unrestricted)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS restricted_categories jsonb DEFAULT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_onboarded boolean NOT NULL DEFAULT false;

-- 3. Add owner_id to households
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Allow household admins/creators to update other members' profiles
--    (needed for role assignment and category restriction management)
DO $$ BEGIN
  CREATE POLICY "admins can update member roles"
    ON public.profiles FOR UPDATE
    USING (
      household_id IN (
        SELECT household_id FROM public.profiles p2
        WHERE p2.id = auth.uid()
          AND p2.role IN ('admin', 'creator')
          AND p2.household_id IS NOT NULL
      )
    )
    WITH CHECK (
      household_id IN (
        SELECT household_id FROM public.profiles p2
        WHERE p2.id = auth.uid()
          AND p2.role IN ('admin', 'creator')
          AND p2.household_id IS NOT NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Allow household members to update their own household's owner_id
DO $$ BEGIN
  CREATE POLICY "household members can update household"
    ON public.households FOR UPDATE
    USING (
      id IN (
        SELECT household_id FROM public.profiles
        WHERE id = auth.uid() AND household_id IS NOT NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
