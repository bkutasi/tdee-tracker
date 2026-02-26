/**
 * Utils Date Handling Tests
 * Tests for parseDate, formatDate type safety and edge cases
 * 
 * Known issues being tested:
 * - parseDate() receives Date objects when it expects strings
 * - Inconsistent date type handling (strings vs Date objects)
 * - Timezone handling (CET/CEST issues)
 */

describe('Utils.parseDate Type Safety', () => {
    
    // Positive: String input (expected usage)
    it('parses YYYY-MM-DD string correctly', () => {
        const result = Utils.parseDate('2026-02-26');
        expect(result instanceof Date).toBeTrue();
        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(1); // February (0-indexed)
        expect(result.getDate()).toBe(26);
    });

    // Negative: Date object input (common bug source)
    it('handles Date object input without throwing', () => {
        const date = new Date('2026-02-26T12:00:00Z');
        // Should not throw "Cannot read properties of undefined (reading 'split')"
        const result = Utils.parseDate(date);
        // Current behavior: returns fallback (current date) because typeof date !== 'string'
        expect(result instanceof Date).toBeTrue();
    });

    // Negative: null input
    it('handles null input gracefully', () => {
        const result = Utils.parseDate(null);
        expect(result instanceof Date).toBeTrue();
        // Returns current date as fallback
    });

    // Negative: undefined input
    it('handles undefined input gracefully', () => {
        const result = Utils.parseDate(undefined);
        expect(result instanceof Date).toBeTrue();
        // Returns current date as fallback
    });

    // Negative: empty string
    it('handles empty string gracefully', () => {
        const result = Utils.parseDate('');
        expect(result instanceof Date).toBeTrue();
        // Returns current date as fallback
    });

    // Negative: invalid string format
    it('handles invalid string format gracefully', () => {
        const result = Utils.parseDate('not-a-date');
        // Will try to split and parse, results in Invalid Date
        expect(result instanceof Date).toBeTrue();
        expect(isNaN(result.getTime())).toBeTrue();
    });

    // Negative: wrong date format (MM-DD-YYYY instead of YYYY-MM-DD)
    it('handles MM-DD-YYYY format incorrectly (known limitation)', () => {
        const result = Utils.parseDate('02-26-2026');
        // This will parse as year=2, month=25, day=26 -> Invalid Date
        expect(result instanceof Date).toBeTrue();
        expect(isNaN(result.getTime())).toBeTrue();
    });

    // Edge case: timezone handling
    it('parses date at midnight local time', () => {
        const result = Utils.parseDate('2026-02-26');
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
    });
});

describe('Utils.formatDate Type Safety', () => {
    
    // Positive: Date object input (expected usage)
    it('formats Date object correctly', () => {
        const date = new Date(2026, 1, 26); // Feb 26, 2026
        const result = Utils.formatDate(date);
        expect(result).toBe('2026-02-26');
    });

    // Positive: string input (also supported)
    it('formats date string correctly', () => {
        const result = Utils.formatDate('2026-02-26T12:00:00Z');
        expect(result).toBe('2026-02-26');
    });

    // Negative: null input
    it('handles null input gracefully', () => {
        const result = Utils.formatDate(null);
        expect(result).toBe('');
    });

    // Negative: undefined input
    it('handles undefined input gracefully', () => {
        const result = Utils.formatDate(undefined);
        expect(result).toBe('');
    });

    // Negative: empty string
    it('handles empty string gracefully', () => {
        const result = Utils.formatDate('');
        expect(result).toBe('');
    });

    // Edge case: single digit month/day padding
    it('pads single digit months and days', () => {
        const date = new Date(2026, 0, 5); // Jan 5, 2026
        const result = Utils.formatDate(date);
        expect(result).toBe('2026-01-05');
    });

    // Edge case: timezone consistency
    it('formats date in local timezone', () => {
        // Create date at UTC midnight
        const date = new Date(Date.UTC(2026, 1, 26, 0, 0, 0));
        const result = Utils.formatDate(date);
        // Result depends on local timezone - just verify it's a valid format
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe('Utils.parseDate + formatDate Round Trip', () => {
    
    // Positive: round-trip preserves date
    it('round-trip preserves date value', () => {
        const original = '2026-02-26';
        const date = Utils.parseDate(original);
        const formatted = Utils.formatDate(date);
        expect(formatted).toBe(original);
    });

    // Edge case: round-trip with different input formats
    it('round-trip works with ISO string', () => {
        const original = '2026-02-26';
        const date = Utils.parseDate(original + 'T12:00:00Z');
        const formatted = Utils.formatDate(date);
        expect(formatted).toBe(original);
    });
});

describe('Utils.getWeekStart Type Safety', () => {
    
    // Positive: string input
    it('handles string date input', () => {
        // Wednesday Jan 15, 2025
        const weekStart = Utils.getWeekStart('2025-01-15');
        expect(Utils.formatDate(weekStart)).toBe('2025-01-13'); // Monday
    });

    // Positive: Date object input
    it('handles Date object input', () => {
        const date = new Date(2025, 0, 15); // Jan 15, 2025
        const weekStart = Utils.getWeekStart(date);
        expect(Utils.formatDate(weekStart)).toBe('2025-01-13'); // Monday
    });

    // Edge case: date already at week start (Monday)
    it('returns same date if already Monday', () => {
        const weekStart = Utils.getWeekStart('2025-01-13');
        expect(Utils.formatDate(weekStart)).toBe('2025-01-13');
    });

    // Edge case: Sunday should return previous Monday
    it('returns previous Monday for Sunday', () => {
        const weekStart = Utils.getWeekStart('2025-01-12'); // Sunday
        expect(Utils.formatDate(weekStart)).toBe('2025-01-06'); // Previous Monday
    });
});

describe('Utils.getDateRange Type Safety', () => {
    
    // Positive: valid range
    it('generates array of dates for valid range', () => {
        const range = Utils.getDateRange('2025-01-01', '2025-01-03');
        expect(range).toHaveLength(3);
        expect(range[0]).toBe('2025-01-01');
        expect(range[1]).toBe('2025-01-02');
        expect(range[2]).toBe('2025-01-03');
    });

    // Positive: single day range
    it('handles single day range', () => {
        const range = Utils.getDateRange('2025-01-01', '2025-01-01');
        expect(range).toHaveLength(1);
        expect(range[0]).toBe('2025-01-01');
    });

    // Negative: start > end (edge case)
    it('returns empty array when start > end', () => {
        const range = Utils.getDateRange('2025-01-03', '2025-01-01');
        expect(range).toHaveLength(0);
    });

    // Edge case: large range
    it('handles multi-month range', () => {
        const range = Utils.getDateRange('2025-01-01', '2025-03-31');
        // Jan (31) + Feb (28 in 2025) + Mar (31) = 90 days
        expect(range).toHaveLength(90);
    });
});

describe('Utils.getDayName Type Safety', () => {
    
    // Positive: string input
    it('returns day name for string date', () => {
        expect(Utils.getDayName('2025-01-12')).toBe('Sun');
        expect(Utils.getDayName('2025-01-13')).toBe('Mon');
    });

    // Positive: Date object input
    it('returns day name for Date object', () => {
        const date = new Date(2025, 0, 12); // Sunday
        expect(Utils.getDayName(date)).toBe('Sun');
    });
});
