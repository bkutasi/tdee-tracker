#!/usr/bin/env node
/**
 * Node.js runner for Scientific Validation Tests
 * Shims browser test environment for Node.js execution
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Load modules
const Calculator = require('../js/calculator.js');
const Utils = require('../js/utils.js');

// Test state
let passed = 0;
let failed = 0;
let currentSuite = '';

// Shim Jasmine
const jasmine = {
    stringMatching: (regex) => ({
        asymmetricMatch: (actual) => regex.test(actual),
        toString: () => `StringMatching(${regex})`
    })
};

// Shim expect
function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${expected}, got ${actual}`);
            }
        },
        toBeGreaterThan(expected) {
            if (!(actual > expected)) {
                throw new Error(`Expected ${actual} > ${expected}`);
            }
        },
        toBeLessThan(expected) {
            if (!(actual < expected)) {
                throw new Error(`Expected ${actual} < ${expected}`);
            }
        },
        toContain(item) {
            if (item && item.asymmetricMatch) {
                if (!Array.isArray(actual)) {
                     throw new Error(`Expected array, got ${typeof actual}`);
                }
                const match = actual.some(val => item.asymmetricMatch(val));
                if (!match) {
                    throw new Error(`Expected array to contain match for ${item}`);
                }
            } else if (!actual.includes(item)) {
                throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
            }
        },
        toBeNull() {
            if (actual !== null) {
                throw new Error(`Expected null, got ${actual}`);
            }
        }
    };
}

// Shim describe/it
function describe(name, fn) {
    currentSuite = name;
    console.log(`\n=== ${name} ===`);
    fn();
}

function it(name, fn) {
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

// Create sandbox
const sandbox = {
    Calculator,
    Utils,
    describe,
    it,
    expect,
    jasmine,
    console
};

// Read and execute test file
const testFile = path.join(__dirname, 'calculator-validation.test.js');
const code = fs.readFileSync(testFile, 'utf8');

console.log('Running Scientific Validation Tests in Node.js...');
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

// Summary
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
