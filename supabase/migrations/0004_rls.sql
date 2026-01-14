-- Enable RLS on all tables
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_macros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

-- Read-Only Access for Authenticated Users (Content Tables)
CREATE POLICY "Authenticated users can read ingredients" ON public.ingredients
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read ingredient macros" ON public.ingredient_macros
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read meals" ON public.meals
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read meal items" ON public.meal_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read meal alternatives" ON public.meal_alternatives
    FOR SELECT TO authenticated USING (true);

-- Owner-Only Access (User Tables)

-- Profiles: Users can see their own profile
CREATE POLICY "Users can create their own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Plans: Users can CRUD their own plans
CREATE POLICY "Users can create their own plans" ON public.plans
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own plans" ON public.plans
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans" ON public.plans
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans" ON public.plans
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Plan Items: Users can CRUD items in their plans
CREATE POLICY "Users can create items in their plans" ON public.plan_items
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_items.plan_id AND p.user_id = auth.uid())
    );

CREATE POLICY "Users can view items in their plans" ON public.plan_items
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_items.plan_id AND p.user_id = auth.uid())
    );

CREATE POLICY "Users can update items in their plans" ON public.plan_items
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_items.plan_id AND p.user_id = auth.uid())
    );

CREATE POLICY "Users can delete items in their plans" ON public.plan_items
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_items.plan_id AND p.user_id = auth.uid())
    );
