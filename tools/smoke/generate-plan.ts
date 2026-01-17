import { assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import Ajv from "https://esm.sh/ajv@8.12.0";
import addFormats from "https://esm.sh/ajv-formats@2.1.1";

const BASE_URL = Deno.env.get("SUPABASE_URL") || "http://127.0.0.1:54321";
const API_URL = `${BASE_URL}/functions/v1/generate-plan`;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

if (!ANON_KEY) {
    console.error("Error: SUPABASE_ANON_KEY is missing.");
    Deno.exit(1);
}

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

async function loadSchema() {
    try {
        const schemaText = await Deno.readTextFile("contracts/v1/generate_plan.response.schema.json");
        return JSON.parse(schemaText);
    } catch (err) {
        console.error("Error loading schema:", err);
        Deno.exit(1);
    }
}

// Simple smoke test: Call the endpoint and check it returns 200 and valid JSON
async function smokeTest() {
    console.log(`Smoke testing ${API_URL}...`);
    const schema = await loadSchema();
    const validate = ajv.compile(schema);

    const payload = {
        user_id: "00000000-0000-0000-0000-000000000000",
        week_start: "2026-01-19",
        goal_tag: "cut",
        budget_mode: "medium",
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ANON_KEY}`,
                "apikey": ANON_KEY
            },
            body: JSON.stringify(payload)
        });

        if (res.status !== 200) {
            const text = await res.text();
            console.error(`FAILED: Status ${res.status}`);
            console.error(text);
            Deno.exit(1);
        }

        const data = await res.json();
        console.log("Response JSON received.");

        const valid = validate(data);
        if (!valid) {
            console.error("FAILED: Contract Validation Error");
            validate.errors?.forEach(err => {
                console.error(`Path: ${err.instancePath} | Message: ${err.message}`);
            });
            Deno.exit(1);
        }

        console.log("SMOKE TEST PASS (Contract Validated)");
    } catch (err) {
        console.error("FAILED: Connection error");
        console.error(err);
        Deno.exit(1);
    }
}

smokeTest();
