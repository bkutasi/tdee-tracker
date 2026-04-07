/**
 * Research-Backed TDEE Scenarios - Node.js Runner
 * Tests 5 scenarios: Maintenance, Cutting, Bulking, Water Weight, Gap Handling
 */

const fs = require('fs');
const vm = require('vm');

// Mock browser globals
global.localStorage = {
    data: { tdee_entries: '{}', tdee_settings: '{}', tdee_sync_queue: '[]', tdee_sync_errors: '[]' },
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; }
};
global.document = {
    querySelector: () => null,
    createElement: () => ({ style: {} }),
    addEventListener: () => {}
};
global.window = { localStorage: global.localStorage };
global.console = console;

// Load modules in correct order
console.log('Loading modules...');
vm.runInThisContext(fs.readFileSync('js/utils.js', 'utf8'), 'js/utils.js');
vm.runInThisContext(fs.readFileSync('js/calculator-ewma.js', 'utf8'), 'js/calculator-ewma.js');
vm.runInThisContext(fs.readFileSync('js/calculator-tdee.js', 'utf8'), 'js/calculator-tdee.js');
vm.runInThisContext(fs.readFileSync('js/calculator.js', 'utf8'), 'js/calculator.js');

global.Calculator = global.Calculator;
global.TDEE = global.TDEE;

// Simple test framework
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (error) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${error.message}`);
        failures.push({ name, error: error.message });
        failed++;
    }
}

function expect(actual) {
    const matcher = {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${expected}, got ${actual}`);
            }
        },
        toBeGreaterThan(min) {
            if (actual <= min) {
                throw new Error(`Expected > ${min}, got ${actual}`);
            }
        },
        toBeLessThan(max) {
            if (actual >= max) {
                throw new Error(`Expected < ${max}, got ${actual}`);
            }
        },
        toBeGreaterThanOrEqual(min) {
            if (actual < min) {
                throw new Error(`Expected >= ${min}, got ${actual}`);
            }
        },
        toBeLessThanOrEqual(max) {
            if (actual > max) {
                throw new Error(`Expected <= ${max}, got ${actual}`);
            }
        },
        toBeNull() {
            if (actual !== null) {
                throw new Error(`Expected null, got ${actual}`);
            }
        },
        toBeUndefined() {
            if (actual !== undefined) {
                throw new Error(`Expected undefined, got ${actual}`);
            }
        }
    };
    
    matcher.not = {
        toBeNull() {
            if (actual === null) {
                throw new Error(`Expected not null, got null`);
            }
        },
        toBe(expected) {
            if (actual === expected) {
                throw new Error(`Expected not ${expected}, got ${actual}`);
            }
        }
    };
    
    return matcher;
}

console.log('\n=== Research-Backed TDEE Scenarios ===\n');

// Scenario 1: Maintenance
test('Scenario 1: Maintenance - TDEE ≈ 2500 for stable weight (±0.1kg) with 2500 cal/day', () => {
    const entries = [];
    const startDate = new Date('2025-01-01');
    const baseWeight = 80.0;
    for (let i = 0; i < 14; i++) {
        const weightVariation = (i % 3 === 0) ? 0.1 : (i % 3 === 1 ? -0.05 : 0.05);
        entries.push({
            date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            weight: Calculator.round(baseWeight + weightVariation, 2),
            calories: 2500
        });
    }

    const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 4);

    expect(result.tdee).not.toBeNull();
    expect(result.tdee).toBeGreaterThanOrEqual(2400);
    expect(result.tdee).toBeLessThanOrEqual(2600);
    // Accept medium or high confidence for maintenance scenario
    expect(['medium', 'high'].includes(result.confidence)).toBe(true);
});

// Scenario 2: Cutting
test('Scenario 2: Cutting - TDEE ≈ 2554 for 0.5kg/week loss with 2000 cal/day', () => {
    const entries = [];
    const startDate = new Date('2025-01-01');
    const startWeight = 80.0;
    const dailyLoss = 0.0714;
    for (let i = 0; i < 14; i++) {
        entries.push({
            date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            weight: Calculator.round(startWeight - (i * dailyLoss), 2),
            calories: 2000
        });
    }

    const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 4);

    expect(result.tdee).not.toBeNull();
    expect(result.tdee).toBeGreaterThanOrEqual(2450);
    expect(result.tdee).toBeLessThanOrEqual(2650);
});

// Scenario 3: Bulking
test('Scenario 3: Bulking - TDEE ≈ 2446 for 0.5kg/week gain with 3000 cal/day', () => {
    const entries = [];
    const startDate = new Date('2025-01-01');
    const startWeight = 80.0;
    const dailyGain = 0.0714;
    for (let i = 0; i < 14; i++) {
        entries.push({
            date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            weight: Calculator.round(startWeight + (i * dailyGain), 2),
            calories: 3000
        });
    }

    const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 4);

    expect(result.tdee).not.toBeNull();
    expect(result.tdee).toBeGreaterThanOrEqual(2350);
    expect(result.tdee).toBeLessThanOrEqual(2550);
});

// Scenario 4: Water Weight (EXPECTED TO FAIL)
test('Scenario 4: Water Weight - flags unreliable data for +2.4kg/week spike', () => {
    const entries = [];
    const startDate = new Date('2025-01-01');
    for (let i = 0; i < 14; i++) {
        const weight = (i < 7) ? 80.0 : 82.4;
        entries.push({
            date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            weight: weight,
            calories: 2500
        });
    }

    const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 4);

    // EXPECTED TO FAIL: Currently returns a TDEE value, should return null
    expect(result.tdee).toBeNull();
});

// Scenario 5: Gap Handling (EXPECTED TO FAIL)
test('Scenario 5: Gap Handling - maintains TDEE with 2-3 missing days/week', () => {
    const entries = [];
    const startDate = new Date('2025-01-01'); // Wednesday
    const startWeight = 80.0;
    const dailyLoss = 0.0714;
    const logDaysOfWeek = [1, 2, 4, 6]; // Mon, Tue, Thu, Sat
    
    for (let i = 0; i < 21; i++) {
        const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dayOfWeek = currentDate.getDay();
        
        if (logDaysOfWeek.includes(dayOfWeek)) {
            entries.push({
                date: currentDate.toISOString().split('T')[0],
                weight: Calculator.round(startWeight - (i * dailyLoss), 2),
                calories: 2000
            });
        }
    }

    const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 4);

    expect(result.tdee).not.toBeNull();
    expect(result.tdee).toBeGreaterThanOrEqual(2400);
    expect(result.tdee).toBeLessThanOrEqual(2700);
    // EXPECTED TO FAIL: Currently returns hasLargeGap=false, should be true
    expect(result.hasLargeGap).toBe(true);
});

console.log('\n========================================');
console.log(`Total: ${passed + failed} tests, ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failures.length > 0) {
    console.log('Failed Tests:');
    failures.forEach(f => {
        console.log(`  - ${f.name}: ${f.error}`);
    });
}

// Exit with error code if any tests failed
process.exit(failed > 0 ? 1 : 0);
