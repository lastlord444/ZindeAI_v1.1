
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

    plan.days.forEach((day: any, i: number) => {
        assertEquals(day.meals.length, 6, `Day ${i} should have exactly 6 meals`);

        // specific check for fallback content
        day.meals.forEach((meal: any) => {
            assert(meal.meal_id.startsWith("fallback-"), "Should use fallback mechanism if no meals available");
            assert(meal.flags.includes("fallback_used") || meal.flags.includes("filled_missing_slot"), "Should flag fallback usage");
        });
    });
});
