
// Basic JSON Plan Validator
import { assert } from "https://deno.land/std@0.190.0/testing/asserts.ts";

// Sample Interfaces
interface PlanItem {
    day_of_week: number;
    meal_type: string;
    meal_id: string; // UUID
    name: string;
}

interface Plan {
    name: string;
    items: PlanItem[];
}

const samplePlanPath = Deno.args[0];

if (!samplePlanPath) {
    console.log("No plan file provided, skipping specific plan check. Usage: deno run -A validate_plan.ts <path_to_json>");
    // This script might also be used to validate generated plans in CI, for now we will just mock a check or exit if intended to be run against a file.
    // Use a dummy success for now if no file, or create a dummy test.
    console.log("✅ Validator loaded (no input).");
    Deno.exit(0);
}

try {
    const text = await Deno.readTextFile(samplePlanPath);
    const plan: Plan = JSON.parse(text);

    console.log(`Validating Plan: ${plan.name}`);

    // 1. Check Days
    const days = new Set(plan.items.map(i => i.day_of_week));
    if (days.size !== 7) {
        console.warn("⚠️ Plan does not cover 7 days (Custom plans allowed might cover less, but strictly warning here).");
    }

    // 2. Check Consecutive Meals (Example Rule: No same main_meal name twice in a row for same meal_type)
    // Sort by day and type
    // This is a placeholder for complex logic

    console.log("✅ Plan structure is valid JSON.");
} catch (e) {
    console.error("❌ Invalid Plan JSON or Logic:", e);
    Deno.exit(1);
}
