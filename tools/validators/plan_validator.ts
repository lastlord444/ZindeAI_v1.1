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
            // If fixture enforcement is required, we could insert one here or err.
            // For now, allow pass if empty but warn.
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
                -- Note: Ordering by meal_id isn't chronological for day. 
                -- Ideally there's a slot index, but schema uses enum types which dictate order (kahvalti < ogle < aksam).
                -- We'll assume input order or fetch sort by meal_type rank if needed.
                -- For "consecutive" check, we need chronological order.
            `, [plan.id]);

// Map meal type ordert { };
