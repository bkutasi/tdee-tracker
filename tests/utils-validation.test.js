/**
 * Utils Validation Result Structure Tests
 * Tests for validateDateFormat, validateDateRange result patterns
 * 
 * Known issues being tested:
 * - validateDateRange() returns nested structure { success: true, data: { start, end } }
 * - Inconsistent access patterns (result.data.start vs result.start)
 * - Error code consistency
 */

describe('Utils.validateDateFormat Result Structure', () => {
    
    // Positive: valid date returns success structure
    it('returns { success: true, data: Date } for valid date', () => {
        const result = Utils.validateDateFormat('2026-02-26');
        expect(result.success).toBeTrue();
        expect(result.data instanceof Date).toBeTrue();
        expect(result.data.getFullYear()).toBe(2026);
        expect(result.data.getMonth()).toBe(1); // February
        expect(result.data.getDate()).toBe(26);
    });

    // Positive: data property contains parsed Date
    it('data property is accessible via result.data', () => {
        const result = Utils.validateDateFormat('2026-02-26');
        // Correct usage: result.data
        expect(result.data).toBeDefined();
        expect(result.data instanceof Date).toBeTrue();
        // Incorrect usage: result.start should be undefined
        expect(result.start).toBeUndefined();
    });

    // Negative: null input returns error structure
    it('returns { success: false, error, code } for null', () => {
        const result = Utils.validateDateFormat(null);
        expect(result.success).toBeFalse();
        expect(result.error).toBeDefined();
        expect(result.code).toBe('MISSING_INPUT');
        expect(result.data).toBeUndefined();
    });

    // Negative: undefined input returns error structure
    it('returns error for undefined', () => {
        const result = Utils.validateDateFormat(undefined);
        expect(result.success).toBeFalse();
        expect(result.code).toBe('MISSING_INPUT');
    });

    // Negative: empty string returns error structure
    it('returns error for empty string', () => {
        const result = Utils.validateDateFormat('');
        expect(result.success).toBeFalse();
        expect(result.code).toBe('MISSING_INPUT');
    });

    // Negative: invalid format returns specific error code
    it('returns INVALID_FORMAT for wrong format', () => {
        const result = Utils.validateDateFormat('02-26-2026'); // MM-DD-YYYY
        expect(result.success).toBeFalse();
        expect(result.code).toBe('INVALID_FORMAT');
        expect(result.error).toContain('YYYY-MM-DD');
    });

    // Negative: invalid date returns specific error code
    it('returns INVALID_DATE for impossible date', () => {
        const result = Utils.validateDateFormat('2026-13-45'); // Month 13, day 45
        expect(result.success).toBeFalse();
        expect(result.code).toBe('INVALID_DATE');
    });

    // Edge case: date with time component (should still work)
    it('handles ISO string with time component', () => {
        const result = Utils.validateDateFormat('2026-02-26T12:00:00Z');
        // Pattern requires exact YYYY-MM-DD, so this should fail
        expect(result.success).toBeFalse();
        expect(result.code).toBe('INVALID_FORMAT');
    });
});

describe('Utils.validateDateRange Result Structure', () => {
    
    // Positive: valid range returns nested data structure
    it('returns { success: true, data: { start, end, days } }', () => {
        const result = Utils.validateDateRange('2026-01-01', '2026-01-31');
        expect(result.success).toBeTrue();
        
        // Nested structure - data contains start, end, days
        expect(result.data).toBeDefined();
        expect(result.data.start instanceof Date).toBeTrue();
        expect(result.data.end instanceof Date).toBeTrue();
        expect(typeof result.data.days).toBe('number');
        
        // Verify day count
        expect(result.data.days).toBe(30);
    });

    // Positive: correct usage accesses result.data.start
    it('correct usage: result.data.start and result.data.end', () => {
        const result = Utils.validateDateRange('2026-01-01', '2026-01-31');
        // Correct: nested access
        expect(result.data.start).toBeDefined();
        expect(result.data.end).toBeDefined();
        
        // Incorrect: direct access should be undefined
        expect(result.start).toBeUndefined();
        expect(result.end).toBeUndefined();
    });

    // Positive: start and end are Date objects
    it('data.start and data.end are Date objects', () => {
        const result = Utils.validateDateRange('2026-02-26', '2026-02-28');
        expect(result.data.start instanceof Date).toBeTrue();
        expect(result.data.end instanceof Date).toBeTrue();
        expect(Utils.formatDate(result.data.start)).toBe('2026-02-26');
        expect(Utils.formatDate(result.data.end)).toBe('2026-02-28');
    });

    // Negative: missing start date
    it('returns MISSING_INPUT for null start date', () => {
        const result = Utils.validateDateRange(null, '2026-01-31');
        expect(result.success).toBeFalse();
        expect(result.code).toBe('MISSING_INPUT');
    });

    // Negative: missing end date
    it('returns MISSING_INPUT for null end date', () => {
        const result = Utils.validateDateRange('2026-01-01', null);
        expect(result.success).toBeFalse();
        expect(result.code).toBe('MISSING_INPUT');
    });

    // Negative: both dates missing
    it('returns MISSING_INPUT for both dates null', () => {
        const result = Utils.validateDateRange(null, null);
        expect(result.success).toBeFalse();
        expect(result.code).toBe('MISSING_INPUT');
    });

    // Negative: start > end
    it('returns INVALID_RANGE when start > end', () => {
        const result = Utils.validateDateRange('2026-01-31', '2026-01-01');
        expect(result.success).toBeFalse();
        expect(result.code).toBe('INVALID_RANGE');
        expect(result.error).toContain('Start date must be before end date');
    });

    // Negative: range exceeds default max (2 years)
    it('returns RANGE_EXCEEDED for range > 2 years', () => {
        const result = Utils.validateDateRange('2020-01-01', '2026-01-01');
        expect(result.success).toBeFalse();
        expect(result.code).toBe('RANGE_EXCEEDED');
        expect(result.error).toContain('maximum of 730 days');
    });

    // Positive: custom maxDays parameter
    it('accepts custom maxDays parameter', () => {
        // 10 day range with 7 day max
        const result = Utils.validateDateRange('2026-01-01', '2026-01-10', 7);
        expect(result.success).toBeFalse();
        expect(result.code).toBe('RANGE_EXCEEDED');
    });

    // Positive: same day is valid
    it('accepts same day for start and end', () => {
        const result = Utils.validateDateRange('2026-02-26', '2026-02-26');
        expect(result.success).toBeTrue();
        expect(result.data.days).toBe(0);
    });

    // Edge case: consecutive days
    it('calculates days correctly for consecutive days', () => {
        const result = Utils.validateDateRange('2026-01-01', '2026-01-02');
        expect(result.data.days).toBe(1);
    });

    // Edge case: leap year handling
    it('handles leap year correctly', () => {
        // 2024 is a leap year
        const result = Utils.validateDateRange('2024-02-28', '2024-03-01');
        expect(result.data.days).toBe(2); // Feb 28, Feb 29, Mar 1
    });
});

describe('Utils.validateWeight Result Structure', () => {
    
    // Positive: valid weight returns success with data
    it('returns { success: true, data: number } for valid weight', () => {
        const result = Utils.validateWeight(80, 'kg');
        expect(result.success).toBeTrue();
        expect(result.data).toBe(80);
        expect(typeof result.data).toBe('number');
    });

    // Negative: invalid input returns error
    it('returns INVALID_INPUT for non-numeric value', () => {
        const result = Utils.validateWeight('invalid', 'kg');
        expect(result.success).toBeFalse();
        expect(result.code).toBe('INVALID_INPUT');
    });

    // Negative: out of range returns specific error
    it('returns OUT_OF_RANGE for weight below minimum', () => {
        const result = Utils.validateWeight(10, 'kg');
        expect(result.success).toBeFalse();
        expect(result.code).toBe('OUT_OF_RANGE');
        expect(result.error).toContain('between 20 and 300');
    });

    // Negative: out of range (above max)
    it('returns OUT_OF_RANGE for weight above maximum', () => {
        const result = Utils.validateWeight(400, 'kg');
        expect(result.success).toBeFalse();
        expect(result.code).toBe('OUT_OF_RANGE');
    });

    // Positive: pounds unit
    it('validates weight in pounds', () => {
        const result = Utils.validateWeight(176, 'lb');
        expect(result.success).toBeTrue();
        expect(result.data).toBe(176);
    });

    // Negative: pounds out of range
    it('returns OUT_OF_RANGE for pounds below minimum', () => {
        const result = Utils.validateWeight(30, 'lb');
        expect(result.success).toBeFalse();
        expect(result.code).toBe('OUT_OF_RANGE');
    });
});

describe('Utils.validateCalories Result Structure', () => {
    
    // Positive: valid calories returns success with data
    it('returns { success: true, data: number } for valid calories', () => {
        const result = Utils.validateCalories(1600);
        expect(result.success).toBeTrue();
        expect(result.data).toBe(1600);
    });

    // Positive: rounds calorie values
    it('rounds calorie values to nearest integer', () => {
        const result = Utils.validateCalories(1600.7);
        expect(result.data).toBe(1601);
    });

    // Negative: invalid input returns error
    it('returns INVALID_INPUT for non-numeric value', () => {
        const result = Utils.validateCalories('invalid');
        expect(result.success).toBeFalse();
        expect(result.code).toBe('INVALID_INPUT');
    });

    // Negative: negative calories
    it('returns OUT_OF_RANGE for negative calories', () => {
        const result = Utils.validateCalories(-100);
        expect(result.success).toBeFalse();
        expect(result.code).toBe('OUT_OF_RANGE');
    });

    // Negative: excessive calories
    it('returns OUT_OF_RANGE for excessive calories', () => {
        const result = Utils.validateCalories(20000);
        expect(result.success).toBeFalse();
        expect(result.code).toBe('OUT_OF_RANGE');
        expect(result.error).toContain('between 0 and 15000');
    });
});

describe('Utils.success and Utils.error Helpers', () => {
    
    // Positive: success helper creates correct structure
    it('success(data) creates { success: true, data }', () => {
        const result = Utils.success(42);
        expect(result.success).toBeTrue();
        expect(result.data).toBe(42);
    });

    // Positive: success with object data
    it('success with object preserves structure', () => {
        const data = { start: new Date(), end: new Date(), days: 30 };
        const result = Utils.success(data);
        expect(result.success).toBeTrue();
        expect(result.data).toEqual(data);
    });

    // Positive: error helper creates correct structure
    it('error(message, code) creates { success: false, error, code }', () => {
        const result = Utils.error('Something went wrong', 'TEST_ERROR');
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Something went wrong');
        expect(result.code).toBe('TEST_ERROR');
    });

    // Positive: error with default code
    it('error without code uses default ERROR', () => {
        const result = Utils.error('Generic error');
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Generic error');
        expect(result.code).toBe('ERROR');
    });
});

describe('Integration: Validation Result Access Patterns', () => {
    
    // This test documents the correct way to access validation results
    it('documents correct result access pattern', () => {
        // Step 1: Check success
        const result = Utils.validateDateRange('2026-01-01', '2026-01-31');
        expect(result.success).toBeTrue();
        
        // Step 2: Access data (nested structure)
        expect(result.data).toBeDefined();
        
        // Step 3: Access specific properties
        const startDate = result.data.start;
        const endDate = result.data.end;
        const days = result.data.days;
        
        expect(startDate instanceof Date).toBeTrue();
        expect(endDate instanceof Date).toBeTrue();
        expect(typeof days).toBe('number');
    });

    // This test verifies error result access pattern
    it('documents error result access pattern', () => {
        const result = Utils.validateDateRange(null, '2026-01-31');
        expect(result.success).toBeFalse();
        
        // Access error information
        expect(result.error).toBeDefined();
        expect(result.code).toBeDefined();
        
        // data should not exist on error results
        expect(result.data).toBeUndefined();
    });
});
