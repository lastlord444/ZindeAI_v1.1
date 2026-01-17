import { assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import Ajv from "https://esm.sh/ajv@8.12.0";
import addFormats from "https://esm.sh/ajv-formats@2.1.1";

// Flexible env var loading
const BASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("API_URL") ?? "http://127.0.0.1:54321";
const ENDPOINT = `${BASE_URL}/functions/v1/generate-plan`;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");

if (!ANON_KEY) {
    console.error("Error: SUPABASE_ANON_KEY (or ANON_KEY) is missing.");
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
    console.log(`Smoke testing ${ENDPOINT}...`);
    const schema = await loadSchema();
    const validate = ajv.compile(schema);

    const payload = {
        user_id: "00000000-0000-0000-0000-000000000000",
        week_start: "2026-01-19",
        goal_tag: "cut",
        budget_mode: "medium",
    };

    try {
        const res = await fetch(ENDPOINT, {
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

        // NEGATIVE TEST
        console.log("Running Negative Test (Invalid Request)...");
        const invalidPayload = {
            user_id: "not-a-uuid",
            // missing other fields
        };

        const resInvalid = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ANON_KEY}`,
                "apikey": ANON_KEY
            },
            body: JSON.stringify(invalidPayload)
        });

        if (resInvalid.status !== 422) {
            console.error(`NEGATIVE TEST FAILED: Expected 422, got ${resInvalid.status}`);
            const text = await resInvalid.text();
            console.error(text);
            Deno.exit(1);
        }

        const invalidData = await resInvalid.json();
        if (invalidData.error !== "INVALID_REQUEST") {
            console.error(`NEGATIVE TEST FAILED: Expected error 'INVALID_REQUEST', got '${invalidData.error}'`);
            Deno.exit(1);
        }
        console.log("NEGATIVE TEST PASS (422 Received)");


    } catch (err) {
        console.error("FAILED: Connection error");
        console.error(err);
        Deno.exit(1);
    }
}

smokeTest();
