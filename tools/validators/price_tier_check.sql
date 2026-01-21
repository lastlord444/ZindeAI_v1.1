-- Price Tier Distribution Validator
-- Checks that every combination of (goal_tag, meal_type, price_tier) has at least 3 meals.

DO $$
DECLARE
    r RECORD;
    missing_groups INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting Price Tier Validation...';

    FOR r IN
        -- Generate all expected combinations
        SELECT
            g.goal_tag,
            t.meal_type,
            p.price_tier,
            COUNT(m.meal_id) as cnt
        FROM
            (SELECT unnest(enum_range(NULL::public.goal_tag)) as goal_tag) g
        CROSS JOIN
            (SELECT unnest(enum_range(NULL::public.meal_type)) as meal_type) t
        CROSS JOIN
            (VALUES ('ekonomik'), ('normal')) p(price_tier)
        LEFT JOIN
            public.meals_with_cost_v m
            ON m.goal_tag = g.goal_tag
            AND m.meal_type = t.meal_type
            AND m.price_tier = p.price_tier
        GROUP BY
            g.goal_tag, t.meal_type, p.price_tier
        ORDER BY
            g.goal_tag, t.meal_type, p.price_tier
    LOOP
        IF r.cnt < 3 THEN
            RAISE NOTICE 'FAIL: Group (Goal: %, Type: %, Tier: %) has % meals (Min required: 3)', 
                r.goal_tag, r.meal_type, r.price_tier, r.cnt;
            missing_groups := missing_groups + 1;
        END IF;
    END LOOP;

    IF missing_groups > 0 THEN
        RAISE EXCEPTION 'Price tier validation FAILED. % groups do not meet the minimum meal requirement.', missing_groups;
    ELSE
        RAISE NOTICE 'SUCCESS: All price tier groups have sufficient meals.';
    END IF;
END $$;
