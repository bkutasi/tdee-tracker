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

// Summary
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
