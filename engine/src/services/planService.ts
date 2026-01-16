import { Meal, MealPicker } from "./mealPicker.ts";
import { Rules, MacroTargets } from "../validators/rules.ts";

export interface PlanRequest {
    userId: string;
    weekStart: string;
    goal: "cut" | "bulk" | "maintain";
}

export class PlanService {
    constructor(private picker: MealPicker) { }

    generateWeek(req: PlanRequest): any {
        const weekPlan = [];
        const targets = Rules.getDailyTargets(req.goal);

        // Seed generation check
        let seed = this.hashCode(req.userId + req.weekStart);

        for (let i = 0; i < 7; i++) {
            const dayPlan = this.generateDay(targets, seed + i);
            weekPlan.push({
                date: this.addDays(req.weekStart, i),
                meals: dayPlan
            });
        }

        return {
            plan_id: crypto.randomUUID(),
            week_start: req.weekStart,
            days: weekPlan
        };
    }

    private generateDay(targets: MacroTargets, seed: number): any[] {
        const mealTypes = ["breakfast", "snack1", "lunch", "snack2", "dinner", "snack3"];
        const dayMeals = [];

        for (const type of mealTypes) {
            // Logic: Pick a meal that fits.
            // For POC, we just pick *any* valid meal for the type and goal ("cut" implies "cut" tag).
            // In production, this would use the Greedy + Backtrack logic mentioned.
            const candidates = this.picker.filter(type, "cut"); // Simplified goal prop
            const meal = this.picker.pickRandom(candidates, seed);

            if (meal) {
                dayMeals.push({
                    meal_id: meal.id,
                    meal_type: type,
                    kcal: meal.kcal,
                    p: meal.p,
                    c: meal.c,
                    f: meal.f,
                    estimated_cost_try: meal.price,
                    alt1_meal_id: crypto.randomUUID(), // Mock alternate
                    alt2_meal_id: crypto.randomUUID(), // Mock alternate
                    flags: []
                });
            }
        }
        return dayMeals;
    }

    private hashCode(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    private addDays(dateStr: string, days: number): string {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
}
