-- PROOF A: Fish Trigger Fail
-- Expectation: Trigger raises exception "Fish meals allowed only in ogle or aksam"
BEGIN;
  -- Try to insert a breakfast with fish
  INSERT INTO public.meals (meal_name, meal_type, goal_tag, fish_flag)
  VALUES ('Somonlu Kahvaltı', 'kahvalti', 'cut', true);
ROLLBACK;

-- PROOF B: Strict View (No partial data)
-- Expectation: Zero rows returned for this specific meal because it has no items/macros
BEGIN;
  -- Insert a meal without items
  INSERT INTO public.meals (id, meal_name, meal_type, goal_tag, fish_flag)
  VALUES ('00000000-0000-0000-0000-000000000001', 'Empty Meal', 'ogle', 'bulk', false);

  -- Query the view
  SELECT * FROM public.meal_totals WHERE meal_id = '00000000-0000-0000-0000-000000000001';
ROLLBACK;

-- PROOF C: RLS Constraints
-- Expectation: 403 Forbidden or Policy Violation when running as authenticated user
-- (Simulation via pg_role setting if user has permissions, or documentation of policy)
-- Policy "Auth read meals": FOR SELECT TO authenticated USING (true);
-- NO INSERT POLICY defined for 'authenticated' role on 'meals'.
-- Therefore:
-- SET ROLE authenticated;
-- INSERT INTO public.meals ... -> FAIL.
