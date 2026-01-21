import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const Ajv = (await import("https://esm.sh/ajv@8.12.0")).default;
        const addFormats = (await import("https://esm.sh/ajv-formats@2.1.1")).default;
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.38.4");
        const { REQUEST_SCHEMA } = await import("./request_schema.ts");

        // Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        let requestJson;
        try {
            requestJson = await req.json();
        } catch (e) {
            return new Response(
                JSON.stringify({ error: "BAD_JSON", message: "Invalid JSON body" }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Validate Schema
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        const validate = ajv.compile(REQUEST_SCHEMA);
        if (!validate(requestJson)) {
            return new Response(
                JSON.stringify({
                    error: "INVALID_REQUEST",
                    message: "Validation failed",
                    details: validate.errors
                }),
                { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // --- PR-2 Update: Tariff Mode Logic ---
        const tariffMode = requestJson.tariff_mode || 'normal'; // Default normal
        const goalTag = requestJson.goal_tag;
        const daysCount = 7;
        const mealTypes = ["breakfast", "snack1", "lunch", "snack2", "dinner", "snack3"];

        const dbMealTypes: Record<string, string> = {
            "breakfast": "kahvalti",
            "snack1": "ara_ogun_1",
            "lunch": "ogle",
            "snack2": "ara_ogun_2",
            "dinner": "aksam",
            "snack3": "gece_atistirmasi"
        };


        const selectMeal = async (mType: string, excludedIds: string[] = []) => {
            const dbType = dbMealTypes[mType];
            // Query meals_with_cost_v view
            // Filter by: goal_tag, meal_type, price_tier (tariffMode)
            let query = supabase
                .from('meals_with_cost_v')
                .select('meal_id, meal_cost_try, price_tier')
                .eq('goal_tag', goalTag)
                .eq('meal_type', dbType)
                .eq('price_tier', tariffMode);

            if (excludedIds.length > 0) {
                query = query.not('meal_id', 'in', `(${excludedIds.join(',')})`);
            }

            // Random MVP selection: fetch limit 10, pick one.
            const { data, error } = await query.limit(10);

            if (error) throw error;
            if (!data || data.length === 0) {
                // Fallback or Fail?
                // Fail explicit is better for debugging based on spec.
                throw new Error(`Insufficient meals for ${goalTag}/${dbType}/${tariffMode}`);
            }

            return data[Math.floor(Math.random() * data.length)];
        };


        const days = [];
        const getShiftedDate = (start: string, offset: number) => {
            const d = new Date(start);
            d.setDate(d.getDate() + offset);
            return d.toISOString().split('T')[0];
        };

        for (let d = 0; d < daysCount; d++) {
            const currentMeals = [];
            for (const type of mealTypes) {
                // Select Main Meal
                const mainMeal = await selectMeal(type);
                // Select Alt1 (exclude main)
                const alt1 = await selectMeal(type, [mainMeal.meal_id]);
                // Select Alt2 (exclude main + alt1)
                const alt2 = await selectMeal(type, [mainMeal.meal_id, alt1.meal_id]);

                // Fetch details (macro/kcal) from meal_totals view for these IDs
                // Using .in() is more efficient than loop
                const ids = [mainMeal.meal_id, alt1.meal_id, alt2.meal_id];
                const { data: details } = await supabase
                    .from('meal_totals')
                    .select('*')
                    .in('meal_id', ids);

                const findDetail = (id: string) => details?.find((x: any) => x.meal_id === id) || {};
                const m = findDetail(mainMeal.meal_id);
                // Note: Contract requires item details from 'm', plus alt IDs.
                // We don't embed full alt objects, just IDs.

                currentMeals.push({
                    meal_id: mainMeal.meal_id,
                    meal_type: type,
                    kcal: Number(m.total_kcal || 0),
                    p: Number(m.total_protein || 0),
                    c: Number(m.total_carbs || 0),
                    f: Number(m.total_fat || 0),
                    estimated_cost_try: Number(m.total_cost_try || 0),
                    alt1_meal_id: alt1.meal_id,
                    alt2_meal_id: alt2.meal_id,
                    flags: [mainMeal.price_tier] // Expose tier for UI badge
                });
            }
            days.push({
                date: getShiftedDate(requestJson.week_start, d),
                meals: currentMeals
            });
        }

        const plan = {
            plan_id: crypto.randomUUID(),
            week_start: requestJson.week_start,
            days: days
        };

        return new Response(
            JSON.stringify(plan),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: "RUNTIME_ERROR", message: String(error?.message), stack: String(error?.stack) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
