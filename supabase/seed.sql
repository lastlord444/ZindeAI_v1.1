-- Seed Data for CI Validation
-- 3 Valid Meals for 'aksam' / 'maintain' goal
-- Macros targeted around ~600kcal, >35g Protein
-- Alternatives linked cyclically: A -> B, C; B -> C, A; C -> A, B

WITH 
ing_defaults AS (
   SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a'::text as prefix
)
INSERT INTO public.ingredients (id, name_tr, category, cost_tier, is_breakfast_only, is_main_only) VALUES
((SELECT prefix || '11' FROM ing_defaults)::uuid, 'Tavuk Göğsü', 'protein', 2, false, true),
((SELECT prefix || '22' FROM ing_defaults)::uuid, 'Dana Kıyma', 'protein', 3, false, true),
((SELECT prefix || '33' FROM ing_defaults)::uuid, 'Hindi Göğsü', 'protein', 3, false, true),
((SELECT prefix || '44' FROM ing_defaults)::uuid, 'Basmati Pirinç (Pişmiş)', 'carb', 1, false, false),
((SELECT prefix || '55' FROM ing_defaults)::uuid, 'Zeytinyağı', 'fat', 2, false, false)
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

-- ====== MEALS (schema-aligned) ======
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
INSERT INTO public.meals (id, meal_name, meal_type, goal_tag, meal_class, protein_source, prep_minutes, difficulty, tags, fish_flag)
SELECT 
  x.id, x.name, (SELECT meal_type_v FROM mt), (SELECT goal_tag_v FROM gt), (SELECT meal_class_v FROM mc),
  x.protein_source, x.prep_minutes, x.difficulty, x.tags, false
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

-- ====== MEAL_ALTERNATIVES (schema-aligned) ======
INSERT INTO public.meal_alternatives (meal_id, alt1_meal_id, alt2_meal_id)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, '33333333-3333-3333-3333-333333333333'::uuid),
  ('22222222-2222-2222-2222-222222222222'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333333'::uuid),
  ('33333333-3333-3333-3333-333333333333'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid)
ON CONFLICT (meal_id) DO NOTHING;
