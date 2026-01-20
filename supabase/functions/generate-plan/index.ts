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

        // Generate Full 7-Day Mock Plan (Contract Compliant)
        const days = 7;
        const mealTypes = ["kahvalti", "ara1", "ogle", "ara2", "aksam", "ara3"];
        const items = [];

        for (let d = 1; d <= days; d++) {
            for (const type of mealTypes) {
                items.push({
                    day_of_week: d,
                    meal_type: type,
                    meal_id: `meal-${d}-${type}`,
                    name: `Mock Meal ${type} Day ${d}`,
                    calories: 300 + (d * 10),
                    alt1_meal_id: `alt1-${d}-${type}`,
                    alt2_meal_id: `alt2-${d}-${type}`,
                    is_consumed: false
                });
            }
        }

        const mockPlan = {
            id: "mock-plan-full-week",
            user_id: requestJson.user_id,
            week_start: requestJson.week_start,
            items: items,
            meta: {
                generated_at: new Date().toISOString(),
                note: "Full 7x6 mock with alternates"
            }
        };

        return new Response(
            JSON.stringify(mockPlan),
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
