import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export interface Meal {
    id: string;
    name: string;
    description?: string;
    calories?: number;
}

export class MealService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Retrieves a meal by its ID.
     * Uses Service Layer pattern: Validation -> DB Call -> Error Mapping.
     */
    async getMealById(mealId: string): Promise<Meal> {
        this.validateMealId(mealId);

        // Note: Wrapping direct DB access as no specific RPC exists for single meal fetch yet.
        // This follows the same architectural contract.
        const { data, error } = await this.supabase
            .from("meals")
            .select("*")
            .eq("id", mealId)
            .single();

        if (error) {
            throw new Error(`DB getMealById failed: ${error.message}`);
        }

        return data as Meal;
    }

    private validateMealId(mealId: string): void {
        const errors: string[] = [];
        if (!mealId) errors.push("mealId is required");
        // Could add UUID regex check here

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(", ")}`);
        }
    }
}
