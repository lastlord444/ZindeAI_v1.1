-- 0009_fix_insert_plan_item_rpc.sql
-- Description: Fix insert_plan_item RPC with correct Security Definer and ownership checks

DROP FUNCTION IF EXISTS public.insert_plan_item(uuid, int, uuid, boolean);

CREATE OR REPLACE FUNCTION public.insert_plan_item(
    p_plan_id uuid,
    p_day_of_week int,
    p_meal_id uuid,
    p_is_consumed boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_meal_type public.meal_type;
    v_new_item_id uuid;
BEGIN
    -- 1. Ownership Check
    SELECT user_id INTO v_user_id
    FROM public.plans
    WHERE id = p_plan_id;

    IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Plan bulunamadı veya erişim reddedildi';
    END IF;

    -- 2. Meal Type Lookup
    SELECT meal_type INTO v_meal_type
    FROM public.meals
    WHERE id = p_meal_id;

    IF v_meal_type IS NULL THEN
        RAISE EXCEPTION 'Meal bulunamadı: %', p_meal_id;
    END IF;

    -- 3. Insert
    INSERT INTO public.plan_items (
        plan_id,
        day_of_week,
        meal_id,
        meal_type,
        is_consumed
    )
    VALUES (
        p_plan_id,
        p_day_of_week,
        p_meal_id,
        v_meal_type,
        p_is_consumed
    )
    RETURNING id INTO v_new_item_id;

    RETURN v_new_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_plan_item(uuid, int, uuid, boolean) TO authenticated;
