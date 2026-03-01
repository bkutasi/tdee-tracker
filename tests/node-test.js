#!/usr/bin/env node
/**
 * Node.js test runner for quick verification
 * Run with: node tests/node-test.js
 */

// Simple test harness for Node.js
let passed = 0;
let failed = 0;

function expect(actual) {
    const isNot = {
        toBe(expected) {
            if (actual === expected) throw new Error(`Expected not ${expected}, but got ${actual}`);
        },
        toBeNull() {
            if (actual === null) throw new Error(`Expected not null, but got ${actual}`);
        },
        toContain(item) {
            if (!Array.isArray(actual)) throw new Error(`Expected array, got ${typeof actual}`);
            if (actual.includes(item)) throw new Error(`Expected ${JSON.stringify(actual)} not to contain ${JSON.stringify(item)}`);
        }
    };
    
    return {
        toBe(expected) {
            if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
        },
        toBeCloseTo(expected, precision = 2) {
            const factor = Math.pow(10, precision);
            if (Math.round(actual * factor) !== Math.round(expected * factor)) {
                throw new Error(`Expected ${expected} (±${1 / factor}), got ${actual}`);
            }
        },
        toBeNull() {
            if (actual !== null) throw new Error(`Expected null, got ${actual}`);
        },
        toBeTrue() {
            if (actual !== true) throw new Error(`Expected true, got ${actual}`);
        },
        toBeFalse() {
            if (actual !== false) throw new Error(`Expected false, got ${actual}`);
        },
        toBeUndefined() {
            if (actual !== undefined) throw new Error(`Expected undefined, got ${actual}`);
        },
        toBeDefined() {
            if (actual === undefined) throw new Error(`Expected defined, got ${actual}`);
        },
        toHaveLength(length) {
            if (!Array.isArray(actual)) throw new Error(`Expected array, got ${typeof actual}`);
            if (actual.length !== length) throw new Error(`Expected length ${length}, got ${actual.length}`);
        },
        toContain(item) {
            if (!Array.isArray(actual)) throw new Error(`Expected array, got ${typeof actual}`);
            if (!actual.includes(item)) throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
        },
        toBeGreaterThan(expected) {
            if (!(actual > expected)) throw new Error(`Expected ${actual} > ${expected}`);
        },
        toBeGreaterThanOrEqual(expected) {
            if (!(actual >= expected)) throw new Error(`Expected ${actual} >= ${expected}`);
        },
        toMatch(pattern) {
            if (!pattern.test(actual)) throw new Error(`Expected ${actual} to match ${pattern}`);
        },
        toEqual(expected) {
            // Simple deep equality check via JSON stringify
            const actualStr = JSON.stringify(actual);
            const expectedStr = JSON.stringify(expected);
            if (actualStr !== expectedStr) throw new Error(`Expected ${expectedStr}, got ${actualStr}`);
        },
        get not() {
            return isNot;
        }
    };
}

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`✓ ${name}`);
    } catch (e) {
        failed++;
        console.log(`✗ ${name}`);
        console.log(`  ${e.message}`);
    }
}

// Load modules
// Note: Storage expects Utils as global (browser pattern), so attach to global first
const Calculator = require('../js/calculator.js');
const Utils = require('../js/utils.js');
global.Utils = Utils;  // Make Utils available as global for storage.js
const Storage = require('../js/storage.js');

console.log('\n=== Calculator Tests ===\n');

test('round handles floating point precision', () => {
    expect(Calculator.round(0.1 + 0.2, 2)).toBe(0.3);
});

test('EWMA returns current when no previous', () => {
    expect(Calculator.calculateEWMA(82.5, null)).toBe(82.5);
});

test('EWMA applies 0.3/0.7 smoothing', () => {
    expect(Calculator.calculateEWMA(82, 80)).toBe(80.6);
});

test('EWMA matches Excel progression', () => {
    let ewma = Calculator.calculateEWMA(82.0, null);
    ewma = Calculator.calculateEWMA(82.6, ewma);
    expect(ewma).toBeCloseTo(82.18, 2);
});

test('TDEE calculated from weight loss', () => {
    const tdee = Calculator.calculateTDEE({
        avgCalories: 1600,
        weightDelta: -0.5,
        trackedDays: 7,
        unit: 'kg'
    });
    expect(tdee).toBe(2151);
});

test('TDEE calculated from weight gain', () => {
    const tdee = Calculator.calculateTDEE({
        avgCalories: 2500,
        weightDelta: 0.3,
        trackedDays: 7,
        unit: 'kg'
    });
    expect(tdee).toBe(2169);
});

test('TDEE returns null for zero tracked days', () => {
    const tdee = Calculator.calculateTDEE({
        avgCalories: 1600,
        weightDelta: -0.5,
        trackedDays: 0,
        unit: 'kg'
    });
    expect(tdee).toBeNull();
});

test('Rolling TDEE calculates average', () => {
    const weeklyData = [{ tdee: 2000 }, { tdee: 2100 }, { tdee: 1900 }, { tdee: 2050 }];
    expect(Calculator.calculateRollingTDEE(weeklyData, 4)).toBe(2013);
});

test('Daily target with deficit', () => {
    expect(Calculator.calculateDailyTarget(2000, -0.2)).toBe(1600);
});

test('Weight conversion kg to lb', () => {
    expect(Calculator.convertWeight(80, 'kg', 'lb')).toBeCloseTo(176.37, 2);
});

test('mround to nearest 10', () => {
    expect(Calculator.mround(1847)).toBe(1850);
});

console.log('\n=== Utils Tests ===\n');

test('formatDate formats correctly', () => {
    const date = new Date(2025, 0, 15);
    expect(Utils.formatDate(date)).toBe('2025-01-15');
});

test('getDateRange generates dates', () => {
    const range = Utils.getDateRange('2025-01-01', '2025-01-03');
    expect(range.length).toBe(3);
});

test('validateWeight accepts valid kg', () => {
    const result = Utils.validateWeight(80, 'kg');
    expect(result.success).toBe(true);
    expect(result.data).toBe(80);
});

test('validateCalories accepts valid values', () => {
    const result = Utils.validateCalories(1600);
    expect(result.success).toBe(true);
    expect(result.data).toBe(1600);
});

test('validateWeight rejects invalid values', () => {
    const result = Utils.validateWeight('invalid', 'kg');
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_INPUT');
});

test('validateWeight rejects out of range', () => {
    const result = Utils.validateWeight(5, 'kg');
    expect(result.success).toBe(false);
    expect(result.code).toBe('OUT_OF_RANGE');
});

test('validateCalories rejects out of range', () => {
    const result = Utils.validateCalories(20000);
    expect(result.success).toBe(false);
    expect(result.code).toBe('OUT_OF_RANGE');
});

test('success helper creates correct result', () => {
    const result = Utils.success(42);
    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
});

test('error helper creates correct result', () => {
    const result = Utils.error('Something went wrong', 'TEST_ERROR');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Something went wrong');
    expect(result.code).toBe('TEST_ERROR');
});

console.log('\n=== Storage Sanitization Tests ===\n');

test('sanitizeString removes HTML tags', () => {
    expect(Storage.sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
});

test('sanitizeString removes angle brackets', () => {
    // Proper sanitization removes entire tags, not just brackets
    expect(Storage.sanitizeString('Hello <b>world</b>')).toBe('Hello world');
});

test('sanitizeString handles null/undefined', () => {
    expect(Storage.sanitizeString(null)).toBe('');
    expect(Storage.sanitizeString(undefined)).toBe('');
});

test('sanitizeString handles non-string types', () => {
    expect(Storage.sanitizeString(123)).toBe('');
    expect(Storage.sanitizeString({})).toBe('');
});

test('sanitizeString trims whitespace', () => {
    expect(Storage.sanitizeString('  hello world  ')).toBe('hello world');
});

test('sanitizeEntry sanitizes notes field', () => {
    const entry = {
        weight: 80.5,
        calories: 1600,
        notes: '<script>malicious</script>bad notes'
    };
    const sanitized = Storage.sanitizeEntry(entry);
    // Proper sanitization removes entire script tags
    expect(sanitized.notes).toBe('maliciousbad notes');
    expect(sanitized.weight).toBe(80.5);
    expect(sanitized.calories).toBe(1600);
});

test('importData sanitizes imported entries', () => {
    // Note: This test requires browser environment (localStorage)
    // Skipped in Node.js environment
    if (typeof localStorage === 'undefined') {
        return; // Skip in Node.js
    }
    
    const maliciousData = {
        entries: {
            '2025-01-15': {
                weight: 80,
                calories: 1600,
                notes: '<img src=x onerror=alert(1)>XSS attack'
            }
        }
    };
    const result = Storage.importData(maliciousData);
    expect(result.success).toBe(true);
    
    // Verify the notes were sanitized (entire img tag removed)
    const entry = Storage.getEntry('2025-01-15');
    expect(entry.notes).toBe('XSS attack');
});

console.log('\n=== TDEE Sanity Check Tests ===\n');

// Scenario 1: Maintenance - eating at TDEE, weight stable
test('Sanity: maintenance calories = stable weight → TDEE equals intake', () => {
    // If eating 2000 cal/day and weight stays same after 7 days
    const tdee = Calculator.calculateTDEE({
        avgCalories: 2000,
        weightDelta: 0,  // No change
        trackedDays: 7,
        unit: 'kg'
    });
    expect(tdee).toBe(2000);
});

// Scenario 2: Aggressive deficit - losing 1kg/week
test('Sanity: 1600 cal + losing 1kg/week → TDEE ~2700', () => {
    // 1kg = 7716 cal deficit over 7 days = 1102/day deficit
    // TDEE = 1600 + 1102 = 2702
    const tdee = Calculator.calculateTDEE({
        avgCalories: 1600,
        weightDelta: -1,
        trackedDays: 7,
        unit: 'kg'
    });
    expect(tdee).toBe(2702);
});

// Scenario 3: Moderate deficit - losing 0.5kg/week
test('Sanity: 1800 cal + losing 0.5kg/week → TDEE ~2350', () => {
    const tdee = Calculator.calculateTDEE({
        avgCalories: 1800,
        weightDelta: -0.5,
        trackedDays: 7,
        unit: 'kg'
    });
    expect(tdee).toBe(2351);
});

// Scenario 4: Bulk - gaining weight
test('Sanity: 3000 cal + gaining 0.25kg/week → TDEE ~2725', () => {
    const tdee = Calculator.calculateTDEE({
        avgCalories: 3000,
        weightDelta: 0.25,
        trackedDays: 7,
        unit: 'kg'
    });
    expect(tdee).toBe(2724);
});

// Scenario 5: Real data from import - Week 1 (Nov 16-22)
test('Sanity: Real data week 1 - starting weight', () => {
    // Week 1: weights 82.0→81.1, calories avg ~1643
    // Delta = 81.1 - 82.0 = -0.9kg, but this is first week
    // For first week, use EWMA endpoint to endpoint
    const tdee = Calculator.calculateTDEE({
        avgCalories: 1643,
        weightDelta: -0.9,
        trackedDays: 7,
        unit: 'kg'
    });
    // TDEE = 1643 + (0.9 * 7716 / 7) = 1643 + 992 = 2635
    expect(tdee).toBe(2635);
});

// Scenario 6: Partial week tracking (5 days)
test('Sanity: Partial week 5 days tracked - adjusted correctly', () => {
    const tdee = Calculator.calculateTDEE({
        avgCalories: 1600,
        weightDelta: -0.5,
        trackedDays: 5,  // Only 5 days tracked
        unit: 'kg'
    });
    // TDEE = 1600 + (0.5 * 7716 / 5) = 1600 + 771.6 = 2372
    expect(tdee).toBe(2372);
});

// Scenario 7: Using pounds
test('Sanity: pounds - 1500 cal + losing 2lb/week → TDEE ~2500', () => {
    const tdee = Calculator.calculateTDEE({
        avgCalories: 1500,
        weightDelta: -2,
        trackedDays: 7,
        unit: 'lb'
    });
    // TDEE = 1500 + (2 * 3500 / 7) = 1500 + 1000 = 2500
    expect(tdee).toBe(2500);
});

// Scenario 8: Activity change - increased cardio should show lower TDEE from same food
test('Sanity: Adding cardio - same intake but faster weight loss → higher TDEE', () => {
    // Week without cardio: 1600 cal, -0.3kg loss
    const tdeeNoCardio = Calculator.calculateTDEE({
        avgCalories: 1600,
        weightDelta: -0.3,
        trackedDays: 7,
        unit: 'kg'
    });

    // Week with cardio: 1600 cal, -0.6kg loss (burning more)
    const tdeeWithCardio = Calculator.calculateTDEE({
        avgCalories: 1600,
        weightDelta: -0.6,
        trackedDays: 7,
        unit: 'kg'
    });

    // TDEE with cardio should be higher
    if (tdeeWithCardio <= tdeeNoCardio) {
        throw new Error(`Expected TDEE with cardio (${tdeeWithCardio}) > without (${tdeeNoCardio})`);
    }
});

console.log('\n=== Robust TDEE Tests ===\n');

test('EWMA weight delta smooths daily noise', () => {
    // Simulating noisy but overall flat weight
    const entries = [
        { date: '2025-01-01', weight: 80, calories: 1600 },
        { date: '2025-01-02', weight: 81.5, calories: 1700 }, // spike
        { date: '2025-01-03', weight: 79.5, calories: 1600 }, // dip
        { date: '2025-01-04', weight: 80.5, calories: 1650 },
        { date: '2025-01-05', weight: 80.2, calories: 1600 },
        { date: '2025-01-06', weight: 80.0, calories: 1700 },
        { date: '2025-01-07', weight: 80.3, calories: 1650 },
    ];
    const processed = Calculator.processEntriesWithGaps(entries);
    const delta = Calculator.calculateEWMAWeightDelta(processed);
    // EWMA should smooth out the noise - delta should be near 0
    if (Math.abs(delta) > 0.5) {
        throw new Error(`Expected EWMA delta near 0, got ${delta}`);
    }
});

test('Exclude calorie outliers detects cheat days', () => {
    // Need more data points for std dev to work properly
    const calories = [1600, 1700, 1500, 1650, 1600, 1550, 1620, 4200]; // 4200 is outlier
    const result = Calculator.excludeCalorieOutliers(calories);
    expect(result.outliers.length).toBe(1);
    if (!result.outliers.includes(4200)) {
        throw new Error('Expected 4200 to be detected as outlier');
    }
});

test('calculateFastTDEE returns null with insufficient data', () => {
    const entries = [
        { date: '2025-01-01', weight: 80, calories: 1600 },
        { date: '2025-01-02', weight: 80.5, calories: 1700 },
        { date: '2025-01-03', weight: 80.2, calories: null }, // Only 2 calorie days
    ];
    const result = Calculator.calculateFastTDEE(entries, 'kg');
    expect(result.tdee).toBeNull();
    expect(result.neededDays).toBe(2); // Needs 2 more (MIN_TRACKED_DAYS - 2)
});

test('calculateFastTDEE works with sufficient data', () => {
    const entries = [
        { date: '2025-01-01', weight: 80, calories: 1600 },
        { date: '2025-01-02', weight: 80.3, calories: 1700 },
        { date: '2025-01-03', weight: 80.1, calories: 1600 },
        { date: '2025-01-04', weight: 80.0, calories: 1650 },
        { date: '2025-01-05', weight: 79.8, calories: 1600 },
    ];
    const result = Calculator.calculateFastTDEE(entries, 'kg');
    // Should have a valid TDEE
    if (result.tdee === null) {
        throw new Error('Expected TDEE to be calculated');
    }
    expect(result.confidence).toBe('low'); // 5 days = low (4-6 days per CONFIDENCE_TIERS)
});

test('calculateFastTDEE high confidence with 14+ days', () => {
    // Need 14+ days for high confidence per CONFIDENCE_TIERS
    const entries = [];
    for (let i = 0; i < 14; i++) {
        const date = new Date('2025-01-01');
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        entries.push({
            date: dateStr,
            weight: 80 - (i * 0.1), // Gradual weight loss
            calories: 1600 + (i % 3) * 100 // Vary calories slightly
        });
    }
    const result = Calculator.calculateFastTDEE(entries, 'kg');
    expect(result.confidence).toBe('high');
});

test('calculateStableTDEE detects large gaps and downgrades confidence', () => {
    // 14 days of data with a 4-day gap in weight in the middle
    const entries = [];
    for (let i = 0; i < 14; i++) {
        const date = new Date('2025-01-01');
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        let weight = 80;
        // Create 4-day gap (days 5, 6, 7, 8)
        if (i >= 5 && i <= 8) {
            weight = null;
        }

        entries.push({
            date: dateStr,
            weight: weight,
            calories: 2000
        });
    }

    const result = Calculator.calculateStableTDEE(entries, 'kg', 14, 4);

    // Should have valid TDEE but low confidence due to gap
    if (result.tdee === null) {
        throw new Error('Expected TDEE to be calculated even with gap');
    }

    if (!result.hasLargeGap) {
        throw new Error('Expected hasLargeGap to be true');
    }

    if (result.confidence !== 'low') {
        throw new Error(`Expected low confidence due to gap, got ${result.confidence}`);
    }
});

test('MIN_TRACKED_DAYS constant is exported', () => {
    expect(Calculator.MIN_TRACKED_DAYS).toBe(4);
});

console.log('\n=== Utils Date Type Safety Tests ===\n');

test('parseDate handles string input correctly', () => {
    const result = Utils.parseDate('2026-02-26');
    expect(result instanceof Date).toBe(true);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(26);
});

test('parseDate handles Date object without throwing', () => {
    const date = new Date('2026-02-26');
    const result = Utils.parseDate(date);
    expect(result instanceof Date).toBe(true);
});

test('parseDate handles null gracefully', () => {
    const result = Utils.parseDate(null);
    expect(result instanceof Date).toBe(true);
});

test('parseDate handles undefined gracefully', () => {
    const result = Utils.parseDate(undefined);
    expect(result instanceof Date).toBe(true);
});

test('parseDate handles empty string gracefully', () => {
    const result = Utils.parseDate('');
    expect(result instanceof Date).toBe(true);
});

test('formatDate formats Date object correctly', () => {
    const date = new Date(2026, 1, 26);
    const result = Utils.formatDate(date);
    expect(result).toBe('2026-02-26');
});

test('formatDate handles null gracefully', () => {
    const result = Utils.formatDate(null);
    expect(result).toBe('');
});

test('formatDate handles undefined gracefully', () => {
    const result = Utils.formatDate(undefined);
    expect(result).toBe('');
});

test('validateDateFormat returns success structure', () => {
    const result = Utils.validateDateFormat('2026-02-26');
    expect(result.success).toBe(true);
    expect(result.data instanceof Date).toBe(true);
});

test('validateDateFormat returns error structure for null', () => {
    const result = Utils.validateDateFormat(null);
    expect(result.success).toBe(false);
    expect(result.code).toBe('MISSING_INPUT');
});

test('validateDateFormat returns INVALID_FORMAT for wrong format', () => {
    const result = Utils.validateDateFormat('02-26-2026');
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_FORMAT');
});

test('validateDateRange returns nested data structure', () => {
    const result = Utils.validateDateRange('2026-01-01', '2026-01-31');
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.start instanceof Date).toBe(true);
    expect(result.data.end instanceof Date).toBe(true);
    expect(result.data.days).toBe(30);
});

test('validateDateRange returns MISSING_INPUT for null', () => {
    const result = Utils.validateDateRange(null, '2026-01-31');
    expect(result.success).toBe(false);
    expect(result.code).toBe('MISSING_INPUT');
});

test('validateDateRange returns INVALID_RANGE when start > end', () => {
    const result = Utils.validateDateRange('2026-01-31', '2026-01-01');
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_RANGE');
});

test('validateWeight returns success with data', () => {
    const result = Utils.validateWeight(80, 'kg');
    expect(result.success).toBe(true);
    expect(result.data).toBe(80);
});

test('validateWeight returns OUT_OF_RANGE for invalid value', () => {
    const result = Utils.validateWeight(10, 'kg');
    expect(result.success).toBe(false);
    expect(result.code).toBe('OUT_OF_RANGE');
});

test('validateCalories returns success with data', () => {
    const result = Utils.validateCalories(1600);
    expect(result.success).toBe(true);
    expect(result.data).toBe(1600);
});

test('validateCalories returns OUT_OF_RANGE for excessive value', () => {
    const result = Utils.validateCalories(20000);
    expect(result.success).toBe(false);
    expect(result.code).toBe('OUT_OF_RANGE');
});

console.log('\n=== Storage Migration Tests ===\n');

// Mock localStorage for Node.js
global.localStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
};

test('Storage migration v0 to v1 initializes defaults', () => {
    global.localStorage.clear();
    Storage.init();
    expect(global.localStorage.data.tdee_schema_version).toBe('1');
    expect(global.localStorage.data.tdee_settings).toBeDefined();
});

test('Storage preserves entry structure', () => {
    global.localStorage.clear();
    Storage.init();
    const result = Storage.saveEntry('2026-02-26', { weight: 80.5, calories: 1600, notes: 'Test' });
    expect(result).toBe(true);
    const retrieved = Storage.getEntry('2026-02-26');
    expect(retrieved.weight).toBe(80.5);
    expect(retrieved.calories).toBe(1600);
    expect(retrieved.notes).toBe('Test');
});

test('Storage preserves 91 entries through migration', () => {
    global.localStorage.clear();
    
    // Create 91 entries
    const entries = {};
    for (let i = 0; i < 91; i++) {
        const date = new Date('2026-01-01');
        date.setDate(date.getDate() + i);
        const dateStr = Utils.formatDate(date);
        entries[dateStr] = {
            weight: 80 + (i * 0.1),
            calories: 1600 + (i * 10),
            notes: `Entry ${i + 1}`,
            updatedAt: new Date().toISOString()
        };
    }
    global.localStorage.data.tdee_entries = JSON.stringify(entries);
    global.localStorage.data.tdee_schema_version = '0';
    
    // Run migration
    Storage.init();
    
    // Verify count preserved
    const allEntries = Storage.getAllEntries();
    expect(Object.keys(allEntries).length).toBe(91);
});

test('Storage import preserves entry count', () => {
    global.localStorage.clear();
    Storage.init();
    
    const exportData = {
        version: 1,
        settings: { weightUnit: 'kg' },
        entries: {}
    };
    
    for (let i = 0; i < 50; i++) {
        const date = new Date('2026-01-01');
        date.setDate(date.getDate() + i);
        const dateStr = Utils.formatDate(date);
        exportData.entries[dateStr] = { weight: 80, calories: 1600 };
    }
    
    const result = Storage.importData(exportData);
    expect(result.success).toBe(true);
    expect(result.entriesImported).toBe(50);
});

test('Storage getEntriesInRange validates dates', () => {
    global.localStorage.clear();
    Storage.init();
    
    const result1 = Storage.getEntriesInRange('bad', '2026-01-31');
    expect(result1).toEqual([]);
    
    const result2 = Storage.getEntriesInRange('2026-01-31', '2026-01-01');
    expect(result2).toEqual([]);
});

test('Storage saveEntry validates date format', () => {
    global.localStorage.clear();
    Storage.init();
    
    const result = Storage.saveEntry('invalid-date', { weight: 80 });
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_FORMAT');
});

test('Storage export/import round-trip preserves data', () => {
    global.localStorage.clear();
    Storage.init();
    
    Storage.saveEntry('2026-01-01', { weight: 80, calories: 1600, notes: 'Test' });
    Storage.saveSettings({ weightUnit: 'lb' });
    
    const exported = Storage.exportData();
    
    global.localStorage.clear();
    Storage.init();
    
    const importResult = Storage.importData(exported);
    expect(importResult.success).toBe(true);
    
    const entry = Storage.getEntry('2026-01-01');
    expect(entry.weight).toBe(80);
    
    const settings = Storage.getSettings();
    expect(settings.weightUnit).toBe('lb');
});

console.log('\n=== CSP Compliance Tests ===\n');

// CSP tests (Node.js compatible)
const CSPTests = require('./csp-compliance.test.js');

test('CSP meta tag exists in index.html', () => {
    const cspContent = CSPTests.getCSPContent();
    expect(cspContent.length).toBeGreaterThan(0);
});

test('CSP has default-src directive', () => {
    const directives = CSPTests.getCSPDirectives();
    expect(directives['default-src']).toBeDefined();
});

test('CSP script-src includes self', () => {
    const directives = CSPTests.getCSPDirectives();
    const scriptSrc = directives['script-src'] || [];
    expect(scriptSrc).toContain("'self'");
});

test('CSP script-src includes unsafe-inline', () => {
    const directives = CSPTests.getCSPDirectives();
    const scriptSrc = directives['script-src'] || [];
    expect(scriptSrc).toContain("'unsafe-inline'");
});

test('CSP script-src includes cdn.jsdelivr.net', () => {
    const directives = CSPTests.getCSPDirectives();
    const scriptSrc = directives['script-src'] || [];
    expect(scriptSrc).toContain('https://cdn.jsdelivr.net');
});

test('CSP style-src includes self', () => {
    const directives = CSPTests.getCSPDirectives();
    const styleSrc = directives['style-src'] || [];
    expect(styleSrc).toContain("'self'");
});

test('CSP style-src includes unsafe-inline', () => {
    const directives = CSPTests.getCSPDirectives();
    const styleSrc = directives['style-src'] || [];
    expect(styleSrc).toContain("'unsafe-inline'");
});

test('CSP img-src includes self', () => {
    const directives = CSPTests.getCSPDirectives();
    const imgSrc = directives['img-src'] || [];
    expect(imgSrc).toContain("'self'");
});

test('CSP img-src includes data:', () => {
    const directives = CSPTests.getCSPDirectives();
    const imgSrc = directives['img-src'] || [];
    expect(imgSrc).toContain('data:');
});

test('CSP connect-src includes self', () => {
    const directives = CSPTests.getCSPDirectives();
    const connectSrc = directives['connect-src'] || [];
    expect(connectSrc).toContain("'self'");
});

test('CSP connect-src includes supabase.co', () => {
    const directives = CSPTests.getCSPDirectives();
    const connectSrc = directives['connect-src'] || [];
    expect(connectSrc).toContain('https://*.supabase.co');
});

test('CSP does not use wildcard for script-src', () => {
    const directives = CSPTests.getCSPDirectives();
    const scriptSrc = directives['script-src'] || [];
    expect(scriptSrc).not.toContain('*');
});

test('CSP does not allow unsafe-eval', () => {
    const directives = CSPTests.getCSPDirectives();
    const scriptSrc = directives['script-src'] || [];
    expect(scriptSrc).not.toContain("'unsafe-eval'");
});

test('CSP has at least 4 directive types', () => {
    const directives = CSPTests.getCSPDirectives();
    const directiveCount = Object.keys(directives).length;
    expect(directiveCount).toBeGreaterThanOrEqual(4);
});

console.log('\n=== Sync Module Tests ===\n');

// Mock setup for Sync tests
// Create window mock for Sync module (browser compatibility in Node.js)
global.window = {
    location: {
        hostname: 'localhost',
        protocol: 'file:'
    },
    addEventListener: () => {},
    dispatchEvent: () => {},
    CustomEvent: class { constructor(type, detail) { this.type = type; this.detail = detail; } }
};

const createMockLocalStorage = () => ({
    data: {
        tdee_entries: '{}',
        tdee_settings: '{}',
        tdee_sync_queue: '[]',
        tdee_sync_history: '[]'
    },
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
});

let mockLocalStorage = createMockLocalStorage();
global.localStorage = mockLocalStorage;

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
    writable: true,
    value: true
});

// Mock crypto.randomUUID
if (!global.crypto) {
    global.crypto = {};
}
if (!global.crypto.randomUUID) {
    global.crypto.randomUUID = () => 'mock-uuid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Mock Supabase client
const mockSupabase = {
    from: (table) => ({
        insert: (data) => ({
            select: () => ({
                single: async () => ({
                    data: { ...data, id: 'mock-id-' + Date.now() },
                    error: null
                })
            })
        }),
        update: (data) => ({
            eq: () => ({
                select: () => ({
                    single: async () => ({
                        data,
                        error: null
                    })
                })
            })
        }),
        delete: () => ({
            eq: () => ({
                single: async () => ({ error: null })
            })
        }),
        select: () => ({
            order: () => ({
                data: [],
                error: null
            })
        })
    })
};

// Load Sync module
const Sync = require('../js/sync.js');

// Helper to reset mock state between tests and return fresh Sync module
function resetSyncMocks() {
    mockLocalStorage = createMockLocalStorage();
    global.localStorage = mockLocalStorage;
    global.window.Auth = {
        isAuthenticated: () => true,
        getCurrentUser: () => ({ id: 'test-user-123', email: 'test@example.com' }),
        getSession: async () => ({ session: { user: { id: 'test-user-123' } }, error: null }),
        _getSupabase: () => mockSupabase,
        onAuthStateChange: () => {}
    };
    // Attach Storage to window for Sync module access
    global.window.Storage = Storage;
    
    // Re-require Sync module to reset its internal state
    delete require.cache[require.resolve('../js/sync.js')];
    return require('../js/sync.js');
}

// Initialize mocks
resetSyncMocks();

// Initialize Storage for Sync tests
Storage.init();

test('Sync.queueOperation creates operation with correct structure', () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const operationId = Sync.queueOperation('create', 'weight_entries', { weight: 80, calories: 1600 }, 'local-123');
    
    expect(operationId).toBeDefined();
    const queue = Sync.getQueue();
    expect(queue).toHaveLength(1);
    
    const op = queue[0];
    expect(op.type).toBe('create');
    expect(op.table).toBe('weight_entries');
    expect(op.data.weight).toBe(80);
    expect(op.localId).toBe('local-123');
    expect(op.retries).toBe(0);
});

test('Sync.queueOperation persists to localStorage', () => {
    const Sync = resetSyncMocks();
    
    Sync.queueOperation('create', 'weight_entries', { weight: 80 });
    
    const stored = mockLocalStorage.data.tdee_sync_queue;
    expect(stored).toBeDefined();
    
    const parsed = JSON.parse(stored);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe('create');
});

test('Sync.loadSyncQueue loads from localStorage on init', () => {
    // This test verifies queue persistence through localStorage
    // Setup: Use queueOperation to add items (which saves to localStorage)
    const Sync = resetSyncMocks();
    Sync.init();
    
    Sync.queueOperation('create', 'weight_entries', { weight: 80 });
    Sync.queueOperation('update', 'weight_entries', { weight: 81 });
    
    // Verify queue has 2 items
    expect(Sync.getQueue()).toHaveLength(2);
    
    // Verify localStorage has the data
    const stored = mockLocalStorage.data.tdee_sync_queue;
    expect(JSON.parse(stored)).toHaveLength(2);
    
    // Simulate reload: create new Sync instance that should load from localStorage
    const storedQueue = JSON.parse(stored);
    mockLocalStorage.data.tdee_sync_queue = JSON.stringify(storedQueue);
    
    // Re-require Sync to simulate app restart
    delete require.cache[require.resolve('../js/sync.js')];
    const Sync2 = require('../js/sync.js');
    Sync2.init();
    
    // Verify queue was loaded from localStorage
    expect(Sync2.getQueue()).toHaveLength(2);
});

test('Sync.clearQueue removes all operations', () => {
    const Sync = resetSyncMocks();
    
    Sync.queueOperation('create', 'weight_entries', { weight: 80 });
    Sync.queueOperation('update', 'weight_entries', { weight: 81 });
    
    expect(Sync.getQueue()).toHaveLength(2);
    
    Sync.clearQueue();
    
    expect(Sync.getQueue()).toHaveLength(0);
});

test('Sync.saveWeightEntry saves to LocalStorage immediately', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const entry = {
        date: '2026-02-26',
        weight: 80.5,
        calories: 1600,
        notes: 'Test entry'
    };

    const result = await Sync.saveWeightEntry(entry);

    expect(result.success).toBeTrue();
    const retrieved = Storage.getEntry('2026-02-26');
    expect(retrieved.weight).toBe(80.5);
    expect(retrieved.calories).toBe(1600);
});

test('Sync.saveWeightEntry returns error for missing date', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const entry = { weight: 80, calories: 1600 };

    const result = await Sync.saveWeightEntry(entry);

    expect(result.success).toBeFalse();
    expect(result.error).toBe('Entry must include date field');
});

test('Sync.saveWeightEntry queues sync operation', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const entry = {
        date: '2026-02-27',
        weight: 81,
        calories: 1700
    };

    await Sync.saveWeightEntry(entry);

    const queue = Sync.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('create');
});

test('Sync.updateWeightEntry updates LocalStorage', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600, notes: 'Original' });
    
    const result = await Sync.updateWeightEntry({
        date: '2026-03-01',
        weight: 81,
        calories: 1700,
        notes: 'Updated'
    });

    expect(result.success).toBeTrue();
    const retrieved = Storage.getEntry('2026-03-01');
    expect(retrieved.weight).toBe(81);
    expect(retrieved.calories).toBe(1700);
});

test('Sync.updateWeightEntry queues update operation', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    Storage.saveEntry('2026-03-02', { weight: 80 });
    
    await Sync.updateWeightEntry({
        date: '2026-03-02',
        weight: 81
    });

    const queue = Sync.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('update');
});

test('Sync.deleteWeightEntry deletes from LocalStorage', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    Storage.saveEntry('2026-03-04', { weight: 80 });
    
    const result = await Sync.deleteWeightEntry('2026-03-04');

    expect(result.success).toBeTrue();
    expect(Storage.getEntry('2026-03-04')).toBeNull();
});

test('Sync.deleteWeightEntry queues delete operation', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    Storage.saveEntry('2026-03-05', { weight: 80 });
    
    await Sync.deleteWeightEntry('2026-03-05');

    const queue = Sync.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('delete');
});

test('Sync.mergeEntries combines remote and local data', () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    Storage.saveEntry('2026-03-06', { weight: 80, calories: 1600, updatedAt: '2026-03-06T10:00:00Z' });
    
    const remoteEntries = [
        { date: '2026-03-07', weight: 81, calories: 1700, updated_at: '2026-03-07T10:00:00Z' }
    ];

    const merged = Sync.mergeEntries(remoteEntries);

    expect(merged).toHaveLength(2);
    const dates = merged.map(e => e.date);
    expect(dates).toContain('2026-03-06');
    expect(dates).toContain('2026-03-07');
});

test('Sync.mergeEntries conflict resolution: newest timestamp wins', () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    Storage.saveEntry('2026-03-08', { weight: 80, calories: 1600, updatedAt: '2026-03-08T10:00:00Z' });
    
    const remoteEntries = [
        { 
            date: '2026-03-08', 
            weight: 82, 
            calories: 1800, 
            updated_at: '2026-03-08T15:00:00Z' 
        }
    ];

    const merged = Sync.mergeEntries(remoteEntries);

    const mergedEntry = merged.find(e => e.date === '2026-03-08');
    expect(mergedEntry.weight).toBe(82);
    expect(mergedEntry.calories).toBe(1800);
});

test('Sync.mergeEntries keeps local when local timestamp is newer', () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    // Save entry - it will get current timestamp (2026-03-01)
    Storage.saveEntry('2026-03-09', { weight: 83, calories: 1900 });
    
    // Remote has OLDER timestamp (2025-12-01)
    const remoteEntries = [
        { 
            date: '2026-03-09', 
            weight: 80, 
            calories: 1600, 
            updated_at: '2025-12-01T10:00:00Z' 
        }
    ];

    const merged = Sync.mergeEntries(remoteEntries);

    // Local should win (newer timestamp)
    const mergedEntry = merged.find(e => e.date === '2026-03-09');
    expect(mergedEntry.weight).toBe(83);
    expect(mergedEntry.calories).toBe(1900);
});

test('Sync.mergeEntries preserves local-only entries', () => {
    const Sync = resetSyncMocks();
    mockLocalStorage.clear();
    Storage.init();
    
    Storage.saveEntry('2026-03-10', { weight: 80 });
    Storage.saveEntry('2026-03-11', { weight: 81 });
    
    const remoteEntries = [
        { date: '2026-03-12', weight: 82, updated_at: '2026-03-12T10:00:00Z' }
    ];

    const merged = Sync.mergeEntries(remoteEntries);

    expect(merged).toHaveLength(3);
    const dates = merged.map(e => e.date);
    expect(dates).toContain('2026-03-10');
    expect(dates).toContain('2026-03-11');
    expect(dates).toContain('2026-03-12');
});

test('Sync.mergeEntries adds remote-only entries', () => {
    const Sync = resetSyncMocks();
    mockLocalStorage.clear();
    Storage.init();
    
    const remoteEntries = [
        { date: '2026-03-13', weight: 80, updated_at: '2026-03-13T10:00:00Z' },
        { date: '2026-03-14', weight: 81, updated_at: '2026-03-14T10:00:00Z' }
    ];

    const merged = Sync.mergeEntries(remoteEntries);

    expect(merged).toHaveLength(2);
});

test('Sync.mergeEntries sorts by date descending', () => {
    const Sync = resetSyncMocks();
    mockLocalStorage.clear();
    Storage.init();
    
    Storage.saveEntry('2026-03-16', { weight: 80, updatedAt: '2026-03-16T10:00:00Z' });
    
    const remoteEntries = [
        { date: '2026-03-14', weight: 78, updated_at: '2026-03-14T10:00:00Z' },
        { date: '2026-03-18', weight: 82, updated_at: '2026-03-18T10:00:00Z' }
    ];

    const merged = Sync.mergeEntries(remoteEntries);

    expect(merged[0].date).toBe('2026-03-18');
    expect(merged[1].date).toBe('2026-03-16');
    expect(merged[2].date).toBe('2026-03-14');
});

test('Sync.getStatus returns correct structure', () => {
    const Sync = resetSyncMocks();
    const status = Sync.getStatus();

    expect(status).toBeDefined();
    expect(typeof status.isOnline).toBe('boolean');
    expect(typeof status.isAuthenticated).toBe('boolean');
    expect(typeof status.pendingOperations).toBe('number');
    expect(typeof status.isSyncing).toBe('boolean');
    expect(typeof status.errorCount).toBe('number');
});

test('Sync.getStatus shows correct pending operations count', () => {
    const Sync = resetSyncMocks();
    mockLocalStorage.clear();
    
    Sync.queueOperation('create', 'weight_entries', { weight: 80 });
    Sync.queueOperation('update', 'weight_entries', { weight: 81 });

    const status = Sync.getStatus();
    expect(status.pendingOperations).toBe(2);
});

test('Sync.getQueue returns pending operations', () => {
    const Sync = resetSyncMocks();
    mockLocalStorage.clear();
    
    Sync.queueOperation('create', 'weight_entries', { weight: 80 });
    Sync.queueOperation('update', 'weight_entries', { weight: 81 });

    const queue = Sync.getQueue();
    expect(queue).toHaveLength(2);
});

test('Sync.getQueue includes operation metadata', () => {
    const Sync = resetSyncMocks();
    mockLocalStorage.clear();
    
    Sync.queueOperation('create', 'weight_entries', { weight: 80 }, 'local-123');

    const queue = Sync.getQueue();
    expect(queue[0]).toBeDefined();
    expect(queue[0].type).toBe('create');
    expect(queue[0].table).toBe('weight_entries');
    expect(queue[0].retries).toBe(0);
    expect(queue[0].localId).toBe('local-123');
});

test('Sync.getErrorHistory returns error entries', () => {
    const Sync = resetSyncMocks();
    Sync.init();
    
    // Manually record an error to test error history
    // Use internal mechanism: directly set in localStorage then re-init
    const errorEntry = {
        id: 'test-error-1',
        timestamp: Date.now(),
        operation: 'test',
        error: 'Test error',
        details: {},
        resolved: false
    };
    mockLocalStorage.data.tdee_sync_history = JSON.stringify([errorEntry]);
    
    // Re-require to load the error history
    delete require.cache[require.resolve('../js/sync.js')];
    const Sync2 = require('../js/sync.js');
    Sync2.init();
    
    const history = Sync2.getErrorHistory();
    expect(history).toHaveLength(1);
    expect(history[0].operation).toBe('test');
});

test('Sync.clearErrorHistory removes all errors', () => {
    const Sync = resetSyncMocks();
    Sync.init();
    
    // Set up error history
    mockLocalStorage.data.tdee_sync_history = JSON.stringify([
        { id: 'e1', timestamp: Date.now(), operation: 'create', error: 'Error 1', resolved: false }
    ]);
    
    // Re-require to load
    delete require.cache[require.resolve('../js/sync.js')];
    const Sync2 = require('../js/sync.js');
    Sync2.init();
    
    expect(Sync2.getErrorHistory()).toHaveLength(1);
    
    Sync2.clearErrorHistory();
    expect(Sync2.getErrorHistory()).toHaveLength(0);
});

test('Sync.mergeEntries handles empty remote entries', () => {
    const Sync = resetSyncMocks();
    mockLocalStorage.clear();
    Storage.init();
    
    const merged = Sync.mergeEntries([]);
    expect(merged).toEqual([]);
});

test('Sync.saveWeightEntry handles null entry', async () => {
    const Sync = resetSyncMocks();
    mockLocalStorage.clear();
    Storage.init();
    
    const result = await Sync.saveWeightEntry(null);
    expect(result.success).toBeFalse();
    expect(result.error).toBe('Entry must include date field');
});

test('Sync.saveWeightEntry handles undefined entry', async () => {
    const Sync = resetSyncMocks();
    mockLocalStorage.clear();
    Storage.init();
    
    const result = await Sync.saveWeightEntry(undefined);
    expect(result.success).toBeFalse();
});

test('Sync preserves data through full sync cycle', async () => {
    const Sync = resetSyncMocks();
    mockLocalStorage.clear();
    Storage.init();
    
    const entry = {
        date: '2026-03-20',
        weight: 80.5,
        calories: 1600,
        notes: 'Integration test'
    };

    const result = await Sync.saveWeightEntry(entry);
    expect(result.success).toBeTrue();

    const retrieved = Storage.getEntry('2026-03-20');
    expect(retrieved.weight).toBe(80.5);

    const queue = Sync.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('create');
});

test('Sync handles multiple entry operations', async () => {
    const Sync = resetSyncMocks();
    mockLocalStorage.clear();
    Storage.init();
    
    await Sync.saveWeightEntry({ date: '2026-03-21', weight: 80, calories: 1600 });
    await Sync.saveWeightEntry({ date: '2026-03-22', weight: 81, calories: 1700 });
    await Sync.updateWeightEntry({ date: '2026-03-21', weight: 80.5, calories: 1650 });

    const queue = Sync.getQueue();
    expect(queue).toHaveLength(3);
    
    const types = queue.map(o => o.type);
    expect(types).toEqual(['create', 'create', 'update']);
});

// Summary
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
