
import { copy } from "https://deno.land/std@0.208.0/fs/copy.ts";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/ensure_dir.ts";
import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";
import { join, relative, dirname } from "https://deno.land/std@0.208.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.208.0/fs/exists.ts";

const SOURCE_ROOT = "engine/src";
const TARGET_ROOT = "supabase/functions/_shared/engine";
const WHITELIST = ["services", "validators", "db"];

async function main() {
    const isCheck = Deno.args.includes("--check");
    let hasError = false;

    console.log(`Syncing '${SOURCE_ROOT}' -> '${TARGET_ROOT}'`);
    console.log(`Whitelist: ${WHITELIST.join(", ")}`);

    // Ensure target root exists
    if (!isCheck) {
        await ensureDir(TARGET_ROOT);
    }

    // 1. Collect all valid source files
    const sourceFiles: string[] = [];

    for (const item of WHITELIST) {
        const sourcePath = join(SOURCE_ROOT, item);
        if (await exists(sourcePath)) {
            for await (const entry of walk(sourcePath, { includeDirs: false })) {
                sourceFiles.push(entry.path);
            }
        }
    }

    // Deterministic Sort
    sourceFiles.sort();

    // 2. Process Sync (Copy / Check)
    for (const srcPath of sourceFiles) {
        const rel = relative(SOURCE_ROOT, srcPath); // e.g. services/planService.ts
        const destPath = join(TARGET_ROOT, rel);

        if (isCheck) {
            try {
                const srcContent = await Deno.readTextFile(srcPath);
                const destContent = await Deno.readTextFile(destPath);
                if (srcContent !== destContent) {
                    console.error(`[DRIFT] Content mismatch: ${rel}`);
                    hasError = true;
                }
            } catch (e) {
                if (e instanceof Deno.errors.NotFound) {
                    console.error(`[DRIFT] Missing in target: ${rel}`);
                    hasError = true;
                } else {
                    throw e;
                }
            }
        } else {
            await ensureDir(dirname(destPath));
            await copy(srcPath, destPath, { overwrite: true });
            // console.log(`Synced: ${rel}`);
        }
    }

    // 3. Remove Extras (Mirroring)
    if (await exists(TARGET_ROOT)) {
        const targetFiles: string[] = [];
        for await (const entry of walk(TARGET_ROOT, { includeDirs: false })) {
            targetFiles.push(entry.path);
        }
        targetFiles.sort();

        for (const destPath of targetFiles) {
            const rel = relative(TARGET_ROOT, destPath);
            // Check if this file belongs to a whitelisted folder
            // (Only sync files that start with one of the whitelist folders)
            const rootFolder = rel.split((/[/\\]/))[0];
            if (!WHITELIST.includes(rootFolder)) {
                // If it's outside whitelist but inside engine folder, should we delete?
                // Current logic: sync whitelist only. 
                // If _shared/engine has "misc.ts" that is NOT in whitelist, we should remove it if we want strict mirroring?
                // User said "Copy EXACT whitelist". Implicitly remove others? 
                // Let's assume yes for "generated" folder content.
            }

            const srcPath = join(SOURCE_ROOT, rel);

            // Check if it exists in source
            if (!(await exists(srcPath))) {
                if (isCheck) {
                    console.error(`[DRIFT] Extra file in target: ${rel}`);
                    hasError = true;
                } else {
                    await Deno.remove(destPath);
                    console.log(`Removed extra: ${rel}`);
                }
            }
        }
    }

    if (isCheck && hasError) {
        console.error("Sync check FAILED. Run 'deno task sync' in engine/ directory or 'deno run -A tools/sync-engine-to-edge.ts' to fix.");
        Deno.exit(1);
    } else if (isCheck) {
        console.log("Sync check PASSED.");
    } else {
        console.log("Sync COMPLETED.");
    }
}

if (import.meta.main) {
    main();
}
