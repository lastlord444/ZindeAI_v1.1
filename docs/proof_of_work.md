# Proof of Work (Phase 1.1)

## 1. Plan Slot Enforcement (New)
```sql
-- Attempt to put a Breakfast meal into an 'aksam' slot
-- Assume meal 'M_BREAKFAST' has meal_type 'kahvalti'
INSERT INTO public.plan_items (plan_id, day, meal_type, meal_id)
VALUES ('P_ID', 1, 'aksam', 'M_BREAKFAST');

-- EXPECTED ERROR:
-- Plan Slot Mismatch: Slot expected aksam, but meal M_BREAKFAST is kahvalti
```

## 2. Fish Rule Enforcement
```sql
INSERT INTO public.meals (meal_name, meal_type, fish_flag)
VALUES ('Bad Breakfast', 'kahvalti', true);

-- EXPECTED ERROR:
-- Fish meals allowed only in ogle or aksam.
```

## 3. Strict Schema Checks
- `ingredients.name_tr` exists? ✅
- `plan_items` trigger active? ✅
