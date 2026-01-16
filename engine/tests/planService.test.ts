import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { PlanService } from "../src/services/planService.ts";
import { MealPicker } from "../src/services/mealPicker.ts";

const mockMeals = [
    { id: "m1", meal_type: "breakfast", tags: ["cut"], kcal: 400, p: 20, c: 40, f: 10, price: 50 },
    { id: "m2", meal_type: "lunch", tags: ["cut"], kcal: 600, p: 40, c: 60, f: 20, price: 80 },
    { id: "m3", meal_type: "dinner", tags: ["cut"], kcal: 500, p: 35, c: 45, f: 15, price: 70 },
    { id: "m4", meal_type: "snack1", tags: ["cut"], kcal: 200, p: 10, c: 20, f: 5, price: 30 },
    { id: "m5", meal_type: "snack2", tags: ["cut"], kcal: 200, p: 10, c: 20, f: 5, price: 30 },
    { id: "m6", meal_type: "snack3", tags: ["cut"], kcal: 200, p: 10, c: 20, f: 5, price: 30 },
];

Deno.test("PlanService generates 7 days with correct structure", () => {
    const picker = new MealPicker(mockMeals);
    const service = new PlanService(picker);

    const req = {
        userId: "u123",
        weekStart: "2026-01-19",
        goal: "cut" as const
    };

    const plan = service.generateWeek(req);

    assertEquals(plan.days.length, 7);
    assert(plan.days[0].meals.length > 0);
    assertEquals(plan.week_start, "2026-01-19");
});
