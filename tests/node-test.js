#!/usr/bin/env node
/**
 * Node.js test runner for quick verification
 * Run with: node tests/node-test.js
 */

// Simple test harness for Node.js
let passed = 0;
let failed = 0;

function expect(actual) {
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
const Calculator = require('../js/calculator.js');
const Utils = require('../js/utils.js');

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
    expect(Utils.validateWeight(80, 'kg').valid).toBe(true);
});

test('validateCalories accepts valid values', () => {
    expect(Utils.validateCalories(1600).valid).toBe(true);
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

// Summary
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
