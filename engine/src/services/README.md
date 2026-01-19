# Service Layer Standards

This directory contains the business logic and RPC wrappers for the Application Engine.

## Contract
All services must adhere to the following contract:

1.  **Input Validation**: All public methods must validate inputs *before* making any RPC calls.
    *   Use private helper methods for validation logic (e.g., `validateItem`).
    *   Throw standard `Error` objects for invalid inputs.
2.  **RPC Interaction**: Services should wrap Supabase RPC calls.
    *   Do not expose raw PostgREST responses directly if possible; return typed data or primitives.
3.  **Error Handling**:
    *   Catch RPC errors and re-throw them with a standardized prefix format: `RPC <method_name> failed: <message>`.

## Testing
- Tests must use `FakeSupabaseClient` (State-based test double) instead of loose mocks.
- Tests must be deterministic (no dependency on system clock or random without seed).
- Tests must not make real network calls during unit testing.

## File Naming
- Services: `camelCaseService.ts` (e.g., `planItemService.ts`)
- Tests: `tests/service/camelCaseService_test.ts`
