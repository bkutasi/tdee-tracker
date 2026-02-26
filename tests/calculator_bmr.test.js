
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
console.log(`Male BMR (80kg, 175cm, 30y): Expected ~1749, Got ${resultMale.bmr}`);
assert.strictEqual(resultMale.bmr, 1749);
assert.strictEqual(resultMale.valid, true);

// 2. Calculate BMR - Female
const resultFemale = Calculator.calculateBMR(femaleParams.weight, femaleParams.height, femaleParams.age, femaleParams.gender);
console.log(`Female BMR (80kg, 175cm, 30y): Expected ~1583, Got ${resultFemale.bmr}`);
assert.strictEqual(resultFemale.bmr, 1583);
assert.strictEqual(resultFemale.valid, true);

// 3. Activity Multipliers (test with both old number format and new object format)
const baseBMR = 2000;
const sedentaryOld = Calculator.calculateTheoreticalTDEE(baseBMR, 1.2);
const activeOld = Calculator.calculateTheoreticalTDEE(baseBMR, 1.55);

console.log(`Theoretical TDEE (BMR 2000, 1.2, old format): Expected 2400, Got ${sedentaryOld}`);
assert.strictEqual(sedentaryOld, 2400);

console.log(`Theoretical TDEE (BMR 2000, 1.55, old format): Expected 3100, Got ${activeOld}`);
assert.strictEqual(activeOld, 3100);

// Test with new object format
const sedentaryNew = Calculator.calculateTheoreticalTDEE({ valid: true, bmr: 2000 }, 1.2);
const activeNew = Calculator.calculateTheoreticalTDEE({ valid: true, bmr: 2000 }, 1.55);

console.log(`Theoretical TDEE (BMR 2000, 1.2, new format): Expected 2400, Got ${sedentaryNew}`);
assert.strictEqual(sedentaryNew, 2400);

console.log(`Theoretical TDEE (BMR 2000, 1.55, new format): Expected 3100, Got ${activeNew}`);
assert.strictEqual(activeNew, 3100);

// 4. Missing params - should return error object
const missing = Calculator.calculateBMR(null, 175, 30, 'male');
console.log(`Missing weight: Expected valid=false, Got valid=${missing.valid}`);
assert.strictEqual(missing.valid, false);
assert.strictEqual(missing.bmr, null);
assert.ok(missing.error.includes('Weight'));

// 5. Age validation
const ageTooLow = Calculator.calculateBMR(80, 175, 0, 'male');
assert.strictEqual(ageTooLow.valid, false);
assert.strictEqual(ageTooLow.error, 'Age must be between 1 and 120 years');

const ageTooHigh = Calculator.calculateBMR(80, 175, 121, 'male');
assert.strictEqual(ageTooHigh.valid, false);
assert.strictEqual(ageTooHigh.error, 'Age must be between 1 and 120 years');

// 6. Height validation
const heightTooLow = Calculator.calculateBMR(80, 49, 30, 'male');
assert.strictEqual(heightTooLow.valid, false);
assert.strictEqual(heightTooLow.error, 'Height must be between 50 and 250 cm');

const heightTooHigh = Calculator.calculateBMR(80, 251, 30, 'male');
assert.strictEqual(heightTooHigh.valid, false);
assert.strictEqual(heightTooHigh.error, 'Height must be between 50 and 250 cm');

// 7. Weight validation
const weightTooLow = Calculator.calculateBMR(19, 175, 30, 'male');
assert.strictEqual(weightTooLow.valid, false);
assert.strictEqual(weightTooLow.error, 'Weight must be between 20 and 500 kg');

const weightTooHigh = Calculator.calculateBMR(501, 175, 30, 'male');
assert.strictEqual(weightTooHigh.valid, false);
assert.strictEqual(weightTooHigh.error, 'Weight must be between 20 and 500 kg');

// 8. Gender validation
const invalidGender = Calculator.calculateBMR(80, 175, 30, 'invalid');
assert.strictEqual(invalidGender.valid, false);
assert.strictEqual(invalidGender.error, 'Gender must be male, female, or other');

const missingGender = Calculator.calculateBMR(80, 175, 30, null);
assert.strictEqual(missingGender.valid, false);
assert.strictEqual(missingGender.error, 'Gender must be male, female, or other');

// 9. Test 'other' gender
const otherParams = { weight: 80, height: 175, age: 30, gender: 'other' };
const resultOther = Calculator.calculateBMR(otherParams.weight, otherParams.height, otherParams.age, otherParams.gender);
// Other: (10*80) + (6.25*175) - (5*30) - 78 = 800 + 1093.75 - 150 - 78 = 1665.75 -> 1666
console.log(`Other BMR (80kg, 175cm, 30y): Expected ~1666, Got ${resultOther.bmr}`);
assert.strictEqual(resultOther.bmr, 1666);
assert.strictEqual(resultOther.valid, true);

// 10. Case insensitive gender
const upperCaseGender = Calculator.calculateBMR(80, 175, 30, 'MALE');
assert.strictEqual(upperCaseGender.valid, true);
assert.strictEqual(upperCaseGender.bmr, 1749);

console.log('✅ All BMR tests passed!');
