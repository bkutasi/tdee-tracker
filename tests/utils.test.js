/**
 * Utils Module Tests
 * Tests for date handling, validation, and utility functions
 */

describe('Utils.formatDate', () => {
    it('formats Date object', () => {
        const date = new Date(2025, 0, 15); // Jan 15, 2025
        expect(Utils.formatDate(date)).toBe('2025-01-15');
    });

    it('formats date string', () => {
        expect(Utils.formatDate('2025-01-15T12:00:00')).toBe('2025-01-15');
    });

    it('pads single digit months and days', () => {
        const date = new Date(2025, 0, 5); // Jan 5, 2025
        expect(Utils.formatDate(date)).toBe('2025-01-05');
    });
});

describe('Utils.parseDate', () => {
    it('parses YYYY-MM-DD format', () => {
        const date = Utils.parseDate('2025-01-15');
        expect(date.getFullYear()).toBe(2025);
        expect(date.getMonth()).toBe(0); // January
        expect(date.getDate()).toBe(15);
    });
});

describe('Utils.getWeekStart', () => {
    it('returns Sunday of the week', () => {
        // Wednesday Jan 15, 2025
        const weekStart = Utils.getWeekStart('2025-01-15');
        expect(Utils.formatDate(weekStart)).toBe('2025-01-12'); // Sunday
    });

    it('returns same date if already Sunday', () => {
        const weekStart = Utils.getWeekStart('2025-01-12');
        expect(Utils.formatDate(weekStart)).toBe('2025-01-12');
    });
});

describe('Utils.getWeekNumber', () => {
    it('calculates week number', () => {
        expect(Utils.getWeekNumber('2025-01-01')).toBe(1);
        expect(Utils.getWeekNumber('2025-01-10')).toBe(2);
    });
});

describe('Utils.getDateRange', () => {
    it('generates array of dates', () => {
        const range = Utils.getDateRange('2025-01-01', '2025-01-03');
        expect(range).toHaveLength(3);
        expect(range[0]).toBe('2025-01-01');
        expect(range[1]).toBe('2025-01-02');
        expect(range[2]).toBe('2025-01-03');
    });

    it('handles single day range', () => {
        const range = Utils.getDateRange('2025-01-01', '2025-01-01');
        expect(range).toHaveLength(1);
    });
});

describe('Utils.getDayName', () => {
    it('returns abbreviated day name', () => {
        expect(Utils.getDayName('2025-01-12')).toBe('Sun');
        expect(Utils.getDayName('2025-01-13')).toBe('Mon');
    });
});

describe('Utils.isValidNumber', () => {
    it('returns true for valid numbers', () => {
        expect(Utils.isValidNumber(80)).toBeTrue();
        expect(Utils.isValidNumber(80.5)).toBeTrue();
        expect(Utils.isValidNumber('80')).toBeTrue();
        expect(Utils.isValidNumber(0)).toBeTrue();
    });

    it('returns false for invalid values', () => {
        expect(Utils.isValidNumber(null)).toBeFalse();
        expect(Utils.isValidNumber(undefined)).toBeFalse();
        expect(Utils.isValidNumber('')).toBeFalse();
        expect(Utils.isValidNumber(NaN)).toBeFalse();
        expect(Utils.isValidNumber(Infinity)).toBeFalse();
    });
});

describe('Utils.validateWeight', () => {
    it('validates weights in kg', () => {
        expect(Utils.validateWeight(80, 'kg').valid).toBeTrue();
        expect(Utils.validateWeight(80, 'kg').value).toBe(80);
    });

    it('rejects out of range values', () => {
        expect(Utils.validateWeight(10, 'kg').valid).toBeFalse();
        expect(Utils.validateWeight(400, 'kg').valid).toBeFalse();
    });

    it('validates weights in lb', () => {
        expect(Utils.validateWeight(176, 'lb').valid).toBeTrue();
        expect(Utils.validateWeight(30, 'lb').valid).toBeFalse();
    });
});

describe('Utils.validateCalories', () => {
    it('validates calorie values', () => {
        expect(Utils.validateCalories(1600).valid).toBeTrue();
        expect(Utils.validateCalories(1600).value).toBe(1600);
    });

    it('rounds calorie values', () => {
        expect(Utils.validateCalories(1600.7).value).toBe(1601);
    });

    it('rejects invalid values', () => {
        expect(Utils.validateCalories(-100).valid).toBeFalse();
        expect(Utils.validateCalories(20000).valid).toBeFalse();
    });
});

describe('Utils.debounce', () => {
    it('delays function execution', (done) => {
        let count = 0;
        const debounced = Utils.debounce(() => count++, 50);

        debounced();
        debounced();
        debounced();

        expect(count).toBe(0); // Not called yet

        setTimeout(() => {
            expect(count).toBe(1); // Called once after delay
            done();
        }, 100);
    });
});

describe('Utils.generateId', () => {
    it('generates unique IDs', () => {
        const id1 = Utils.generateId();
        const id2 = Utils.generateId();
        expect(id1).not.toBe(id2);
    });

    it('returns string', () => {
        expect(typeof Utils.generateId()).toBe('string');
    });
});

describe('Utils.deepClone', () => {
    it('creates independent copy', () => {
        const original = { a: 1, b: { c: 2 } };
        const clone = Utils.deepClone(original);

        clone.b.c = 99;
        expect(original.b.c).toBe(2); // Original unchanged
    });
});

describe('Utils.formatNumber', () => {
    it('formats with locale separators', () => {
        // Result depends on locale, just check it works
        const formatted = Utils.formatNumber(1000);
        expect(typeof formatted).toBe('string');
    });

    it('handles null gracefully', () => {
        expect(Utils.formatNumber(null)).toBe('-');
    });
});
