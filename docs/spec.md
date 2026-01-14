# ZindeAI v1.1 System Specification

> **AUTHORITY**: This document is the Single Source of Truth. Code must obey this spec.

## 1. Database Schema
**Enums**:
- `meal_type`: `kahvalti`, `ara_ogun_1`, `ogle`, `ara_ogun_2`, `aksam`, `gece_atistirmasi`

**Tables**:
1. **profiles**: `user_id` (PK, Auth), `gender`, `age`, `height_cm`, `weight_kg`, `activity_level`, `goal_tag`, `allergies` (text[]).
2. **ingredients**: `id`, `name_tr`, `aliases` (text[]), `category`, `cost_tier` (int), `is_breakfast_only`, `is_main_only`.
3. **ingredient_macros**: `ingredient_id` (PK/FK), `per100_kcal`, `per100_p`, `per100_c`, `per100_f` (All >= 0).
4. **meals**: `id`, `meal_name`, `meal_type`, `goal_tag`, `protein_source`, `fish_flag` (bool), `prep_minutes` (>0), `difficulty`, `tags` (text[]).
5. **meal_items**: `meal_id` (FK), `ingredient_id` (FK), `grams` (>0) [Strict: NO DEFAULT].
6. **meal_alternatives**: `meal_id` (PK), `alt1_meal_id`, `alt2_meal_id`.
7. **plans**: `id`, `user_id` (FK), `week_start` (date), `goal_tag`, `target_kcal`, `target_p`, `target_c`, `target_f`, `degraded` (bool).
8. **plan_items**: `plan_id` (FK), `day` (1-7), `meal_type` (Enum), `meal_id` (FK), `locked` (bool), `eaten` (bool).

## 2. Constraints & Triggers
- **Plan Consistency**: `plan_items.meal_type` MUST match `meals.meal_type` (Trigger).
- **Fish Flag**: If `fish_flag=true`, `meal_type` MUST be `ogle` or `aksam` (Trigger).
- **Alternatives**: `alt1 != alt2`, `alt1 != self`, `type` match (Trigger).

## 3. Strict Views
- `meal_totals` (or `meals_with_macros`): Strict `INNER JOIN`. No `COALESCE`.

## 4. Security
- Owner-Only: `profiles`, `plans`, `plan_items`.
- Read-Only: Content tables.
