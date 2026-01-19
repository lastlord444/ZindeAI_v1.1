
import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { PlanItemService } from "../../engine/src/services/planItemService.ts";

/**
 * FakeSupabaseClient implements a minimal in-memory version of Supabase client behavior
 * required for PlanItemService. This avoids network calls and flaky mocks.
 */
class FakeSupabaseClient {
    // Stores RPC calls for verification if needed, or mimics state
    // For this service, we just need to return success/fail based on input

    rpc(name: string, args: any) {
        if (name === "insert_plan_item") {
            // Simulate backend validation logic locally
            if (!args.p_plan_id || !args.p_meal_type || !args.p_meal_id) {
                return Promise.resolve({ data: null, error: { message: "Invalid RPC Arguments" } });
            }

            // Simulate successful insertion returning a UUID
            // Deterministic UUID-like string for testing
            return Promise.resolve({ data: "12345678-1234-4444-8888-1234567890ab", error: null });
        }
        return Promise.resolve({ data: null, error: { message: `Function ${name} not found` } });
    }
}

Deno.test("PlanItemService - insertPlanItem - with FakeClient", async (t) => {
    const fakeClient = new FakeSupabaseClient() as any;
    const service = new PlanItemService(fakeClient);

    await t.step("should call RPC and return ID on valid input", async () => {
        const id = await service.insertPlanItem({
            plan_id: "plan-1",
            day_of_week: 1,
            meal_type: "breakfast",
            meal_id: "meal-1",
            is_consumed: false
        });

        assertEquals(id, "12345678-1234-4444-8888-1234567890ab");
    });

    await t.step("should throw validation error if plan_id missing", async () => {
        await assertRejects(
            async () => {
                await service.insertPlanItem({
                    plan_id: "",
                    day_of_week: 1,
                    meal_type: "breakfast",
                    meal_id: "meal-1"
                });
            },
            Error,
            "plan_id is required"
        );
    });

    await t.step("should throw RPC error if client returns error", async () => {
        // Create a client that always fails RPC
        const errorClient = {
            rpc: () => Promise.resolve({ data: null, error: { message: "DB Error" } })
        } as any;

        const failService = new PlanItemService(errorClient);

        await assertRejects(
            async () => {
                await failService.insertPlanItem({
                    plan_id: "plan-1",
                    day_of_week: 1,
                    meal_type: "breakfast",
                    meal_id: "meal-1"
                });
            },
            Error,
            "RPC insert_plan_item failed: DB Error"
        );
    });
});
