
const assert = require('assert');
const Calculator = require('../js/calculator.js');

// Mock browser environment globals if needed (none needed for Calculator)

console.log('Running BMR Tests...');

// Test Data
// source: https://www.calculator.net/bmr-calculator.html (Mifflin-St Jeor)
// Age 30, Height 175cm, Weight 80kg
// Male: (10*80) + (6.25*175) - (5*30) + 5 = 800 + 1093.75 - 150 + 5 = 1748.75 -> 1749
// Female: (10*80) + (6.25*175) - (5*30) - 161 = 800 + 1093.75 - 150 - 161 = 1582.75 -> 1583

const maleParams = { weight: 80, height: 175, age: 30, gender: 'male' };
const femaleParams = { weight: 80, height: 175, age: 30, gender: 'female' };

// 1. Calculate BMR - Male
const resultMale = Calculator.calculateBMR(maleParams.weight, maleParams.height, maleParams.age, maleParams.gender);
console.log(`Male BMR (80kg, 175cm, 30y): Expected ~1749, Got ${resultMale}`);
assert.strictEqual(resultMale, 1749);

// 2. Calculate BMR - Female
const resultFemale = Calculator.calculateBMR(femaleParams.weight, femaleParams.height, femaleParams.age, femaleParams.gender);
console.log(`Female BMR (80kg, 175cm, 30y): Expected ~1583, Got ${resultFemale}`);
assert.strictEqual(resultFemale, 1583);

// 3. Activity Multipliers
// Base BMR: 2000
const baseBMR = 2000;
const sedentary = Calculator.calculateTheoreticalTDEE(baseBMR, 1.2);
const active = Calculator.calculateTheoreticalTDEE(baseBMR, 1.55);

console.log(`Theoretical TDEE (BMR 2000, 1.2): Expected 2400, Got ${sedentary}`);
assert.strictEqual(sedentary, 2400);

console.log(`Theoretical TDEE (BMR 2000, 1.55): Expected 3100, Got ${active}`);
assert.strictEqual(active, 3100);

// 4. Missing params
const missing = Calculator.calculateBMR(null, 175, 30, 'male');
assert.strictEqual(missing, null);

console.log('✅ All BMR tests passed!');
