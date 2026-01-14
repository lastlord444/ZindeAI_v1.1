-- View: meal_totals
-- Calculates total macros and cost for each meal
-- STRICT: INNER JOINs only. If an ingredient is missing macros, the meal is excluded.
-- NO COALESCE: Null values will not be treated as 0, they will result in exclusion or nulls (which strict join handles by ensuring existence).

CREATE OR REPLACE VIEW public.meal_totals AS
SELECT 
    m.id AS meal_id,
    m.name,
    m.meal_type,
    m.goal_tag,
    m.meal_class,
    m.protein_source,
    SUM(im.per100_kcal * (mi.grams / 100.0))::NUMERIC(10,2) AS total_kcal,
    SUM(im.per100_p * (mi.grams / 100.0))::NUMERIC(10,2) AS total_protein,
    SUM(im.per100_c * (mi.grams / 100.0))::NUMERIC(10,2) AS total_carbs,
    SUM(im.per100_f * (mi.grams / 100.0))::NUMERIC(10,2) AS total_fat,
    SUM(i.price_per100_try * (mi.grams / 100.0))::NUMERIC(10,2) AS total_cost_try
FROM public.meals m
JOIN public.meal_items mi ON m.id = mi.meal_id
JOIN public.ingredients i ON mi.ingredient_id = i.id
JOIN public.ingredient_macros im ON i.id = im.ingredient_id
GROUP BY m.id, m.name, m.meal_type, m.goal_tag, m.meal_class, m.protein_source;
