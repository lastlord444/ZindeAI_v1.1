
import { query, closeDb } from "./db.ts";

async function validatePlans() {
    console.log("Starting Plan Validation...");

    try {
        const plans = await query<{ id: string, user_id: string, name: string }>(`
            SELECT id, user_id, name FROM public.plans
        `);

        if (plans.length === 0) {
            console.warn("WARNING: No plans found to validate. Skipping checks.");
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

            // Weekly Max Repetitions
            const mealCounts = new Map<string, number>();
            for (const item of items) {
                const count = (mealCounts.get(item.meal_id) || 0) + 1;
                mealCounts.set(item.meal_id, count);
                if (count > 2) {
                    console.error(`FAIL validators: rule 'weekly_repetition_limit' violated for Plan '${plan.id}'. Meal '${item.name}' count: ${count}`);
                    errors++;
                }
            }

            // Consecutive Checks
            for (let i = 0; i < items.length - 1; i++) {
                if (items[i].meal_id === items[i + 1].meal_id) {
                    console.error(`FAIL validators: rule 'consecutive_repetition' violated for Plan '${plan.id}'. Meal '${items[i].name}' on Day ${items[i].day_of_week}/${items[i + 1].day_of_week}`);
                    errors++;
                }
            }
        }

        if (errors > 0) {
            console.error(`\nPlan Validation FAILED with ${errors} errors.`);
            Deno.exit(1);
        } else {
            console.log("\nPlan Validation PASSED.");
        }

    } catch (e) {
        console.error("Validator Exception:", e);
        Deno.exit(1);
    } finally {
        await closeDb();
    }
}

if (import.meta.main) {
    validatePlans();
}
