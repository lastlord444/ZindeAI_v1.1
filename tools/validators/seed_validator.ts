
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
const PRICE_HIGH_THRESHOLD = 50.0;

async function validateSeeds() {
    console.log("Starting Seed Validation...");

    try {
        const meals = await query<MealData>(`
            WITH meal_macros AS (
                SELECT 
                    m.id,
                    m.name,
                    m.meal_type,
                    m.meal_class,
                    m.goal_tag,
                    m.protein_source,
                    COALESCE(SUM(mi.grams * i.price_per100_try / 100), 0) as price,
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
            console.error("FAIL: No meals found in database. Seed data missing.");
            Deno.exit(1);
        }

        const mealMap = new Map(meals.map(m => [m.id, m]));
        let errors = 0;

        for (const meal of meals) {
            // Check for missing strict data
            if (meal.kcal === 0 && meal.id) { // explicit check, though 0 might be valid for water, unlikely for meals
                // Warning or Fail?
            }

            // Alternatives Existence
            if (!meal.alt1_id || !meal.alt2_id) {
                console.error(`FAIL validators: rule 'alternatives_exist' violated for record '${meal.name}' (ID: ${meal.id}). Missing alt1 or alt2.`);
                errors++;
                continue;
            }

            const alt1 = mealMap.get(meal.alt1_id);
            const alt2 = mealMap.get(meal.alt2_id);

            if (!alt1 || !alt2) {
                console.error(`FAIL validators: rule 'alternatives_valid' violated for record '${meal.name}'. Referenced alternatives not found.`);
                errors++;
                continue;
            }

            // Kcal Delta
            const diff1 = Math.abs(meal.kcal - alt1.kcal);
            const limit1 = meal.kcal * TOLERANCE_KCAL_PERCENT;
            if (diff1 > limit1) {
                console.error(`FAIL validators: rule 'kcal_tolerance' violated for record '${meal.name}' vs '${alt1.name}'. Diff: ${diff1.toFixed(1)}, Max: ${limit1.toFixed(1)}`);
                errors++;
            }

            // Protein Source Diversity
            if (meal.protein_source && alt1.protein_source && meal.protein_source === alt1.protein_source) {
                console.error(`FAIL validators: rule 'protein_source_diversity' violated for record '${meal.name}'. Alt1 has same source: ${meal.protein_source}`);
                errors++;
            }
        }

        if (errors > 0) {
            console.error(`\nValidation FAILED with ${errors} errors.`);
            Deno.exit(1);
        } else {
            console.log("\nSeed Validation PASSED.");
        }

    } catch (e) {
        console.error("Validator Exception:", e);
        Deno.exit(1);
    } finally {
        await closeDb();
    }
}

if (import.meta.main) {
    validateSeeds();
}
