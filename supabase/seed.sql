-- Seed Data (Safe PL/pgSQL Block)
-- Ensures single transaction, safe enum lookup, no conflicts needed (fresh DB).

DO $$
DECLARE
    -- Enum Values
    mt public.meal_type;
    gt public.goal_tag;
    mc public.meal_class;
    
    -- IDs
    m1_id uuid := '11111111-1111-1111-1111-111111111111';
    m2_id uuid := '22222222-2222-2222-2222-222222222222';
    m3_id uuid := '33333333-3333-3333-3333-333333333333';
    
    i1_id uuid := 'aaaaaaaa-1111-4ef8-bb6d-6bb9bd380a11'; -- Chicken
    i2_id uuid := 'aaaaaaaa-2222-4ef8-bb6d-6bb9bd380a22'; -- Beef
    i3_id uuid := 'aaaaaaaa-3333-4ef8-bb6d-6bb9bd380a33'; -- Turkey
    i4_id uuid := 'aaaaaaaa-4444-4ef8-bb6d-6bb9bd380a44'; -- Rice
    i5_id uuid := 'aaaaaaaa-5555-4ef8-bb6d-6bb9bd380a55'; -- Oil

BEGIN
    -- 1. Resolve Enums safely
    -- Try to find 'aksam'/'dinner', fallback to first value
    SELECT enumlabel::public.meal_type INTO mt 
    FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'meal_type' 
      AND enumlabel IN ('aksam', 'dinner', 'evening') LIMIT 1;
      
    IF mt IS NULL THEN
        SELECT enumlabel::public.meal_type INTO mt 
        FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'meal_type' LIMIT 1;
    END IF;

    -- Goal Tag
    SELECT enumlabel::public.goal_tag INTO gt 
    FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'goal_tag' 
      AND enumlabel IN ('maintain', 'koru') LIMIT 1;

    IF gt IS NULL THEN
         SELECT enumlabel::public.goal_tag INTO gt
         FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
         WHERE pg_type.typname = 'goal_tag' LIMIT 1;
    END IF;

    -- Meal Class
    SELECT enumlabel::public.meal_class INTO mc 
    FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'meal_class' 
      AND enumlabel IN ('main_meal', 'ana', 'main') LIMIT 1;

    IF mc IS NULL THEN
         SELECT enumlabel::public.meal_class INTO mc
         FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
         WHERE pg_type.typname = 'meal_class' LIMIT 1;
    END IF;

    -- 2. Insert Ingredients
    INSERT INTO public.ingredients (id, name, price_per100_try, category, is_fish) VALUES
    (i1_id, 'Tavuk Göğsü', 15.0, 'protein', false),
    (i2_id, 'Dana Kıyma', 30.0, 'protein', false),
    (i3_id, 'Hindi Göğsü', 20.0, 'protein', false),
    (i4_id, 'Basmati Pirinç (Pişmiş)', 5.0, 'carb', false),
    (i5_id, 'Zeytinyağı', 100.0, 'fat', false);

    -- 3. Insert Macros
    INSERT INTO public.ingredient_macros (ingredient_id, per100_kcal, per100_p, per100_c, per100_f) VALUES
    (i1_id, 110, 23, 0, 1),
    (i2_id, 250, 26, 0, 15),
    (i3_id, 110, 23, 0, 1),
    (i4_id, 130, 2.7, 28, 0.3),
    (i5_id, 884, 0, 0, 100);

    -- 4. Insert Meals
    INSERT INTO public.meals (id, name, meal_type, goal_tag, meal_class, protein_source, prep_minutes, difficulty, tags) VALUES
    (m1_id, 'Tavuklu Akşam Tabağı', mt, gt, mc, 'TAVUK', 20, 2, ARRAY['seed','ci']),
    (m2_id, 'Kıymalı Akşam Tabağı', mt, gt, mc, 'DANA', 25, 3, ARRAY['seed','ci']),
    (m3_id, 'Hindili Akşam Tabağı', mt, gt, mc, 'HINDI', 18, 2, ARRAY['seed','ci']);

    -- 5. Insert Meal Items
    INSERT INTO public.meal_items (meal_id, ingredient_id, grams) VALUES
    -- Meal 1 (Chicken)
    (m1_id, i1_id, 150),
    (m1_id, i4_id, 250),
    (m1_id, i5_id, 12),
    -- Meal 2 (Beef)
    (m2_id, i2_id, 120),
    (m2_id, i4_id, 200),
    -- Meal 3 (Turkey)
    (m3_id, i3_id, 160),
    (m3_id, i4_id, 250),
    (m3_id, i5_id, 10);

    -- 6. Insert Alternatives (Cyclic 1->2,3 ; 2->3,1 ; 3->1,2)
    INSERT INTO public.meal_alternatives (meal_id, alt1_meal_id, alt2_meal_id) VALUES
    (m1_id, m2_id, m3_id),
    (m2_id, m3_id, m1_id),
    (m3_id, m1_id, m2_id);

END $$;
