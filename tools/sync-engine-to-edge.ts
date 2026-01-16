
import { copy } from "https://deno.land/std@0.208.0/fs/copy.ts";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/ensure_dir.ts";
import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";
import { join, relative, dirname } from "https://deno.land/std@0.208.0/path/mod.ts";

const SOURCE_ROOT = "engine/src";
const TARGET_ROOT = "supabase/functions/_shared/engine";
const WHITELIST = ["services", "validators", "db"];

async function main() {
    const isCheck = Deno.args.includes("--check");
    let hasError = false;

    console.log(`Syncing '${SOURCE_ROOT}' -> '${TARGET_ROOT}' (Whitelist: ${WHITELIST.join(", ")})`);

    // Ensure target root exists
    if (!isCheck) {
        await ensureDir(TARGET_ROOT);
    }

    for (const folder of WHITELIST) {
        const sourcePath = join(SOURCE_ROOT, folder);
        const targetPath = join(TARGET_ROOT, folder);

        // 1. Walk sourcedir to copy/check
        try {
            for await (const entry of walk(sourcePath, { includeDirs: false })) {
                const rel = relative(sourcePath, entry.path);
                const destFile = join(targetPath, rel);

                if (isCheck) {
                    try {
                        const srcContent = await Deno.readTextFile(entry.path);
                        const destContent = await Deno.readTextFile(destFile);
                        if (srcContent !== destContent) {
                            console.error(`[DRIFT] Content mismatch: ${destFile}`);
                            hasError = true;
                        }
                    } catch (e) {
                        if (e instanceof Deno.errors.NotFound) {
                            console.error(`[DRIFT] Missing in target: ${destFile}`);
                            hasError = true;
                        } else {
                            throw e;
                        }
                    }
                } else {
                    await ensureDir(dirname(destFile));
                    await copy(entry.path, destFile, { overwrite: true });
                    // console.log(`Synced: ${rel}`);
                }
            }
        } catch (e) {
            if (e instanceof Deno.errors.NotFound) {
                // Source folder might not exist, skip? Or warn?
                // console.warn(`Source folder missing: ${sourcePath}`);
            } else {
                throw e;
            }
        }

        // 2. Walk targetdir to remove extras (Mirroring)
        // Only if target exists
        try {
            for await (const entry of walk(targetPath, { includeDirs: false })) {
                const rel = relative(targetPath, entry.path);
                const srcFile = join(sourcePath, rel);

                try {
                    await Deno.stat(srcFile);
                } catch (e) {
                    if (e instanceof Deno.errors.NotFound) {
                        if (isCheck) {
                            console.error(`[DRIFT] Extra file in target: ${entry.path}`);
                            hasError = true;
                        } else {
                            await Deno.remove(entry.path);
                            console.log(`Removed extra: ${entry.path}`);
                        }
                    }
                }
            }
        } catch (e) {
            // Target folder missing is fine if we are syncing
        }
    }

    if (isCheck && hasError) {
        console.error("Sync check FAILED. Run 'deno run -A tools/sync-engine-to-edge.ts' to fix.");
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
