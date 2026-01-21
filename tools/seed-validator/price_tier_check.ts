import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function validatePriceTierGroups() {
    console.log('Validating price tier groups...');

    const { data, error } = await supabase
        .from('meals_with_cost_v')
        .select('goal_tag, meal_type, price_tier');

    if (error) {
        console.error('Error fetching meals_with_cost_v:', error);
        Deno.exit(1);
    }

    if (!data || data.length === 0) {
        console.warn('WARNING: No meals found in meals_with_cost_v. Is the database seeded?');
        // For now we might exit 0 if empty, or fail if we expect seeds. 
        // Assuming seeds should exist if we run this.
        // Let's assume strict validation -> 0 meals = FAIL.
        console.error('FAIL: No meals found.');
        Deno.exit(1);
    }

    // Group by (goal_tag, meal_type, price_tier)
    const groups = new Map<string, number>();

    for (const row of data) {
        const key = `${row.goal_tag}|${row.meal_type}|${row.price_tier}`;
        groups.set(key, (groups.get(key) || 0) + 1);
    }

    const failures: string[] = [];

    // Define expected combinations? 
    // We rely on what we found. If a combination is missing entirely, it won't be in the loop.
    // Ideally we should generate all combinations of (goal)x(type)x(tier) and check.

    const goals = ['cut', 'bulk', 'maintain'];
    const types = ['kahvalti', 'ara_ogun_1', 'ogle', 'ara_ogun_2', 'aksam', 'gece_atistirmasi'];
    const tiers = ['ekonomik', 'normal'];

    for (const g of goals) {
        for (const t of types) {
            for (const tier of tiers) {
                const key = `${g}|${t}|${tier}`;
                const count = groups.get(key) || 0;

                if (count < 3) {
                    failures.push(`${key}: found ${count} meals (min 3 required)`);
                }
            }
        }
    }

    if (failures.length > 0) {
        console.error('[FAIL] Price tier group validation failed:');
        failures.forEach(f => console.error(`  - ${f}`));
        Deno.exit(1);
    }

    console.log('[PASS] All (goal, meal_type, price_tier) groups have at least 3 meals.');
}

await validatePriceTierGroups();
