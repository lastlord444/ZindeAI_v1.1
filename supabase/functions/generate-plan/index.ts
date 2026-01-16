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

        // Import AJV dependencies dynamically or assume they are available via import map if configured, 
        // but for now we use direct URL imports compatible with Edge Runtime
        const Ajv = (await import("https://esm.sh/ajv@8.12.0")).default;
        const addFormats = (await import("https://esm.sh/ajv-formats@2.1.1")).default;

        // Load Schema (embedded via file system)
        // In Edge Runtime, we can read local files if they are included in the bundle/deployment
        // We vendored it to ./schema/generate_plan.request.schema.json
        let requestSchema;
        try {
            const schemaText = await Deno.readTextFile(new URL("./schema/generate_plan.request.schema.json", import.meta.url));
            requestSchema = JSON.parse(schemaText);
        } catch (e) {
            console.error("Schema load error:", e);
            throw new Error("Failed to load request validation schema");
        }

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

        // In a real scenario, fetch meals from DB here
        // const { data: meals } = await supabase.from('meals').select('*');
        // For now, mocking filters to ensure it runs
        const mockMeals = [
            { id: "1be5c3fd-e9da-4127-8977-94a50d28362d", meal_type: "breakfast", tags: ["cut"], kcal: 400, p: 30, c: 40, f: 10, price: 50 },
            // ... would need more mocks to fill 6 slots/day
        ];

        const picker = new MealPicker(mockMeals as any[]);
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
        return new Response(
            JSON.stringify({
                error: "BOOT_RUNTIME_ERROR",
                message: String(error?.message),
                stack: String(error?.stack)
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            },
        )
    }
})
