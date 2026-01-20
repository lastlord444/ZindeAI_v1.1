# Service Layer (Bootstrap)

## Development Setup (VSCode)
1. Install **Deno** extension (`denoland.vscode-deno`).
2. Workspace automatically enables Deno via `.vscode/settings.json`.
3. If errors persist: Command Palette -> `Deno: Restart Language Server`.
4. *Note: These settings are local-only and do not affect CI.*

This directory contains the foundational contracts for the ZindeAI Service Layer.

## Core Contracts
- `types.ts`: Defines `ServiceResult`, `AppError`, and common error codes.
- `index.ts`: Public API barrel file.

## Principles (Phase 1.5)
1. **Determinism**: All logic must be testable without side effects (randomness/time must be injected).
2. **Standardization**: All services must return `ServiceResult<T>`.
3. **No Hidden Logic**: Validation must be explicit.
4. **Single Entrypoint**: Import via `services/index.ts`.
5. **Error Contract**: Never throw exceptions for partial failures; return `ServiceResult` with error.

## Progress
- Step 3: First adoption completed in `PlanItemService`. External API unchanged.
