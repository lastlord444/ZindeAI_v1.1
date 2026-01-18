-- Seed Data (Safe PL/pgSQL Block)
-- Ensures single transaction, safe enum lookup, no conflicts needed (fresh DB).

DO $$
DECLARE
    -- Enum Values
    mt_kahvalti public.meal_type;
    mt_ogle public.meal_type;
    mt_aksam public.meal_type;
    
    gt public.goal_tag;
    
    mc_breakfast public.meal_class;
    mc_main public.meal_class;
    
    -- Meal IDs
    m1_id uuid := '11111111-1111-1111-1111-111111111111'; -- Aksam 1
    m2_id uuid := '22222222-2222-2222-2222-222222222222'; -- Aksam 2
    m3_id uuid := '33333333-3333-3333-3333-333333333333'; -- Aksam 3
    
    m4_id uuid := '44444444-4444-4444-4444-444444444444'; -- Kahvalti 1
    m5_id uuid := '55555555-5555-5555-5555-555555555555'; -- Kahvalti 2
    m6_id uuid := '66666666-6666-6666-6666-666666666666'; -- Kahvalti 3
    
    m7_id uuid := '77777777-7777-7777-7777-777777777777'; -- Ogle 1
    m8_id uuid := '88888888-8888-8888-8888-888888888888'; -- Ogle 2
    m9_id uuid := '99999999-9999-9999-9999-999999999999'; -- Ogle 3
    
    -- Ingredient IDs
    i1_id uuid := 'aaaaaaaa-1111-4ef8-bb6d-6bb9bd380a11'; -- Chicken
    i2_id uuid := 'aaaaaaaa-2222-4ef8-bb6d-6bb9bd380a22'; -- Beef
    i3_id uuid := 'aaaaaaaa-3333-4ef8-bb6d-6bb9bd380a33'; -- Turkey
    i4_id uuid := 'aaaaaaaa-4444-4ef8-bb6d-6bb9bd380a44'; -- Rice
    i5_id uuid := 'aaaaaaaa-5555-4ef8-bb6d-6bb9bd380a55'; -- Oil
    
    i6_id uuid := 'aaaaaaaa-6666-4ef8-bb6d-6bb9bd380a66'; -- Egg
    i7_id uuid := 'aaaaaaaa-7777-4ef8-bb6d-6bb9bd380a77'; -- Oats
    i8_id uuid := 'aaaaaaaa-8888-4ef8-bb6d-6bb9bd380a88'; -- Cheese
    i9_id uuid := 'aaaaaaaa-9999-4ef8-bb6d-6bb9bd380a99'; -- Lor Peyniri

BEGIN
    -- 1. Resolve Enums safely
    
    -- Meal Types
    SELECT enumlabel::public.meal_type INTO mt_kahvalti FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'meal_type' AND enumlabel = 'kahvalti' LIMIT 1;
    SELECT enumlabel::public.meal_type INTO mt_ogle FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'meal_type' AND enumlabel = 'ogle' LIMIT 1;
    SELECT enumlabel::public.meal_type INTO mt_aksam FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'meal_type' AND enumlabel = 'aksam' LIMIT 1;

    -- Meal Classes
    SELECT enumlabel::public.meal_class INTO mc_breakfast FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'meal_class' AND enumlabel = 'breakfast' LIMIT 1;
    SELECT enumlabel::public.meal_class INTO mc_main FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'meal_class' AND enumlabel = 'main_meal' LIMIT 1;

    -- Goal Tag (Default to maintain/cut)
    SELECT enumlabel::public.goal_tag INTO gt FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'goal_tag' AND enumlabel = 'cut' LIMIT 1;

    -- 2. Insert Ingredients
    INSERT INTO public.ingredients (id, name, price_per100_try, category, is_fish) VALUES
    (i1_id, 'Tavuk Göğsü', 15.0, 'protein', false),
    (i2_id, 'Dana Kıyma', 30.0, 'protein', false),
    (i3_id, 'Hindi Göğsü', 20.0, 'protein', false),
    (i4_id, 'Basmati Pirinç (Pişmiş)', 5.0, 'carb', false),
    (i5_id, 'Zeytinyağı', 100.0, 'fat', false),
    (i6_id, 'Yumurta (Adet)', 2.50, 'protein', false), -- Price per unit treated as per 100g logic? Usually schema calls for 100g price. Let's assume 1 egg ~ 50g. Price per 100g = 5.0
    (i7_id, 'Yulaf Ezmesi', 7.0, 'carb', false),
    (i8_id, 'Beyaz Peynir', 25.0, 'fat', false),
    (i9_id, 'Lor Peyniri', 15.0, 'protein', false);

    -- 3. Insert Macros (per 100g)
    INSERT INTO public.ingredient_macros (ingredient_id, per100_kcal, per100_p, per100_c, per100_f) VALUES
    (i1_id, 110, 23, 0, 1),
    (i2_id, 250, 26, 0, 15),
    (i3_id, 110, 23, 0, 1),
    (i4_id, 130, 2.7, 28, 0.3),
    (i5_id, 884, 0, 0, 100),
    (i6_id, 155, 13, 1.1, 11), -- Egg
    (i7_id, 389, 16.9, 66, 6.9), -- Oats
    (i8_id, 260, 14, 2, 21), -- Cheese
    (i9_id, 100, 19, 2, 2); -- Lor

    -- 4. Insert Meals
    INSERT INTO public.meals (id, name, meal_type, goal_tag, meal_class, protein_source, prep_minutes, difficulty, tags) VALUES
    -- Aksam
    (m1_id, 'Tavuklu Akşam Tabağı', mt_aksam, gt, mc_main, 'TAVUK', 20, 2, ARRAY['seed','ci']),
    (m2_id, 'Kıymalı Akşam Tabağı', mt_aksam, gt, mc_main, 'DANA', 25, 3, ARRAY['seed','ci']),
    (m3_id, 'Hindili Akşam Tabağı', mt_aksam, gt, mc_main, 'HINDI', 18, 2, ARRAY['seed','ci']),
    -- Kahvalti
    (m4_id, 'Yulaflı Kahvaltı', mt_kahvalti, gt, mc_breakfast, 'YUMURTA', 5, 1, ARRAY['seed','ci']),
    (m5_id, 'Peynirli Omlet', mt_kahvalti, gt, mc_breakfast, 'YUMURTA', 10, 2, ARRAY['seed','ci']),
    (m6_id, 'Lorlu Kahvaltı', mt_kahvalti, gt, mc_breakfast, 'PEYNIR', 5, 1, ARRAY['seed','ci']),
    -- Ogle
    (m7_id, 'Tavuk Pilav (Öğle)', mt_ogle, gt, mc_main, 'TAVUK', 20, 1, ARRAY['seed','ci']),
    (m8_id, 'Kıymalı Pilav (Öğle)', mt_ogle, gt, mc_main, 'DANA', 20, 2, ARRAY['seed','ci']),
    (m9_id, 'Hindili Pilav (Öğle)', mt_ogle, gt, mc_main, 'HINDI', 20, 2, ARRAY['seed','ci']);

    -- 5. Insert Meal Items
    INSERT INTO public.meal_items (meal_id, ingredient_id, grams) VALUES
    -- Meal 1 (Chicken Dinner)
    (m1_id, i1_id, 150), (m1_id, i4_id, 250), (m1_id, i5_id, 10),
    -- Meal 2 (Beef Dinner)
    (m2_id, i2_id, 120), (m2_id, i4_id, 200),
    -- Meal 3 (Turkey Dinner)
    (m3_id, i3_id, 160), (m3_id, i4_id, 250), (m3_id, i5_id, 10),
    -- Meal 4 (Oats Breakfast)
    (m4_id, i7_id, 80), (m4_id, i6_id, 100), -- 2 Eggs (approx 100g)
    -- Meal 5 (Omelette Breakfast)
    (m5_id, i6_id, 150), -- 3 Eggs
    (m5_id, i8_id, 30), -- Cheese
    (m5_id, i5_id, 5), -- Oil
    -- Meal 6 (Lor Breakfast)
    (m6_id, i9_id, 150), (m6_id, i5_id, 5),
    -- Meal 7 (Chicken Lunch)
    (m7_id, i1_id, 120), (m7_id, i4_id, 200), (m7_id, i5_id, 5),
    -- Meal 8 (Beef Lunch)
    (m8_id, i2_id, 100), (m8_id, i4_id, 180),
    -- Meal 9 (Turkey Lunch)
    (m9_id, i3_id, 120), (m9_id, i4_id, 200), (m9_id, i5_id, 5);

    -- 6. Insert Alternatives (Cyclic)
    INSERT INTO public.meal_alternatives (meal_id, alt1_meal_id, alt2_meal_id) VALUES
    -- Dinner Cycle
    (m1_id, m2_id, m3_id), (m2_id, m3_id, m1_id), (m3_id, m1_id, m2_id),
    -- Breakfast Cycle
    (m4_id, m5_id, m6_id), (m5_id, m6_id, m4_id), (m6_id, m4_id, m5_id),
    -- Lunch Cycle
    (m7_id, m8_id, m9_id), (m8_id, m9_id, m7_id), (m9_id, m7_id, m8_id);

END $$;
