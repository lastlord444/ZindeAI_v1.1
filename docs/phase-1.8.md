# Phase 1.8: Single Source of Truth

**Goal**: Eliminate manual copying of code between `engine/` and `supabase/functions/_shared/`.

## The Rule
**NEVER manually edit files in `supabase/functions/_shared/engine/`.**
These files are generated from `engine/src/`.

## Workflow
1. Make changes in `engine/src/`.
2. Run tests: `cd engine && deno task test`.
3. Sync changes: `cd engine && deno task sync`.
4. Commit both source and synced files.

## CI Enforcement
The CI pipeline runs the sync script and checks for git changes. If you forget to run `deno task sync` before pushing, the CI will fail with a drift error.

## Sync Script
Located at `tools/sync-engine-to-edge.ts`.
- Whitelist: `services`, `validators`, `db`.
- Deterministic: Sorts files to ensure consistent output.
