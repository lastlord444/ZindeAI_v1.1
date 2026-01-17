
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const DATABASE_URL = Deno.env.get("DATABASE_URL") || "postgres://postgres:postgres@localhost:54322/postgres";

export const client = new Client(DATABASE_URL);

let connected = false;

export async function connectDb() {
    if (!connected) {
        await client.connect();
        connected = true;
    }
}

export async function closeDb() {
    if (connected) {
        await client.end();
        connected = false;
    }
}

// Wrapper for queries with parameter binding support
// T is the expected row type
export async function query<T>(text: string, args: any[] = []): Promise<T[]> {
    await connectDb();
    try {
        const result = await client.queryObject<T>(text, args);
        return result.rows;
    } catch (e) {
        console.error(`Query Error: ${e.message}`);
        throw e;
    }
}
