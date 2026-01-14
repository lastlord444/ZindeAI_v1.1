-- Ingredients Table
CREATE TABLE public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price_per100_try NUMERIC NOT NULL CHECK (price_per100_try >= 0),
    category TEXT,
    is_fish BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ingredient Macros Table (1:1 with ingredients)
CREATE TABLE public.ingredient_macros (
    ingredient_id UUID PRIMARY KEY REFERENCES public.ingredients(id) ON DELETE CASCADE,
    per100_kcal NUMERIC NOT NULL CHECK (per100_kcal >= 0),
    per100_p NUMERIC NOT NULL CHECK (per100_p >= 0),
    per100_c NUMERIC NOT NULL CHECK (per100_c >= 0),
    per100_f NUMERIC NOT NULL CHECK (per100_f >= 0)
);

-- Meals Table
CREATE TABLE public.meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    meal_type public.meal_type NOT NULL,
    goal_tag public.goal_tag NOT NULL,
    meal_class public.meal_class NOT NULL,
    protein_source TEXT,
    prep_minutes INTEGER CHECK (prep_minutes >= 0),
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Meal Items Table (Ingredients in Meals)
CREATE TABLE public.meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    grams NUMERIC NOT NULL CHECK (grams > 0)
);

-- Meal Alternatives Table
CREATE TABLE public.meal_alternatives (
    meal_id UUID PRIMARY KEY REFERENCES public.meals(id) ON DELETE CASCADE,
    alt1_meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
    alt2_meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
    CONSTRAINT chk_diff_alt1_alt2 CHECK (alt1_meal_id != alt2_meal_id),
    CONSTRAINT chk_diff_meal_alt1 CHECK (meal_id != alt1_meal_id),
    CONSTRAINT chk_diff_meal_alt2 CHECK (meal_id != alt2_meal_id)
);

-- Profiles Table (Users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Plans Table
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Plan Items
CREATE TABLE public.plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE RESTRICT,
    is_consumed BOOLEAN DEFAULT false
);
