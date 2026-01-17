
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { PlanService } from "../src/services/planService.ts";
import { MealPicker } from "../src/services/mealPicker.ts";

Deno.test("PlanService Contract: Guarantee 6 meals per day", () => {
    // Setup empty meal picker - normally this would produce 0 meals
    // But with our new logic, it should use fallbacks to satisfy the contract
    const meals: any[] = [];
    const picker = new MealPicker(meals);
    const service = new PlanService(picker);

    const req = {
        userId: "test-user-contract",
        weekStart: "2026-06-01",
        goal: "cut" as const
    };

    const plan = service.generateWeek(req);

    assertEquals(plan.days.length, 7, "Should have 7 days");

<<<<<<< HEAD
<<<<<<< HEAD
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

=======
>>>>>>> 976dbc9 (fix(engine): guarantee 6 meals per day with deterministic fill fallback)
=======
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

>>>>>>> 8f2f9ce (fix(engine): emit RFC4122 v4 uuid meal_id for fallback fills)
    plan.days.forEach((day: any, i: number) => {
        assertEquals(day.meals.length, 6, `Day ${i} should have exactly 6 meals`);

        // specific check for fallback content
        day.meals.forEach((meal: any) => {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 8f2f9ce (fix(engine): emit RFC4122 v4 uuid meal_id for fallback fills)
            assert(uuidRegex.test(meal.meal_id), `Meal ID ${meal.meal_id} should be valid RFC4122 v4 UUID`);
            if (meal.flags.includes("fallback_used")) {
                assert(meal.kcal === 250 || meal.kcal === 300, "Should have fallback nutritional values");
            }
<<<<<<< HEAD
=======
            assert(meal.meal_id.startsWith("fallback-"), "Should use fallback mechanism if no meals available");
>>>>>>> 976dbc9 (fix(engine): guarantee 6 meals per day with deterministic fill fallback)
=======
>>>>>>> 8f2f9ce (fix(engine): emit RFC4122 v4 uuid meal_id for fallback fills)
            assert(meal.flags.includes("fallback_used") || meal.flags.includes("filled_missing_slot"), "Should flag fallback usage");
        });
    });
});
