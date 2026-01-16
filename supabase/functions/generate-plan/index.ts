import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { PlanService } from "../../engine/src/services/planService.ts";
import { MealPicker } from "../../engine/src/services/mealPicker.ts";
// Note: In real setup, we would import db client to fetch real meals.
// For POC, using mocks inside the function if needed, or importing from engine if paths allow.
// Assuming relative path import works in repo structure for local/ci, but DB fetch is better.

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { user_id, week_start, goal_tag } = await req.json();

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
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        )
    }
})
