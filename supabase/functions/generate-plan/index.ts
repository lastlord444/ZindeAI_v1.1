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

        const tariffMode = requestJson.tariff_mode || 'normal';
        const goalTag = requestJson.goal_tag;
        const daysCount = 7;
        const mealTypes = ["breakfast", "snack1", "lunch", "snack2", "dinner", "snack3"];
        // Helper mapping for DB meal_type
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
            let query = supabase
                .from('meals_with_cost_v')
                .select('meal_id, meal_cost_try, price_tier')
                .eq('goal_tag', goalTag)
                .eq('meal_type', dbType)
                .eq('price_tier', tariffMode);

            if (excludedIds.length > 0) {
                query = query.not('meal_id', 'in', `(${excludedIds.join(',')})`);
            }

            // Random selection via limit (MVP)
            // Ideally we use RPC or improved random, but here we pick first or random?
            // Since we can't easily random sort in view without RPC, we fetch first simple.
            // Or fetch few and pick random in code.
            const { data, error } = await query.limit(10);

            if (error) throw error;
            if (!data || data.length === 0) {
                // Fallback: try finding any meal to avoid crash, or throw?
                // Throwing allows us to see missing data issues.
                throw new Error(`No meals found for ${goalTag}/${dbType}/${tariffMode}`);
            }

            // Pick random
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
                const mainMeal = await selectMeal(type);
                const alt1 = await selectMeal(type, [mainMeal.meal_id]);
                const alt2 = await selectMeal(type, [mainMeal.meal_id, alt1.meal_id]);

                // We need extended details (kcal etc) which might not be in the view?
                // The schema response requires kcal, p, c, f, etc.
                // The view only has cost and tier.
                // We need to fetch details from `meal_totals` view maybe?
                // Or join/fetch.
                // Let's assume we fetch details from `meal_totals` for the selected IDs.

                const { data: details } = await supabase
                    .from('meal_totals')
                    .select('*')
                    .in('meal_id', [mainMeal.meal_id, alt1.meal_id, alt2.meal_id]);

                // Map details back
                const findDetail = (id: string) => details?.find((x: any) => x.meal_id === id) || {};

                const m = findDetail(mainMeal.meal_id);

                currentMeals.push({
                    meal_id: mainMeal.meal_id,
                    meal_type: type,
                    kcal: Number(m.total_kcal || 0),
                    p: Number(m.total_protein || 0),
                    c: Number(m.total_carbs || 0),
                    f: Number(m.total_fat || 0),
                    estimated_cost_try: Number(m.total_cost_try || 0),
                    alt1_meal_id: alt1.meal_id,
                    alt2_meal_id: alt2.meal_id
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
