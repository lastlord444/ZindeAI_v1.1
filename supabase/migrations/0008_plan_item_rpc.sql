-- 0008_plan_item_rpc.sql-- Description: RPC function to safely insert plan items with automatic meal_type resolution and ownership verification.

-- SECURITY DEFINER allows the function to run with the privileges of the creator (usually postgres/admin),
-- ensuring we can look up meal_type and insert correctly, assuming robust internal checks.
CREATE OR REPLACE FUNCTION public.insert_plan_item(
    p_plan_id uuid,
    p_day_of_week int,
    p_meal_id uuid,
    p_is_consumed boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Secure search path
AS $$
DECLARE
    v_user_id uuid;
    v_meal_type public.meal_type;
    v_new_item_id uuid;
BEGIN
    -- 1. Ownership Check: Verify plan belongs to the current user
    SELECT user_id INTO v_user_id
    FROM public.plans
    WHERE id = p_plan_id;

    IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access Denied: You do not own this plan or it does not exist.';
    END IF;

    -- 2. Fetch Meal Type from Meals table
    SELECT meal_type INTO v_meal_type
    FROM public.meals
    WHERE id = p_meal_id;

    IF v_meal_type IS NULL THEN
        RAISE EXCEPTION 'Invalid Meal: Meal ID % not found.', p_meal_id;
    END IF;

    -- 3. Insert Plan Item (Auto-populating meal_type for trigger enforcement)
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
        v_meal_type, -- Resolved type
        p_is_consumed
    )
    RETURNING id INTO v_new_item_id;

    RETURN v_new_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_plan_item(uuid, int, uuid, boolean) TO authenticated;

