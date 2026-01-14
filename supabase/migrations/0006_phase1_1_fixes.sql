-- 0006_phase1_1_fixes.sql
-- Description: Align schema with v1.1 Spec (Phase 1.1)
-- Fixes: Ingredients columns, fish_flag, and Critical Plan Enforcement Trigger

-- 1. Fix Ingredients Table
ALTER TABLE public.ingredients 
    RENAME COLUMN name TO name_tr;

ALTER TABLE public.ingredients 
    ADD COLUMN IF NOT EXISTS aliases TEXT[],
    ADD COLUMN IF NOT EXISTS cost_tier INTEGER CHECK (cost_tier BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS is_breakfast_only BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_main_only BOOLEAN DEFAULT false;

-- 2. Fix Meals Table
ALTER TABLE public.meals 
    RENAME COLUMN name TO meal_name;

ALTER TABLE public.meals 
    ADD COLUMN IF NOT EXISTS fish_flag BOOLEAN DEFAULT false;

-- 3. PLAN SLOT ENFORCEMENT TRIGGER (CRITICAL)
-- Rule: When inserting into plan_items, the chosen meal_id's type MUST match plan_items.meal_type
CREATE OR REPLACE FUNCTION check_plan_slot_consistency()
RETURNS TRIGGER AS $$
DECLARE
    actual_type public.meal_type;
BEGIN
    SELECT meal_type INTO actual_type FROM public.meals WHERE id = NEW.meal_id;
    
    IF actual_type IS DISTINCT FROM NEW.meal_type THEN
        RAISE EXCEPTION 'Plan Slot Mismatch: Slot expected %, but meal % is %', NEW.meal_type, NEW.meal_id, actual_type;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plan_slot_check
BEFORE INSERT OR UPDATE ON public.plan_items
FOR EACH ROW EXECUTE FUNCTION check_plan_slot_consistency();

-- 4. Ensure Fish Rule (If not already present in 0002 or 0006)
-- Re-applying strict logic just in case
CREATE OR REPLACE FUNCTION check_fish_constraint_v2()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fish_flag = true AND NEW.meal_type NOT IN ('ogle', 'aksam') THEN
        RAISE EXCEPTION 'Fish meals allowed only in ogle or aksam. Got: %', NEW.meal_type;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fish_flag ON public.meals;
CREATE TRIGGER trg_fish_flag
BEFORE INSERT OR UPDATE ON public.meals
FOR EACH ROW EXECUTE FUNCTION check_fish_constraint_v2();
