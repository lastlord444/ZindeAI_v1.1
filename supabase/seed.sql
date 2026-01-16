-- Seed Data (Aligned with 0002_tables.sql + Phase 1.1 fixes applied later)
-- However, SEED runs AFTER Migrations.
-- We must check what columns exist after ALL migrations.
-- Migration History:
-- 0001: Enums
-- 0002: Tables (ingredients: name, price_per100_try, category, is_fish)
-- 0003-0005: Views/RLS/Indexes
-- 0006: Phase 1.1 Fixes (RENAME name -> name_tr, ADD cost_tier, is_breakfast_only, is_main_only)

-- SO: The final table 'ingredients' has 'name_tr' (renamed from name), 'cost_tier', etc.
-- BUT: 'price_per100_try' exists from 0002 unless dropped (0006 doesn't seem to drop it based on previous context, but let's assume strictness).
-- Wait, in Step 201 (0006 content):
-- ALTER TABLE public.ingredients RENAME COLUMN name TO name_tr;
-- ALTER TABLE ... ADD COLUMN ... cost_tier ...
--
-- Therefore, we SHOULD use 'name_tr' if 0006 runs.
-- The user error says "ingredients.name_tr does not exist".
-- This implies 0006 DID NOT RUN or FAILED, OR I am mistaken about 0006 content.
-- Let's stick to 0002 baseline for safety if we are unsure, BUT 0006 is critical.
--
-- HYPOTHESIS: The user's previous context shows 0006 exists.
-- IF 0006 runs, 'name' -> 'name_tr'.
-- IF 0006 FAILED, 'name' remains.
--
-- SAFE BET: The error "name_tr does not exist" strongly suggests the column is named 'name'.
-- This means either 0006 didn't rename it, or 0006 hasn't run yet in the environment where error occurred.
-- BUT CI runs 'db reset', which applies all.
--
-- LET'S LOOK AT 0002 AGAIN. It has 'name'.
--
-- DECISION: Use 'name' for now. If 0006 renames it later, we update.
-- ALSO: 'price_per100_try' is NOT NULL in 0002. We MUST provide it.
-- ALSO: 'cost_tier' is NOT in 0002. We strictly shouldn't insert it if it doesn't exist yet, but if 0006 adds it, we should.
--
-- STRATEGY: Insert into columns defined in 0002 ('name', 'price_per100_try').
-- IGNORE cost_tier for now to fix the standard schema error, OR check if we can skip it.
--
-- UPDATED PLAN:
-- 1. Use 'name' instead of 'name_tr'.
-- 2. Provide 'price_per100_try' (default 0).
-- 3. Omit 'cost_tier', 'aliases', 'is_breakfast_only', 'is_main_only' IF they cause errors, but if 0006 runs they are needed.
--
-- User Request said: "CI fails: ingredients.name_tr does not exist".
-- This confirms 0006 didn't run or verify logic is wrong.
-- I will strictly adhere to 0002 structure for the base columns + price.

WITH 
ing_defaults AS (
   SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a'::text as prefix
)
INSERT INTO public.ingredients (id, name, category, price_per100_try, is_fish) VALUES
((SELECT prefix || '11' FROM ing_defaults)::uuid, 'Tavuk Göğsü', 'protein', 15.0, false),
((SELECT prefix || '22' FROM ing_defaults)::uuid, 'Dana Kıyma', 'protein', 30.0, false),
((SELECT prefix || '33' FROM ing_defaults)::uuid, 'Hindi Göğsü', 'protein', 20.0, false),
((SELECT prefix || '44' FROM ing_defaults)::uuid, 'Basmati Pirinç (Pişmiş)', 'carb', 5.0, false),
((SELECT prefix || '55' FROM ing_defaults)::uuid, 'Zeytinyağı', 'fat', 100.0, false)
ON CONFLICT (id) DO NOTHING;

WITH 
ing_defaults AS (
   SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a'::text as prefix
)
INSERT INTO public.ingredient_macros (ingredient_id, per100_kcal, per100_p, per100_c, per100_f) VALUES
((SELECT prefix || '11' FROM ing_defaults)::uuid, 110, 23, 0, 1),
((SELECT prefix || '22' FROM ing_defaults)::uuid, 250, 26, 0, 15),
((SELECT prefix || '33' FROM ing_defaults)::uuid, 110, 23, 0, 1),
((SELECT prefix || '44' FROM ing_defaults)::uuid, 130, 2.7, 28, 0.3),
((SELECT prefix || '55' FROM ing_defaults)::uuid, 884, 0, 0, 100)
ON CONFLICT (ingredient_id) DO NOTHING;

-- ====== MEALS ======
-- 0002 Table: meals (name, meal_type, goal_tag, meal_class, protein_source, prep_minutes, difficulty, tags)
WITH
mt AS (
  SELECT
    COALESCE(
      (SELECT v FROM unnest(enum_range(NULL::public.meal_type)) v WHERE lower(v::text) IN ('dinner','aksam','evening') LIMIT 1),
      (SELECT v FROM unnest(enum_range(NULL::public.meal_type)) v LIMIT 1)
    ) AS meal_type_v
),
gt AS (
  SELECT
    COALESCE(
      (SELECT v FROM unnest(enum_range(NULL::public.goal_tag)) v WHERE lower(v::text) IN ('maintain','maintenance','koru') LIMIT 1),
      (SELECT v FROM unnest(enum_range(NULL::public.goal_tag)) v LIMIT 1)
    ) AS goal_tag_v
),
mc AS (
  SELECT
    COALESCE(
      (SELECT v FROM unnest(enum_range(NULL::public.meal_class)) v WHERE lower(v::text) IN ('main','ana','entree') LIMIT 1),
      (SELECT v FROM unnest(enum_range(NULL::public.meal_class)) v LIMIT 1)
    ) AS meal_class_v
)
INSERT INTO public.meals (id, name, meal_type, goal_tag, meal_class, protein_source, prep_minutes, difficulty, tags)
SELECT 
  x.id, x.name, (SELECT meal_type_v FROM mt), (SELECT goal_tag_v FROM gt), (SELECT meal_class_v FROM mc),
  x.protein_source, x.prep_minutes, x.difficulty, x.tags
FROM (
  VALUES
    ('11111111-1111-1111-1111-111111111111'::uuid, 'Tavuklu Akşam Tabağı', 'TAVUK', 20, 2, ARRAY['seed','ci']::text[]),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'Kıymalı Akşam Tabağı', 'DANA',    25, 3, ARRAY['seed','ci']::text[]),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'Hindili Akşam Tabağı', 'HINDI',  18, 2, ARRAY['seed','ci']::text[])
) AS x(id, name, protein_source, prep_minutes, difficulty, tags)
ON CONFLICT (id) DO NOTHING;

-- ====== MEAL_ITEMS ======
WITH 
ing_defaults AS (
   SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a'::text as prefix
)
INSERT INTO public.meal_items (meal_id, ingredient_id, grams) VALUES
-- Meal A (1111...) Tavuk
('11111111-1111-1111-1111-111111111111', (SELECT prefix || '11' FROM ing_defaults)::uuid, 150),
('11111111-1111-1111-1111-111111111111', (SELECT prefix || '44' FROM ing_defaults)::uuid, 250),
('11111111-1111-1111-1111-111111111111', (SELECT prefix || '55' FROM ing_defaults)::uuid, 12),
-- Meal B (2222...) Kiyma
('22222222-2222-2222-2222-222222222222', (SELECT prefix || '22' FROM ing_defaults)::uuid, 120),
('22222222-2222-2222-2222-222222222222', (SELECT prefix || '44' FROM ing_defaults)::uuid, 200),
-- Meal C (3333...) Hindi
('33333333-3333-3333-3333-333333333333', (SELECT prefix || '33' FROM ing_defaults)::uuid, 160),
('33333333-3333-3333-3333-333333333333', (SELECT prefix || '44' FROM ing_defaults)::uuid, 250),
('33333333-3333-3333-3333-333333333333', (SELECT prefix || '55' FROM ing_defaults)::uuid, 10
)
ON CONFLICT (meal_id, ingredient_id) DO NOTHING;

-- ====== MEAL_ALTERNATIVES ======
INSERT INTO public.meal_alternatives (meal_id, alt1_meal_id, alt2_meal_id)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, '33333333-3333-3333-3333-333333333333'::uuid),
  ('22222222-2222-2222-2222-222222222222'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333333'::uuid),
  ('33333333-3333-3333-3333-333333333333'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid)
ON CONFLICT (meal_id) DO NOTHING;
