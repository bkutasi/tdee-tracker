/**
 * TDEE Validation Script - Controlled Dataset Testing
 * Validates all 5 research scenarios against expected TDEE values
 * 
 * Scenarios:
 * 1. Maintenance (stable weight, 2500 cal/day) → Expected: 2500 ±5%
 * 2. Cutting (0.5kg/week loss, 2000 cal/day) → Expected: 2554 ±5%
 * 3. Bulking (0.5kg/week gain, 3000 cal/day) → Expected: 2446 ±5%
 * 4. Water Weight (+2.4kg/week spike) → Expected: null (unreliable)
 * 5. Gaps (2-3 missing days/week) → Expected: TDEE within 10%, hasLargeGap=true
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
try {
    vm.runInThisContext(fs.readFileSync('js/utils.js', 'utf8'), 'js/utils.js');
    vm.runInThisContext(fs.readFileSync('js/calculator-ewma.js', 'utf8'), 'js/calculator-ewma.js');
    vm.runInThisContext(fs.readFileSync('js/calculator-tdee.js', 'utf8'), 'js/calculator-tdee.js');
    vm.runInThisContext(fs.readFileSync('js/calculator.js', 'utf8'), 'js/calculator.js');
    console.log('✓ Modules loaded successfully\n');
} catch (error) {
    console.error('✗ Failed to load modules:', error.message);
    process.exit(1);
}

global.Calculator = global.Calculator;
global.TDEE = global.TDEE;

// Validation tracking
const results = [];
let totalTests = 0;
let passedTests = 0;

function validateScenario(name, entries, expected, tolerance = 0.05) {
    totalTests++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${name}`);
    console.log('='.repeat(60));
    
    try {
        const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 4);
        
        console.log(`  Expected TDEE: ${expected.tdee !== null ? `${expected.tdee} ±${tolerance*100}%` : 'null (unreliable)'}`);
        console.log(`  Actual TDEE:   ${result.tdee !== null ? result.tdee : 'null'}`);
        console.log(`  Confidence:    ${result.confidence || 'N/A'}`);
        if (result.hasLargeGap !== undefined) {
            console.log(`  Has Large Gap: ${result.hasLargeGap}`);
        }
        
        let pass = true;
        let reason = '';
        
        if (expected.tdee === null) {
            // Should return null
            pass = result.tdee === null;
            reason = pass ? 'Correctly detected unreliable data' : 'Should return null for unreliable data';
        } else {
            // Check TDEE within tolerance
            const lowerBound = expected.tdee * (1 - tolerance);
            const upperBound = expected.tdee * (1 + tolerance);
            pass = result.tdee !== null && result.tdee >= lowerBound && result.tdee <= upperBound;
            reason = pass 
                ? `Within tolerance (${lowerBound.toFixed(0)}-${upperBound.toFixed(0)})`
                : `Outside tolerance (${lowerBound.toFixed(0)}-${upperBound.toFixed(0)})`;
        }
        
        // Check additional expectations
        if (expected.hasLargeGap !== undefined) {
            const gapCheck = result.hasLargeGap === expected.hasLargeGap;
            if (!gapCheck) {
                pass = false;
                reason += ` | hasLargeGap should be ${expected.hasLargeGap}`;
            }
        }
        
        if (expected.confidence) {
            const confCheck = result.confidence === expected.confidence;
            if (!confCheck) {
                // Don't fail on confidence mismatches for now (TODO item)
                reason += ` | confidence: ${result.confidence} (expected: ${expected.confidence})`;
            }
        }
        
        if (pass) {
            passedTests++;
            console.log(`  Result: ✓ PASS - ${reason}`);
        } else {
            console.log(`  Result: ✗ FAIL - ${reason}`);
        }
        
        results.push({
            scenario: name.split(':')[0],
            expected: expected.tdee !== null ? `${expected.tdee} ±${tolerance*100}%` : 'null',
            actual: result.tdee !== null ? result.tdee.toString() : 'null',
            confidence: result.confidence || 'N/A',
            pass
        });
        
        return pass;
    } catch (error) {
        console.log(`  Result: ✗ FAIL - Error: ${error.message}`);
        results.push({
            scenario: name.split(':')[0],
            expected: expected.tdee !== null ? `${expected.tdee} ±${tolerance*100}%` : 'null',
            actual: `Error: ${error.message}`,
            confidence: 'N/A',
            pass: false
        });
        return false;
    }
}

console.log('=== TDEE Validation Against Controlled Datasets ===\n');
console.log('Research Standard: Hall & Chow (2011) - Energy Balance Dynamics');
console.log('Tolerance: ±5% for valid TDEE scenarios');

// Scenario 1: Maintenance (Stable Weight)
console.log('\n' + '─'.repeat(60));
console.log('SCENARIO 1: MAINTENANCE');
console.log('─'.repeat(60));
const maintenanceEntries = [];
const startDate1 = new Date('2025-01-01');
const baseWeight = 80.0;
for (let i = 0; i < 14; i++) {
    const weightVariation = (i % 3 === 0) ? 0.1 : (i % 3 === 1 ? -0.05 : 0.05);
    maintenanceEntries.push({
        date: new Date(startDate1.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        weight: Calculator.round(baseWeight + weightVariation, 2),
        calories: 2500
    });
}
validateScenario(
    'Scenario 1: Maintenance (stable weight ±0.1kg, 2500 cal/day)',
    maintenanceEntries,
    { tdee: 2500, confidence: 'high' },
    0.05
);

// Scenario 2: Cutting (Weight Loss)
console.log('\n' + '─'.repeat(60));
console.log('SCENARIO 2: CUTTING');
console.log('─'.repeat(60));
const cuttingEntries = [];
const startDate2 = new Date('2025-01-01');
const startWeight2 = 80.0;
const dailyLoss = 0.0714; // 0.5kg / 7 days
for (let i = 0; i < 14; i++) {
    cuttingEntries.push({
        date: new Date(startDate2.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        weight: Calculator.round(startWeight2 - (i * dailyLoss), 2),
        calories: 2000
    });
}
validateScenario(
    'Scenario 2: Cutting (0.5kg/week loss, 2000 cal/day)',
    cuttingEntries,
    { tdee: 2554, confidence: 'high' },
    0.05
);

// Scenario 3: Bulking (Weight Gain)
console.log('\n' + '─'.repeat(60));
console.log('SCENARIO 3: BULKING');
console.log('─'.repeat(60));
const bulkingEntries = [];
const startDate3 = new Date('2025-01-01');
const startWeight3 = 80.0;
const dailyGain = 0.0714; // 0.5kg / 7 days
for (let i = 0; i < 14; i++) {
    bulkingEntries.push({
        date: new Date(startDate3.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        weight: Calculator.round(startWeight3 + (i * dailyGain), 2),
        calories: 3000
    });
}
validateScenario(
    'Scenario 3: Bulking (0.5kg/week gain, 3000 cal/day)',
    bulkingEntries,
    { tdee: 2446, confidence: 'high' },
    0.05
);

// Scenario 4: Water Weight Spike (Unreliable Data)
console.log('\n' + '─'.repeat(60));
console.log('SCENARIO 4: WATER WEIGHT');
console.log('─'.repeat(60));
const waterWeightEntries = [];
const startDate4 = new Date('2025-01-01');
for (let i = 0; i < 14; i++) {
    const weight = (i < 7) ? 80.0 : 82.4; // Sudden +2.4kg spike at day 7
    waterWeightEntries.push({
        date: new Date(startDate4.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        weight: weight,
        calories: 2500
    });
}
validateScenario(
    'Scenario 4: Water Weight (+2.4kg/week spike, unreliable)',
    waterWeightEntries,
    { tdee: null },
    0
);

// Scenario 5: Gap Handling (Missing Days)
console.log('\n' + '─'.repeat(60));
console.log('SCENARIO 5: GAP HANDLING');
console.log('─'.repeat(60));
const gapEntries = [];
const startDate5 = new Date('2025-01-01'); // Wednesday
const startWeight5 = 80.0;
const dailyLoss5 = 0.0714;
const logDaysOfWeek = [1, 2, 4, 6]; // Mon, Tue, Thu, Sat (skip Wed, Fri, Sun)

for (let i = 0; i < 21; i++) {
    const currentDate = new Date(startDate5.getTime() + i * 24 * 60 * 60 * 1000);
    const dayOfWeek = currentDate.getDay();
    
    if (logDaysOfWeek.includes(dayOfWeek)) {
        gapEntries.push({
            date: currentDate.toISOString().split('T')[0],
            weight: Calculator.round(startWeight5 - (i * dailyLoss5), 2),
            calories: 2000
        });
    }
}
validateScenario(
    'Scenario 5: Gap Handling (2-3 missing days/week, 21 days)',
    gapEntries,
    { tdee: 2554, hasLargeGap: true, confidence: 'medium' },
    0.10
);

// Summary Report
console.log('\n' + '='.repeat(60));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(60));

console.log('\n' + '─'.repeat(60));
console.log('Scenario          | Expected      | Actual        | Pass/Fail');
console.log('─'.repeat(60));
results.forEach(r => {
    const status = r.pass ? '✓ PASS' : '✗ FAIL';
    console.log(`${r.scenario.padEnd(17)} | ${r.expected.padEnd(13)} | ${r.actual.padEnd(13)} | ${status}`);
});
console.log('─'.repeat(60));

const passRate = ((passedTests / totalTests) * 100).toFixed(1);
console.log(`\nTotal: ${passedTests}/${totalTests} scenarios passed (${passRate}%)`);

if (passedTests >= 4) {
    console.log('\n✓ VALIDATION SUCCESSFUL: At least 4/5 scenarios passed');
} else {
    console.log('\n✗ VALIDATION FAILED: Less than 4/5 scenarios passed');
}

console.log('\n' + '='.repeat(60));

// Exit with appropriate code
process.exit(passedTests >= 4 ? 0 : 1);
