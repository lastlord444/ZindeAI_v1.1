-- Seed Data for CI Validation
-- 3 Valid Meals for 'aksam' / 'maintain' goal
-- Macros targeted around ~600kcal, >35g Protein
-- Alternatives linked cyclically: A -> B, C; B -> C, A; C -> A, B

INSERT INTO public.ingredients (id, name_tr, category, cost_tier, is_breakfast_only, is_main_only) VALUES
('11111111-1111-1111-1111-111111111111', 'Tavuk Göğsü', 'protein', 2, false, true),
('22222222-2222-2222-2222-222222222222', 'Dana Kıyma', 'protein', 3, false, true),
('33333333-3333-3333-3333-333333333333', 'Hindi Göğsü', 'protein', 3, false, true),
('44444444-4444-4444-4444-444444444444', 'Basmati Pirinç (Pişmiş)', 'carb', 1, false, false),
('55555555-5555-5555-5555-555555555555', 'Zeytinyağı', 'fat', 2, false, false);

INSERT INTO public.ingredient_macros (ingredient_id, per100_kcal, per100_p, per100_c, per100_f) VALUES
('11111111-1111-1111-1111-111111111111', 110, 23, 0, 1),
('22222222-2222-2222-2222-222222222222', 250, 26, 0, 15),
('33333333-3333-3333-3333-333333333333', 110, 23, 0, 1),
('44444444-4444-4444-4444-444444444444', 130, 2.7, 28, 0.3),
('55555555-5555-5555-5555-555555555555', 884, 0, 0, 100);

-- Meals (Aksam / Maintain)
-- Gates: 500-700 kcal, >35g P

-- Meal A: Tavuk Pilav (Est: 596 kcal, 41g P)
INSERT INTO public.meals (id, meal_name, meal_type, goal_tag, protein_source, prep_minutes, difficulty, fish_flag) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tavuklu Pilav', 'aksam', 'maintain', 'TAVUK', 20, 2, false);

-- Meal B: Kıymalı Pilav (Est: 560 kcal, 36.6g P)
INSERT INTO public.meals (id, meal_name, meal_type, goal_tag, protein_source, prep_minutes, difficulty, fish_flag) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Kıymalı Pilav', 'aksam', 'maintain', 'DANA', 25, 2, false);

-- Meal C: Hindili Pilav (Est: 589 kcal, 43.5g P)
INSERT INTO public.meals (id, meal_name, meal_type, goal_tag, protein_source, prep_minutes, difficulty, fish_flag) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Hindili Pilav', 'aksam', 'maintain', 'HINDI', 20, 2, false);

-- Meal Items

-- Meal A items
INSERT INTO public.meal_items (meal_id, ingredient_id, grams) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 150), -- Tavuk
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 250), -- Pirinc
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 12);  -- Yag

-- Meal B items
INSERT INTO public.meal_items (meal_id, ingredient_id, grams) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 120), -- Kiyma
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 200); -- Pirinc
-- No extra oil because beef is fatty

-- Meal C items
INSERT INTO public.meal_items (meal_id, ingredient_id, grams) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 160), -- Hindi
('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 250), -- Pirinc
('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 10);  -- Yag

-- Meal Alternatives
-- Cycle: A -> B, C
-- Cycle: B -> C, A
-- Cycle: C -> A, B
INSERT INTO public.meal_alternatives (meal_id, alt1_meal_id, alt2_meal_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
