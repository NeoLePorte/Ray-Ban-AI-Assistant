import crypto from 'crypto';

export function generateUniqueId(): string {
    return crypto.randomUUID();
}

export function truncateString(str: string, maxLength: number): string {
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
