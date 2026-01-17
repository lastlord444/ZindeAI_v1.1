
import { query, closeDb } from "./db.ts";

async function validatePlans() {
    console.log("Starting Plan Validation...");

    try {
        // Fetch plans with items order by day
        const plans = await query<{ id: string, user_id: string, name: string }>(`
            SELECT id, user_id, name FROM public.plans
        `);

        if (plans.length === 0) {
            console.warn("WARNING: No plans found to validate. Skipping plan validation checks (PASSED by default).");
            await closeDb();
            return;
        }

        let errors = 0;

        for (const plan of plans) {
            const items = await query<any>(`
                SELECT 
                    pi.day_of_week, 
                    pi.meal_id, 
                    m.meal_type,
                    m.protein_source,
                    m.name
                FROM public.plan_items pi
                JOIN public.meals m ON pi.meal_id = m.id
                WHERE pi.plan_id = $1
                ORDER BY pi.day_of_week, pi.meal_id
            `, [plan.id]);

            // 1. Weekly Max 2 Repetitions Check
            const mealCounts = new Map<string, number>();
            for (const item of items) {
                const count = (mealCounts.get(item.meal_id) || 0) + 1;
                mealCounts.set(item.meal_id, count);
                if (count > 2) {
                    console.error(`[Plan ${plan.id}] FAIL: Meal '${item.name}' appears more than twice in the week (${count}).`);
                    errors++;
                }
            }

            // 2. Consecutive Same Meal Check
            for (let i = 0; i < items.length - 1; i++) {
                if (items[i].meal_id === items[i + 1].meal_id) {
                    console.error(`[Plan ${plan.id}] FAIL: Consecutive meal repetition detected for '${items[i].name}' (Day ${items[i].day_of_week}/${items[i + 1].day_of_week}).`);
                    errors++;
                }
            }

            // 3. Same Day Protein Source Check
            const days = new Map<number, Set<string>>();
            for (const item of items) {
                if (!item.protein_source) continue;

                if (!days.has(item.day_of_week)) {
                    days.set(item.day_of_week, new Set());
                }
                const dayProteins = days.get(item.day_of_week)!;
                if (dayProteins.has(item.protein_source)) {
                    console.error(`[Plan ${plan.id}] FAIL: Day ${item.day_of_week} repeats protein source '${item.protein_source}'.`);
                    errors++;
                }
                dayProteins.add(item.protein_source);
            }
        }

        if (errors > 0) {
            console.error(`\nPlan Validation FAILED with ${errors} errors.`);
            Deno.exit(1);
        } else {
            console.log("\nPlan Validation PASSED.");
        }

    } catch (e) {
        console.error("Database Error:", e);
        Deno.exit(1);
    } finally {
        await closeDb();
    }
}

if (import.meta.main) {
    validatePlans();
}
