-- Foreign Key Indexes
CREATE INDEX idx_meal_items_meal_id ON public.meal_items(meal_id);
CREATE INDEX idx_meal_items_ingredient_id ON public.meal_items(ingredient_id);
CREATE INDEX idx_ingredient_macros_ingredient_id ON public.ingredient_macros(ingredient_id);
CREATE INDEX idx_meal_alternatives_meal_id ON public.meal_alternatives(meal_id);
CREATE INDEX idx_plans_user_id ON public.plans(user_id);
CREATE INDEX idx_plan_items_plan_id ON public.plan_items(plan_id);

-- Search Indexes
CREATE INDEX idx_meals_meal_type_goal ON public.meals(meal_type, goal_tag);
CREATE INDEX idx_meals_meal_class ON public.meals(meal_class);
CREATE INDEX idx_ingredients_name ON public.ingredients(name);
