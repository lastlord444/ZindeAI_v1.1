-- 0007_plan_slot_enforcement.sql
-- Description: Enforce that a plan item matches the intended meal type.
-- Adds 'meal_type' column to plan_items (NULLABLE) to define the slot type.

-- 1. Add meal_type column to plan_items (NULLABLE by default)
ALTER TABLE public.plan_items 
ADD COLUMN IF NOT EXISTS meal_type public.meal_type;

-- 2. Trigger Function: Enforce Consistency
CREATE OR REPLACE FUNCTION check_plan_slot_consistency()
RETURNS TRIGGER AS $$
DECLARE
    actual_type public.meal_type;
BEGIN
    -- If the slot type is defined (NOT NULL), ensure the meal matches it.
    -- If NEW.meal_type is NULL, NO enforcement is performed (RETURN NEW).
    IF NEW.meal_type IS NOT NULL THEN
        SELECT meal_type INTO actual_type FROM public.meals WHERE id = NEW.meal_id;
        
        -- Check mismatch
        IF actual_type IS DISTINCT FROM NEW.meal_type THEN
            RAISE EXCEPTION 'Plan Slot Mismatch: Slot expected %, but meal % is %', 
                NEW.meal_type, NEW.meal_id, actual_type;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach Trigger
DROP TRIGGER IF EXISTS trg_plan_slot_check ON public.plan_items;
CREATE TRIGGER trg_plan_slot_check
BEFORE INSERT OR UPDATE ON public.plan_items
FOR EACH ROW EXECUTE FUNCTION check_plan_slot_consistency();
