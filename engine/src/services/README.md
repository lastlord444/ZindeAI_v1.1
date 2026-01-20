# Service Layer (Bootstrap)

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

## Future Work
- Migration of `planItemService.ts` and `mealService.ts` to implement these contracts.
