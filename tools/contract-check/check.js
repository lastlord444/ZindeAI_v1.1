const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const fs = require("fs");
const path = require("path");

const ajv = new Ajv();
addFormats(ajv);

const CONTRACTS_DIR = path.resolve(__dirname, "../../contracts/v1");
const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

function validate(schemaName, fixtureName) {
    console.log(`Validating ${fixtureName} against ${schemaName}...`);

    const schemaPath = path.join(CONTRACTS_DIR, schemaName);
    const fixturePath = path.join(FIXTURES_DIR, fixtureName);

    if (!fs.existsSync(schemaPath)) {
        console.error(`Schema not found: ${schemaPath}`);
        process.exit(1);
    }
    if (!fs.existsSync(fixturePath)) {
        console.error(`Fixture not found: ${fixturePath}`);
        process.exit(1);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

    const validate = ajv.compile(schema);
    const valid = validate(fixture);

    if (!valid) {
        console.error("VALIDATION FAILED");
        console.error(validate.errors);
        process.exit(1);
    }
    console.log("PASS");
}

validate("generate_plan.request.schema.json", "request.json");
validate("generate_plan.response.schema.json", "response.json");
