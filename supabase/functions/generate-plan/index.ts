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
                    details: validate.errors?.map((err: any) => ({
                        path: err.instancePath,
                        message: err.message
                    }))
                }),
                { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Generate Full 7-Day Mock Plan (Strict Schema Compliant)
        const daysCount = 7;
        const mealTypes = ["breakfast", "snack1", "lunch", "snack2", "dinner", "snack3"];
        // Helper to formatting date YYYY-MM-DD
        const getShiftedDate = (start: string, offset: number) => {
            const d = new Date(start);
            d.setDate(d.getDate() + offset);
            return d.toISOString().split('T')[0];
        };

        const days = [];

        for (let d = 0; d < daysCount; d++) {
            const currentMeals = [];
            for (const type of mealTypes) {
                currentMeals.push({
                    meal_id: `00000000-0000-0000-0000-${String(d + 1).padStart(12, '0')}`, // Mock UUID
                    meal_type: type,
                    kcal: 300 + (d * 10),
                    p: 20,
                    c: 40,
                    f: 10,
                    estimated_cost_try: 50,
                    alt1_meal_id: `11111111-0000-0000-0000-${String(d + 1).padStart(12, '0')}`,
                    alt2_meal_id: `22222222-0000-0000-0000-${String(d + 1).padStart(12, '0')}`
                });
            }
            days.push({
                date: getShiftedDate(requestJson.week_start, d),
                meals: currentMeals
            });
        }

        const mockPlan = {
            plan_id: "99999999-9999-9999-9999-999999999999",
            week_start: requestJson.week_start,
            days: days
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
