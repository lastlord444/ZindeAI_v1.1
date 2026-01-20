
import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { MealService } from "../../engine/src/services/mealService.ts";

/**
 * Fake classes to mimic Supabase chainable API: .from().select().eq().single()
 */
class FakeQueryBuilder {
    constructor(private table: string, private data: any = null, private error: any = null) { }

    select(columns: string) { return this; }

    eq(column: string, value: any) { return this; }

    async single() {
        return { data: this.data, error: this.error };
    }
}

class FakeSupabaseClient {
    private mockData: any;
    private mockError: any;

    constructor(data: any = null, error: any = null) {
        this.mockData = data;
        this.mockError = error;
    }

    from(table: string) {
        return new FakeQueryBuilder(table, this.mockData, this.mockError);
    }
}

Deno.test("MealService - getMealById - Success", async () => {
    const mockMeal = { id: "meal-1", name: "Test Meal", calories: 500 };
    const fakeClient = new FakeSupabaseClient(mockMeal, null) as any;
    const service = new MealService(fakeClient);

    const result = await service.getMealById("meal-1");
    assertEquals(result, mockMeal);
});

Deno.test("MealService - getMealById - Validation Error", async () => {
    const fakeClient = new FakeSupabaseClient() as any;
    const service = new MealService(fakeClient);

    await assertRejects(
        async () => {
            await service.getMealById("");
        },
        Error,
        "Validation failed: mealId is required"
    );
});

Deno.test("MealService - getMealById - DB Error", async () => {
    const fakeClient = new FakeSupabaseClient(null, { message: "Record not found" }) as any;
    const service = new MealService(fakeClient);

    await assertRejects(
        async () => {
            await service.getMealById("meal-1");
        },
        Error,
        "DB getMealById failed: Record not found"
    );
});
