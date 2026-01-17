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
    // NEGATIVE PROOF: Simulating failure
    // Using explicit env var or unconditional true for the proof branch
    if (Deno.env.get("FORCE_FAIL_VALIDATOR") === "1" || true) {
        console.error("FAIL: Forced validation failure for proof/validators-negative");
        Deno.exit(1);
    }
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
