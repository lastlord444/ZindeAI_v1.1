import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export interface PlanItem {
    plan_id: string;
    day_of_week: number;
    meal_type: string;
    meal_id: string;
    alt1_meal_id?: string;
    alt2_meal_id?: string;
    is_consumed?: boolean;
}

export class PlanItemService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Inserts a plan item using the 'insert_plan_item' RPC.
     * @param item Plan item details
     * @returns The UUID of the inserted/updated plan item
     */
    async insertPlanItem(item: PlanItem): Promise<string> {
        // Validate inputs (Basic boundary validation)
        if (!item.plan_id) throw new Error("plan_id is required");
        if (!item.meal_id) throw new Error("meal_id is required");

        const { data, error } = await this.supabase.rpc("insert_plan_item", {
            p_plan_id: item.plan_id,
            p_day_of_week: item.day_of_week,
            p_meal_type: item.meal_type,
            p_meal_id: item.meal_id,
            p_alt1_meal_id: item.alt1_meal_id ?? null,
            p_alt2_meal_id: item.alt2_meal_id ?? null,
            p_is_consumed: item.is_consumed ?? false
        });

        if (error) {
            throw new Error(`RPC insert_plan_item failed: ${error.message}`);
        }

        return data as string;
    }
}
