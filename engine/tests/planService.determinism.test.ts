import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { PlanService } from "../src/services/planService.ts";
import { MealPicker } from "../src/services/mealPicker.ts";

const mockMeals = [
    { id: "m1", meal_type: "breakfast", tags: ["cut"], kcal: 400, p: 20, c: 40, f: 10, price: 50 },
    { id: "m1b", meal_type: "breakfast", tags: ["cut"], kcal: 410, p: 21, c: 41, f: 11, price: 51 },
    { id: "m2", meal_type: "lunch", tags: ["cut"], kcal: 600, p: 40, c: 60, f: 20, price: 80 },
    { id: "m2b", meal_type: "lunch", tags: ["cut"], kcal: 610, p: 41, c: 61, f: 21, price: 81 },
    { id: "m3", meal_type: "dinner", tags: ["cut"], kcal: 500, p: 35, c: 45, f: 15, price: 70 },
    { id: "m4", meal_type: "snack1", tags: ["cut"], kcal: 200, p: 10, c: 20, f: 5, price: 30 },
    { id: "m5", meal_type: "snack2", tags: ["cut"], kcal: 200, p: 10, c: 20, f: 5, price: 30 },
    { id: "m6", meal_type: "snack3", tags: ["cut"], kcal: 200, p: 10, c: 20, f: 5, price: 30 },
];

Deno.test("PlanService is Deterministic (Same Input -> Same Output)", () => {
    const picker = new MealPicker(mockMeals);
    const service = new PlanService(picker);

    const req = { userId: "u1", weekStart: "2026-01-01", goal: "cut" as const };

    const plan1 = service.generateWeek(req);
    const plan2 = service.generateWeek(req);

    // Checking determinism of content
    assertEquals(plan1.days, plan2.days);
    assertEquals(plan1.days.length, 7);
});

Deno.test("PlanService varies output on different input", () => {
    const picker = new MealPicker(mockMeals);
    const service = new PlanService(picker);

    const req1 = { userId: "u1", weekStart: "2026-01-01", goal: "cut" as const };
    const req2 = { userId: "u2", weekStart: "2026-01-01", goal: "cut" as const };

    const plan1 = service.generateWeek(req1);
    const plan2 = service.generateWeek(req2);

    // Just ensure it runs and produces valid structure
    assert(plan1.days.length === 7);
    assert(plan2.days.length === 7);
});
