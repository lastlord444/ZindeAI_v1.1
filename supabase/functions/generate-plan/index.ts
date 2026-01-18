import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Note: Static imports are removed to prevent boot-time crashes if engine code is incompatible.
// using dynamic imports inside the handler.

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Dynamic imports for improved reliability during boot
        const { PlanService } = await import("../_shared/engine/services/planService.ts");
        const { MealPicker } = await import("../_shared/engine/services/mealPicker.ts");

        // Import AJV dependencies dynamically
        const Ajv = (await import("https://esm.sh/ajv@8.12.0")).default;
        const addFormats = (await import("https://esm.sh/ajv-formats@2.1.1")).default;

        // Import Supabase Client
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.38.4");

        // Load Schema
        const { REQUEST_SCHEMA } = await import("./request_schema.ts");
        const requestSchema = REQUEST_SCHEMA;

        let requestJson;
        try {
            requestJson = await req.json();
        } catch (e) {
            return new Response(
                JSON.stringify({ error: "BAD_JSON", message: "Invalid JSON body" }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Validate
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        const validate = ajv.compile(requestSchema);
        const valid = validate(requestJson);

        if (!valid) {
            return new Response(
                JSON.stringify({
                    error: "INVALID_REQUEST",
                    message: "Request contract validation failed",
                    details: validate.errors?.map(err => ({
                        path: err.instancePath,
                        message: err.message
                    }))
                }),
                { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { user_id, week_start, goal_tag } = requestJson;

        // Initialize Supabase Client
        // Uses the authorization header from the request so RLS policies apply
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const authHeader = req.headers.get('Authorization');

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: { Authorization: authHeader! },
            },
        });

        // Query meal_totals view
        const { data: mealsData, error: dbError } = await supabase
            .from('meal_totals')
            .select('*');

        if (dbError) {
            throw new Error(`DB_QUERY_ERROR: ${dbError.message}`);
        }

        if (!mealsData || mealsData.length === 0) {
            throw new Error("DB_EMPTY_ERROR: No meals found in database. Please ensure the database is seeded.");
        }

        // Map DB result to Meal interface
        const meals = mealsData.map((m: any) => ({
            id: m.meal_id,
            meal_type: m.meal_type,
            // Mapping goal_tag to tags array to satisfy filter logic. 
            // Only 'goal_tag' is available in the view currently.
            tags: [m.goal_tag],
            kcal: Number(m.total_kcal),
            p: Number(m.total_protein),
            c: Number(m.total_carbs),
            f: Number(m.total_fat),
            price: Number(m.total_cost_try)
        }));

        const picker = new MealPicker(meals);
        const service = new PlanService(picker);

        const generatedPlan = service.generateWeek({
            userId: user_id,
            weekStart: week_start,
            goal: goal_tag
        });

        return new Response(
            JSON.stringify(generatedPlan),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error: any) {
        const isDev = Deno.env.get('ENVIRONMENT') === 'development' || Deno.env.get('SUPABASE_URL')?.includes('localhost');

        const errorResponse: any = {
            error: "RUNTIME_ERROR",
            message: String(error?.message)
        };

        if (isDev) {
            errorResponse.stack = String(error?.stack);
        }

        return new Response(
            JSON.stringify(errorResponse),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            },
        )
    }
})
