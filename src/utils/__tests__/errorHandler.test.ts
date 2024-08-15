import crypto from 'crypto';

export function generateUniqueId(): string {
    return crypto.randomUUID();
}

/**
 * Truncates a string to a maximum length, adding "..." if it's too long.
 * @param str - The string to truncate.
 * @param maxLength - The maximum length of the truncated string.
 * @returns The truncated string.
 */
export function truncateString(str: string | undefined, maxLength: number): string {
    if (!str) return ''; // Handle undefined or null strings
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}



export function isValidUrl(string: string): boolean {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

export function sanitizeInput(input: string): string {
    // Basic sanitization, remove HTML tags
    return input.replace(/<[^>]*>?/gm, '');
}

export function formatDate(date: Date): string {
    return date.toISOString();
}