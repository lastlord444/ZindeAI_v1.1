import { ServiceResult, AppError } from "./types.ts";

/**
 * Creates a successful result.
 * @param data The data to return.
 * @returns A ServiceResult with ok: true.
 */
export function ok<T>(data: T): ServiceResult<T> {
    return { ok: true, data };
}

/**
 * Creates an error result.
 * @param code Error code (standard string).
 * @param message Human-readable error message.
 * @param meta Optional metadata for debugging.
 * @returns A ServiceResult with ok: false.
 */
export function err(code: string, message: string, meta?: Record<string, unknown>): ServiceResult<never> {
    return {
        ok: false,
        error: { code, message, meta }
    };
}

/**
 * Type guard to check if a result is successful.
 */
export function isOk<T>(result: ServiceResult<T>): result is { ok: true; data: T } {
    return result.ok;
}

/**
 * Type guard to check if a result is an error.
 */
export function isErr<T>(result: ServiceResult<T>): result is { ok: false; error: AppError } {
    return !result.ok;
}
