-- 0008_plan_item_rpc.sql
-- Description: RPC function to safely insert plan items with automatic meal_type resolution and ownership verification.

-- Drop function if exists to ensure clean replace with new signature
DROP FUNCTION IF EXISTS public.insert_plan_item(uuid, int, uuid, boolean);

CREATE OR REPLACE FUNCTION public.insert_plan_item(
    p_plan_id uuid,
    p_day_of_week int,
    p_meal_id uuid,
    p_is_consumed boolean DEFAULT false
)
RETURNS SETOF public.plan_items
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_meal_type public.meal_type;
BEGIN
    -- 1. Get meal_type and verify Meal existence
    SELECT meal_type INTO v_meal_type 
    FROM public.meals 
    WHERE id = p_meal_id;

    IF v_meal_type IS NULL THEN
        RAISE EXCEPTION 'Meal not found with ID %', p_meal_id;
    END IF;

    -- 2. Ownership Check: Verify plan belongs to the current user (auth.uid())
    -- plans.user_id must match auth.uid()
    IF NOT EXISTS (
        SELECT 1 FROM public.plans WHERE id = p_plan_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Plan not found or access denied';
    END IF;

    -- 3. Insert into plan_items and return the row
    RETURN QUERY
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
    RETURNING *;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_plan_item(uuid, int, uuid, boolean) TO authenticated;
