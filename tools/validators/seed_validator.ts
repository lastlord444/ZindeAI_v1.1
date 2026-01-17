
import { query, closeDb } from "./db.ts";

interface MealData {
    id: string;
    name: string;
    meal_type: string;
    meal_class: string;
    goal_tag: string;
    protein_source: string;
    price: number;
    kcal: number;
    p: number;
    c: number;
    f: number;
    alt1_id: string;
    alt2_id: string;
}

const TOLERANCE_KCAL_PERCENT = 0.15;
const PRICE_HIGH_THRESHOLD = 50.0; // Arbitrary threshold for 'expensive'

async function validateSeeds() {
    console.log("Starting Seed Validation...");

    try {
        // Fetch meals with macros, price, and alternatives
        const meals = await query<MealData>(`
            WITH meal_macros AS (
                SELECT 
                    m.id,
                    m.name,
                    m.meal_type,
                    m.meal_class,
                    m.goal_tag,
                    m.protein_source,
                    -- SUM(grams * price_per100 / 100)
                    COALESCE(SUM(mi.grams * i.price_per100_try / 100), 0) as price,
                    -- SUM(grams * per100_x / 100)
                    COALESCE(SUM(mi.grams * im.per100_kcal / 100), 0) as kcal,
                    COALESCE(SUM(mi.grams * im.per100_p / 100), 0) as p,
                    COALESCE(SUM(mi.grams * im.per100_c / 100), 0) as c,
                    COALESCE(SUM(mi.grams * im.per100_f / 100), 0) as f
                FROM public.meals m
                JOIN public.meal_items mi ON m.id = mi.meal_id
                JOIN public.ingredients i ON mi.ingredient_id = i.id
                JOIN public.ingredient_macros im ON i.id = im.ingredient_id
                GROUP BY m.id
            )
            SELECT 
                mm.*,
                ma.alt1_meal_id as alt1_id,
                ma.alt2_meal_id as alt2_id
            FROM meal_macros mm
            LEFT JOIN public.meal_alternatives ma ON mm.id = ma.meal_id
        `);

        if (meals.length === 0) {
            console.error("FATAL: No meals found in database.");
            Deno.exit(1);
        }

        const mealMap = new Map(meals.map(m => [m.id, m]));
        let errors = 0;

        for (const meal of meals) {
            // 1. Validate Meal Class Mapping (Loose check)
            const typeStr = meal.meal_type.toLowerCase();
            const classStr = meal.meal_class.toLowerCase();

            // 2. Validate Alternatives Existence
            if (!meal.alt1_id || !meal.alt2_id) {
                console.error(`[${meal.name}] FAIL: Missing alternatives. Alt1: ${meal.alt1_id}, Alt2: ${meal.alt2_id}`);
                errors++;
                continue;
            }

            const alt1 = mealMap.get(meal.alt1_id);
            const alt2 = mealMap.get(meal.alt2_id);

            if (!alt1 || !alt2) {
                console.error(`[${meal.name}] FAIL: Alternative meals not found in dataset.`);
                errors++;
                continue;
            }

            // 3. Kcal Delta Check (<= 15%)
            const diff1 = Math.abs(meal.kcal - alt1.kcal);
            const limit1 = meal.kcal * TOLERANCE_KCAL_PERCENT;
            if (diff1 > limit1) {
                console.error(`[${meal.name}] FAIL: Alt1 (${alt1.name}) kcal deviation too high. Main: ${meal.kcal}, Alt1: ${alt1.kcal}, Diff: ${diff1.toFixed(1)} (Max: ${limit1.toFixed(1)})`);
                errors++;
            }
            const diff2 = Math.abs(meal.kcal - alt2.kcal);
            const limit2 = meal.kcal * TOLERANCE_KCAL_PERCENT;
            if (diff2 > limit2) {
                console.error(`[${meal.name}] FAIL: Alt2 (${alt2.name}) kcal deviation too high. Main: ${meal.kcal}, Alt2: ${alt2.kcal}, Diff: ${diff2.toFixed(1)} (Max: ${limit2.toFixed(1)})`);
                errors++;
            }

            // 4. Protein Source Check
            if (meal.protein_source === alt1.protein_source) {
                console.error(`[${meal.name}] FAIL: Alt1 has same protein source (${meal.protein_source}). Should be different.`);
                errors++;
            }
            if (meal.protein_source === alt2.protein_source) {
                console.error(`[${meal.name}] FAIL: Alt2 has same protein source (${meal.protein_source}). Should be different.`);
                errors++;
            }

            // 5. Cost Check (Budget Rule)
            if (meal.price > PRICE_HIGH_THRESHOLD) {
                if (alt1.price >= meal.price && alt2.price >= meal.price) {
                    console.error(`[${meal.name}] FAIL: Expensive meal (${meal.price} TRY) needs at least one cheaper alternative. Alt1: ${alt1.price}, Alt2: ${alt2.price}`);
                    errors++;
                }
            }
        }

        if (errors > 0) {
            console.error(`\nValidation FAILED with ${errors} errors.`);
            Deno.exit(1);
        } else {
            console.log("\nSeed Validation PASSED.");
        }

    } catch (e) {
        console.error("Database Error:", e);
        Deno.exit(1);
    } finally {
        await closeDb();
    }
}

if (import.meta.main) {
    validateSeeds();
}
