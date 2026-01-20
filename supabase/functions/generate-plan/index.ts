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

        // Minimal Hardcoded JSON Response (Contract Compliant)
        const mockPlan = {
            id: "mock-plan-id",
            user_id: requestJson.user_id,
            week_start: requestJson.week_start,
            items: [
                {
                    day_of_week: 1,
                    meal_type: "kahvalti",
                    meal_id: "meal-1",
                    name: "Minimal Yulaf",
                    calories: 300
                },
                {
                    day_of_week: 1,
                    meal_type: "ogle",
                    meal_id: "meal-2",
                    name: "Minimal Tavuk",
                    calories: 500
                }
            ],
            meta: {
                generated_at: new Date().toISOString()
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
