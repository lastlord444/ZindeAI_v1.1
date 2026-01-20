
/**
 * Standard Result type for Service Layer operations.
 * @template T The type of the successful result data.
 */
export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: AppError };

/**
 * Standard Error structure for Service Layer.
 */
export interface AppError {
    code: string;
    message: string;
    meta?: Record<string, unknown>;
}

/**
 * Common error codes for services.
 */
export const ServiceErrorCodes = {
    VALIDATION_FAILED: "VALIDATION_FAILED",
    NOT_FOUND: "NOT_FOUND",
    INTERNAL: "INTERNAL_ERROR",
    UNAUTHORIZED: "UNAUTHORIZED"
} as const;

/**
 * Determinism Note:
 * All service logic MUST be deterministic.
 * - Sort inputs before processing.
 * - Ensure stable JSON serialization.
 * - Use DB-only macros where possible.
 * - Avoid nondeterministic functions (random(), now()) unless seeded/injected.
 */
export const DeterminismNote = "sort inputs, stable JSON, db-only macros";
