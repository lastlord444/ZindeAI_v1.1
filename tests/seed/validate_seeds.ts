
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const DB_URL = Deno.env.get("DATABASE_URL") || "postgres://postgres:postgres@localhost:54322/postgres";

// GATES CONFIGURATION (Deterministic Ranges)
// meal_type -> goal_tag -> {min_kcal, max_kcal, min_p}
const MACRO_GATES: Record<string, Record<string, { min_kcal: number, max_kcal: number, min_p: number }>> = {
  "kahvalti": {
    "cut": { min_kcal: 300, max_kcal: 450, min_p: 20 },
    "bulk": { min_kcal: 500, max_kcal: 750, min_p: 30 },
    "maintain": { min_kcal: 400, max_kcal: 600, min_p: 25 }
  },
  "ogle": {
    "cut": { min_kcal: 400, max_kcal: 600, min_p: 30 },
    "bulk": { min_kcal: 700, max_kcal: 950, min_p: 40 },
    "maintain": { min_kcal: 550, max_kcal: 750, min_p: 35 }
  },
  "aksam": {
    "cut": { min_kcal: 400, max_kcal: 550, min_p: 30 },
    "bulk": { min_kcal: 650, max_kcal: 850, min_p: 40 },
    "maintain": { min_kcal: 500, max_kcal: 700, min_p: 35 }
  },
  "ara_ogun_1": {
    "cut": { min_kcal: 100, max_kcal: 250, min_p: 5 },
    "bulk": { min_kcal: 250, max_kcal: 450, min_p: 10 },
    "maintain": { min_kcal: 150, max_kcal: 300, min_p: 8 }
  }
};
// Map other snacks
MACRO_GATES["ara_ogun_2"] = MACRO_GATES["ara_ogun_1"];
MACRO_GATES["gece_atistirmasi"] = MACRO_GATES["ara_ogun_1"];

async function main() {
  console.log("🚀 Starting STRICT Seed Validation (Schema 0002)...");
  const client = new Client(DB_URL);

  try {
    await client.connect();
  } catch (e) {
    console.error("❌ DB Connection Failed. Is Supabase running? (supabase start)");
    console.error(e);
    Deno.exit(1);
  }

  let violations = 0;

  function logViolation(gate: string, mealName: string, msg: string) {
    console.error(`❌ [${gate}] Meal: ${mealName} -> ${msg}`);
    violations++;
  }

  try {
    // 1. Fetch Data
    // Column alignment with 0002_tables.sql: 
    // ingredients: id, name, price_per100_try, category, is_fish
    // meals: id, name, meal_type, goal_tag, protein_source
    const ingRes = await client.queryObject(`SELECT id, name, price_per100_try FROM public.ingredients`);
    const ingredients = new Map(ingRes.rows.map((r: any) => [r.id, r]));

    const macroRes = await client.queryObject(`SELECT ingredient_id, per100_kcal, per100_p FROM public.ingredient_macros`);
    const ingMacros = new Map(macroRes.rows.map((r: any) => [r.ingredient_id, r]));

    const mealRes = await client.queryObject(`SELECT id, name as meal_name, meal_type, goal_tag, protein_source FROM public.meals`);
    const meals = new Map(mealRes.rows.map((r: any) => [r.id, r]));

    const itemsRes = await client.queryObject(`SELECT meal_id, ingredient_id, grams FROM public.meal_items`);

    const altsRes = await client.queryObject(`SELECT meal_id, alt1_meal_id, alt2_meal_id FROM public.meal_alternatives`);
    const altsMap = new Map();
    for (const r of altsRes.rows as any[]) {
      altsMap.set(r.meal_id, r);
    }

    console.log(`DATA LOADED: ${meals.size} Meals, ${ingredients.size} Ingredients.`);

    // 2. Computed Totals Map
    const mealTotals = new Map<string, { kcal: number, p: number, cost: number }>();

    // Group Items by Meal
    const mealItemsMap = new Map<string, any[]>();
    for (const item of itemsRes.rows as any[]) {
      if (!mealItemsMap.has(item.meal_id)) mealItemsMap.set(item.meal_id, []);
      mealItemsMap.get(item.meal_id)!.push(item);
    }

    // Process Each Meal
    for (const [mealId, meal] of meals.entries()) {
      const items = mealItemsMap.get(mealId) || [];

      // Gate: Structural (Zero Items)
      if (items.length === 0) {
        logViolation("STRUCTURAL", meal.meal_name, "Has 0 items (Empty meal).");
        continue;
      }

      let totalKcal = 0;
      let totalP = 0;
      let totalCost = 0;
      let pricePer100Missing = false;

      for (const item of items) {
        const ing = ingredients.get(item.ingredient_id);
        const mac = ingMacros.get(item.ingredient_id);

        // Gate: Structural (Bad FK)
        if (!ing) {
          logViolation("STRUCTURAL", meal.meal_name, `Item refers to unknown ingredient ${item.ingredient_id}`);
          continue;
        }
        if (!mac) {
          logViolation("STRUCTURAL", meal.meal_name, `Ingredient ${ing.name} missing macros.`);
          continue;
        }

        // Gate: Price presence check (Schema defines NOT NULL but JS check adds safety)
        if (ing.price_per100_try === null || ing.price_per100_try === undefined) {
          pricePer100Missing = true;
        }

        const ratio = item.grams / 100.0;
        totalKcal += Number(mac.per100_kcal) * ratio;
        totalP += Number(mac.per100_p) * ratio;
        totalCost += Number(ing.price_per100_try || 0) * ratio;
      }

      mealTotals.set(mealId, { kcal: totalKcal, p: totalP, cost: totalCost });

      // GATE CHECKS FOR MEAL

      // 1. Cost Gate
      if (pricePer100Missing) logViolation("COST", meal.meal_name, "Has ingredient with missing price_per100_try.");
      // Optional: Warn on zero cost, implying placeholder
      if (totalCost <= 0.01) console.warn(`⚠️ [COST] Meal: ${meal.meal_name} has roughly zero cost.`);

      // 2. Flags (Gate temporarily disabled as columns missing in 0002)
      // if (isBreakfastOnlyViolated) ... (Requires schema migration to re-enable)

      // 3. Macro Ranges
      const targetGate = MACRO_GATES[meal.meal_type]?.[meal.goal_tag];
      if (targetGate) {
        if (totalKcal < targetGate.min_kcal || totalKcal > targetGate.max_kcal) {
          logViolation("MACRO", meal.meal_name, `Kcal ${totalKcal.toFixed(0)} outside range [${targetGate.min_kcal}-${targetGate.max_kcal}]`);
        }
        if (totalP < targetGate.min_p) {
          logViolation("MACRO", meal.meal_name, `Protein ${totalP.toFixed(1)}g below min ${targetGate.min_p}g`);
        }
      }
    }

    // Gate: Alternatives
    for (const [mealId, meal] of meals.entries()) {
      const alts = altsMap.get(mealId);

      if (!alts) {
        logViolation("ALTERNATIVES", meal.meal_name, "No alternative record found.");
        continue;
      }

      const alt1Id = alts.alt1_meal_id;
      const alt2Id = alts.alt2_meal_id;
      const mainTotals = mealTotals.get(mealId);

      if (!mainTotals) continue;

      if (!meals.has(alt1Id) || !meals.has(alt2Id)) {
        logViolation("ALTERNATIVES", meal.meal_name, "Referenced alternative meals do not exist.");
        continue;
      }

      const alt1Totals = mealTotals.get(alt1Id);
      const alt2Totals = mealTotals.get(alt2Id);

      if (!alt1Totals || !alt2Totals) continue;

      // Sub-check: Kcal +/- 15%
      const diff1 = Math.abs(alt1Totals.kcal - mainTotals.kcal) / mainTotals.kcal;
      const diff2 = Math.abs(alt2Totals.kcal - mainTotals.kcal) / mainTotals.kcal;

      if (diff1 > 0.15) logViolation("ALTERNATIVES", meal.meal_name, `Alt1 Kcal diff ${(diff1 * 100).toFixed(1)}% > 15%`);
      if (diff2 > 0.15) logViolation("ALTERNATIVES", meal.meal_name, `Alt2 Kcal diff ${(diff2 * 100).toFixed(1)}% > 15%`);

      // Sub-check: Protein Source Different
      // Schema 0002 has 'protein_source' as TEXT
      const mainSrc = meal.protein_source;
      const alt1Src = meals.get(alt1Id).protein_source;
      const alt2Src = meals.get(alt2Id).protein_source;

      if (mainSrc && (mainSrc === alt1Src)) logViolation("ALTERNATIVES", meal.meal_name, `Alt1 has same protein source '${mainSrc}'`);
      if (mainSrc && (mainSrc === alt2Src)) logViolation("ALTERNATIVES", meal.meal_name, `Alt2 has same protein source '${mainSrc}'`);
    }

  } catch (e) {
    console.error("UNKNOWN ERROR:", e);
    violations++;
  } finally {
    await client.end();
  }

  if (violations > 0) {
    console.error(`\nFAILED: ${violations} violations found.`);
    Deno.exit(1);
  } else {
    console.log("\n✅ ALL SEEDS VALID (Strict Gates Passed).");
  }
}

main();
