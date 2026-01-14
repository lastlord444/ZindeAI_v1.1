
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const DB_URL = Deno.env.get("DATABASE_URL") || "postgres://postgres:postgres@localhost:54322/postgres";

// --- HARD CONSTANTS (MASTER SPEC) ---
// Cost Caps (TL)
const COST_CAPS: Record<string, number> = {
  "kahvalti": 60,
  "ara_ogun_1": 35,
  "ogle": 90,
  "ara_ogun_2": 35,
  "aksam": 90,
  "gece_atistirmasi": 45
};

// Meal Class Mapping
const CLASS_MAPPING: Record<string, string> = {
  "kahvalti": "breakfast",
  "ara_ogun_1": "light_snack",
  "ogle": "main_meal",
  "aksam": "main_meal",
  "ara_ogun_2": "light_snack",
  "gece_atistirmasi": "night_snack"
};

// MACRO RANGES (Spec Implementation - Placeholder Values based on typical diet)
// Format: [min_kcal, max_kcal, min_p, max_p] (simplified for this script, expandable)
const MACRO_RANGES: Record<string, Record<string, { min_kcal: number, max_kcal: number }>> = {
  "kahvalti": {
    "cut": { min_kcal: 300, max_kcal: 450 },
    "bulk": { min_kcal: 500, max_kcal: 700 },
    "maintain": { min_kcal: 400, max_kcal: 600 }
  },
  "ogle": {
    "cut": { min_kcal: 400, max_kcal: 600 },
    "bulk": { min_kcal: 700, max_kcal: 900 },
    "maintain": { min_kcal: 600, max_kcal: 800 }
  },
  "aksam": {
    "cut": { min_kcal: 400, max_kcal: 600 },
    "bulk": { min_kcal: 700, max_kcal: 900 },
    "maintain": { min_kcal: 600, max_kcal: 800 }
  },
  "ara_ogun_1": {
    "cut": { min_kcal: 100, max_kcal: 250 },
    "bulk": { min_kcal: 250, max_kcal: 400 },
    "maintain": { min_kcal: 200, max_kcal: 300 }
  },
  "ara_ogun_2": {
    "cut": { min_kcal: 100, max_kcal: 250 },
    "bulk": { min_kcal: 250, max_kcal: 400 },
    "maintain": { min_kcal: 200, max_kcal: 300 }
  },
  "gece_atistirmasi": {
    "cut": { min_kcal: 100, max_kcal: 200 },
    "bulk": { min_kcal: 200, max_kcal: 400 },
    "maintain": { min_kcal: 150, max_kcal: 300 }
  }
};

async function main() {
  console.log("🚀 Starting Seed Validation...");
  const client = new Client(DB_URL);
  await client.connect();

  let errors = 0;

  try {
    // 1. Fetch Meal Totals
    const result = await client.queryObject(`SELECT * FROM public.meal_totals`);
    const meals = result.rows as any[];
    console.log(`Checking ${meals.length} meals...`);

    if (meals.length === 0) {
      console.error("❌ CRITICAL: No meals found in 'meal_totals'. View might be empty due to strict join or empty DB.");
      Deno.exit(1);
    }

    // 2. Iterate and Check Rules
    for (const meal of meals) {
      const { meal_id, name, meal_type, goal_tag, meal_class, total_cost_try, total_kcal, protein_source } = meal;
      const logPrefix = `[${name}]`;

      // CHECK: Cost Cap
      const cap = COST_CAPS[meal_type];
      if (cap && total_cost_try > cap) {
        console.error(`❌ ${logPrefix} Cost exceeded! ${total_cost_try} > ${cap} for ${meal_type}`);
        errors++;
      }

      // CHECK: Meal Class Mapping
      const expectedClass = CLASS_MAPPING[meal_type];
      if (expectedClass && meal_class !== expectedClass) {
        console.error(`❌ ${logPrefix} Wrong Class! Got ${meal_class}, expected ${expectedClass} for ${meal_type}`);
        errors++;
      }

      // CHECK: Macro Ranges
      const range = MACRO_RANGES[meal_type]?.[goal_tag];
      if (range) {
         if (total_kcal < range.min_kcal || total_kcal > range.max_kcal) {
           console.error(`❌ ${logPrefix} Kcal Out of Range! ${total_kcal} is not in [${range.min_kcal}, ${range.max_kcal}] for ${meal_type}/${goal_tag}`);
           errors++;
         }
      } else {
        // Warn if no range defined, but strictly we should have them all
        // console.warn(`⚠️ ${logPrefix} No macro range constraint defined for ${meal_type}/${goal_tag}`);
      }
      
      // CHECK: Alternatives
      const alts = await client.queryObject(`SELECT * FROM public.meal_alternatives WHERE meal_id = '${meal_id}'`);
      if (alts.rows.length === 0) {
          console.error(`❌ ${logPrefix} No alternatives defined!`);
          errors++;
      } else {
          const altRow = alts.rows[0] as any;
          // Verify alt existence and properties
          const alt1 = (await client.queryObject(`SELECT * FROM public.meal_totals WHERE meal_id = '${altRow.alt1_meal_id}'`)).rows[0] as any;
          const alt2 = (await client.queryObject(`SELECT * FROM public.meal_totals WHERE meal_id = '${altRow.alt2_meal_id}'`)).rows[0] as any;

          if (!alt1 || !alt2) {
               console.error(`❌ ${logPrefix} Alternative meals not found in view (maybe missing data?)`);
               errors++;
          } else {
              // Rule: kcal ±15%
              const diff1 = Math.abs(alt1.total_kcal - total_kcal) / total_kcal;
              const diff2 = Math.abs(alt2.total_kcal - total_kcal) / total_kcal;
              
              if (diff1 > 0.15) { console.error(`❌ ${logPrefix} Alt1 kcal variance ${(diff1*100).toFixed(1)}% > 15%`); errors++; }
              if (diff2 > 0.15) { console.error(`❌ ${logPrefix} Alt2 kcal variance ${(diff2*100).toFixed(1)}% > 15%`); errors++; }

              // Rule: different protein source
              // This rule is tricky if main meal doesn't have explicit single protein source, but assuming column usage:
              if (alt1.protein_source === protein_source) { console.error(`❌ ${logPrefix} Alt1 same protein source: ${protein_source}`); errors++; }
              if (alt2.protein_source === protein_source) { console.error(`❌ ${logPrefix} Alt2 same protein source: ${protein_source}`); errors++; }
          }
      }
    }

  } catch (e) {
    console.error("Processing Error:", e);
    errors++;
  } finally {
    await client.end();
  }

  if (errors > 0) {
    console.error(`\nFAILED with ${errors} errors.`);
    Deno.exit(1);
  } else {
    console.log("\n✅ ALL CHECKS PASSED!");
  }
}

main();
