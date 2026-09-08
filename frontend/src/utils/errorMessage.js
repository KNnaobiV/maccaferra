/**
 * Utility to extract and format clean, human-readable error messages
 * from backend API responses.
 *
 * Handles:
 * - Single string or { detail: "..." }
 * - { message: "..." }
 * - { error: "..." }
 * - { non_field_errors: [...] }
 * - Field-level errors dictionary { field: ["Error 1", ...] }
 * - Arrays of errors
 */

export function formatApiError(data, fallback = "An unexpected error occurred. Please try again.") {
    if (!data) return fallback;
    if (typeof data === "string") {
        const trimmed = data.trim();
        return trimmed || fallback;
    }

    // Direct string message properties
    if (typeof data.message === "string" && data.message.trim()) {
        return data.message.trim();
    }
    if (typeof data.detail === "string" && data.detail.trim()) {
        return data.detail.trim();
    }
    if (typeof data.error === "string" && data.error.trim()) {
        return data.error.trim();
    }

    if (Array.isArray(data)) {
        const msgs = data
            .map((item) => formatApiError(item, ""))
            .filter(Boolean);
        return msgs.length > 0 ? msgs.join(" ") : fallback;
    }

    if (typeof data === "object") {
        // Non-field errors
        if (data.non_field_errors) {
            if (Array.isArray(data.non_field_errors)) {
                return data.non_field_errors.join(" ");
            }
            if (typeof data.non_field_errors === "string") {
                return data.non_field_errors;
            }
        }

        // Collect messages from all field entries
        const messages = [];
        for (const [key, val] of Object.entries(data)) {
            // Ignore metadata/status fields
            if (["detail", "message", "status_code", "error", "code"].includes(key)) {
                continue;
            }

            if (Array.isArray(val)) {
                val.forEach((v) => {
                    if (typeof v === "string" && v.trim()) {
                        messages.push(v.trim());
                    } else if (typeof v === "object" && v !== null) {
                        messages.push(formatApiError(v, ""));
                    }
                });
            } else if (typeof val === "string" && val.trim()) {
                messages.push(val.trim());
            } else if (typeof val === "object" && val !== null) {
                messages.push(formatApiError(val, ""));
            }
        }

        const clean = messages.filter(Boolean);
        if (clean.length > 0) {
            // Deduplicate to avoid repeating identical messages
            return [...new Set(clean)].join(" ");
        }
    }

    return fallback;
}
