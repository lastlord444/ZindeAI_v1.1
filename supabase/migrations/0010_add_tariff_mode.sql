-- Profile tablosuna tariff_mode ekle
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tariff_mode TEXT NOT NULL DEFAULT 'normal'
CHECK (tariff_mode IN ('ekonomik', 'normal'));

COMMENT ON COLUMN public.profiles.tariff_mode IS 
'Kullanıcının seçtiği tarife modu: ekonomik veya normal';

-- Meal Cost View
CREATE OR REPLACE VIEW public.meals_with_cost_v AS
WITH meal_costs AS (
  SELECT 
    m.id AS meal_id,
    m.meal_type,
    m.goal_tag,
    COALESCE(
      SUM(mi.grams * i.price_per100_try / 100.0), 
      0
    ) AS meal_cost_try
  FROM public.meals m
  LEFT JOIN public.meal_items mi ON m.id = mi.meal_id
  LEFT JOIN public.ingredients i ON mi.ingredient_id = i.id
  GROUP BY m.id, m.meal_type, m.goal_tag
),
ranked_costs AS (
  SELECT 
    *,
    NTILE(2) OVER (
      PARTITION BY meal_type, goal_tag 
      ORDER BY meal_cost_try ASC
    ) AS cost_band
  FROM meal_costs
)
SELECT 
  meal_id,
  meal_type,
  goal_tag,
  meal_cost_try,
  CASE 
    WHEN cost_band = 1 THEN 'ekonomik'
    ELSE 'normal'
  END AS price_tier
FROM ranked_costs;

COMMENT ON VIEW public.meals_with_cost_v IS 
'Meal maliyetleri ve price_tier (ekonomik/normal) dağılımı';
