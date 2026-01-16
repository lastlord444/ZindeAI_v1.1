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
        const { PlanService } = await import("../../engine/src/services/planService.ts");
        const { MealPicker } = await import("../../engine/src/services/mealPicker.ts");

        const requestJson = await req.json(); // Moved inside try block to catch parse errors
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
