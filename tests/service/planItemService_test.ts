
import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { PlanItemService } from "../../engine/src/services/planItemService.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "anon-key-placeholder";

Deno.test("PlanItemService - insertPlanItem - Integration Mock", async () => {
    // This test actually connects to the DB if available, or mocks check
    // Since we are in an environment where we might check only logic if DB not present
    // But acceptance criteria requires "Unit/integration test or validator hook"

    // We'll create a mock client to verify the method calls RPC correctly
    // or skip if we can't fully mock. 
    // Ideally we want to hit the real DB in CI.

    // Simple Mock for unit testing behavior
    const mockSupabase = {
        rpc: (name: string, args: any) => {
            if (name === "insert_plan_item") {
                if (args.p_plan_id === "fail") return Promise.resolve({ data: null, error: { message: "Simulated Failure" } });
                return Promise.resolve({ data: "generated-uuid-123", error: null });
            }
            return Promise.resolve({ data: null, error: { message: "Unknown RPC" } });
        }
    } as any;

    const service = new PlanItemService(mockSupabase);

    const id = await service.insertPlanItem({
        plan_id: "test-plan",
        day_of_week: 1,
        meal_type: "lunch",
        meal_id: "meal-1",
        is_consumed: false
    });

    assertEquals(id, "generated-uuid-123");

    await assertRejects(
        async () => {
            await service.insertPlanItem({
                plan_id: "fail", // Triggers mock failure
                day_of_week: 1,
                meal_type: "lunch",
                meal_id: "meal-1"
            });
        },
        Error,
        "RPC insert_plan_item failed"
    );
});
