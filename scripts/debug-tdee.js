const fs = require('fs');
const path = require('path');

global.Utils = require('../js/utils.js');
global.EWMA = require('../js/calculator-ewma.js');
const TDEE = require('../js/calculator-tdee.js');

const dataPath = path.join(__dirname, '..', 'sample_data_export.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

console.log('='.repeat(80));
console.log('TDEE DEBUG SCRIPT');
console.log('='.repeat(80));
console.log(`Loaded ${Object.keys(data.entries).length} entries from sample_data_export.json`);
console.log(`Date range: ${Object.keys(data.entries).sort()[0]} to ${Object.keys(data.entries).sort().reverse()[0]}`);
console.log('');

const entriesArray = Object.entries(data.entries)
    .map(([date, entry]) => ({
        date,
        weight: entry.weight,
        calories: entry.calories,
        notes: entry.notes,
        updatedAt: entry.updatedAt
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

console.log('SAMPLE DATA SUMMARY');
console.log('-'.repeat(80));
const weightEntries = entriesArray.filter(e => e.weight !== null);
const calorieEntries = entriesArray.filter(e => e.calories !== null);
console.log(`Total entries: ${entriesArray.length}`);
console.log(`Entries with weight: ${weightEntries.length}`);
console.log(`Entries with calories: ${calorieEntries.length}`);
console.log('');

const last7Days = entriesArray.slice(0, 7);
console.log('LAST 7 DAYS DATA');
console.log('-'.repeat(80));
last7Days.forEach((e, i) => {
    const weightStr = e.weight !== null ? `${e.weight.toFixed(1)} kg` : 'null';
    const calStr = e.calories !== null ? `${e.calories} kcal` : 'null';
    console.log(`  ${i + 1}. ${e.date}: weight=${weightStr}, calories=${calStr}`);
});
console.log('');

const last14Days = entriesArray.slice(0, 14);
console.log('LAST 14 DAYS DATA');
console.log('-'.repeat(80));
last14Days.forEach((e, i) => {
    const weightStr = e.weight !== null ? `${e.weight.toFixed(1)} kg` : 'null';
    const calStr = e.calories !== null ? `${e.calories} kcal` : 'null';
    console.log(`  ${i + 1}. ${e.date}: weight=${weightStr}, calories=${calStr}`);
});
console.log('');

console.log('='.repeat(80));
console.log('7-DAY TDEE CALCULATION (Fast TDEE)');
console.log('='.repeat(80));

const fastResult = TDEE.calculateFastTDEE(last7Days, 'kg', 4);
console.log('');
console.log('INTERMEDIATE VALUES:');

const processed7 = TDEE.processEntriesWithGaps(last7Days);
console.log('EWMA Weights:');
processed7.forEach((e, i) => {
    const weightStr = e.ewmaWeight !== null ? e.ewmaWeight.toFixed(3) : 'null';
    console.log(`  ${i + 1}. ${e.date}: ${weightStr} kg`);
});

const firstEWMA = processed7[0]?.ewmaWeight;
const lastEWMA = processed7[processed7.length - 1]?.ewmaWeight;
const ewmaDelta = lastEWMA - firstEWMA;
console.log('');
console.log(`First EWMA: ${firstEWMA?.toFixed(3)} kg`);
console.log(`Last EWMA: ${lastEWMA?.toFixed(3)} kg`);
console.log(`EWMA Delta: ${ewmaDelta.toFixed(3)} kg`);

const calorieEntries7 = last7Days.filter(e => e.calories !== null && !isNaN(e.calories));
const avgCalories7 = calorieEntries7.reduce((sum, e) => sum + e.calories, 0) / calorieEntries7.length;
console.log('');
console.log(`Average Calories: ${avgCalories7.toFixed(0)} kcal`);
console.log(`Tracked Days: ${fastResult.trackedDays}`);
console.log(`Weight Delta: ${ewmaDelta.toFixed(3)} kg`);

console.log('');
console.log('RESULT:');
console.log(`  7-Day TDEE: ${fastResult.tdee !== null ? fastResult.tdee.toFixed(0) : 'null'} kcal/day`);
console.log(`  Confidence: ${fastResult.confidence}`);
if (fastResult.accuracy) {
    console.log(`  Accuracy: ${fastResult.accuracy}`);
}
console.log(`  Has Outliers: ${fastResult.hasOutliers}`);
if (fastResult.neededDays) {
    console.log(`  Needed Days: ${fastResult.neededDays} more days for valid TDEE`);
}
console.log('');

console.log('='.repeat(80));
console.log('14-DAY TDEE CALCULATION (Stable TDEE)');
console.log('='.repeat(80));

const stableResult = TDEE.calculateStableTDEE(last14Days, 'kg', 14, 7);
console.log('');
console.log('INTERMEDIATE VALUES:');

const processed14 = TDEE.processEntriesWithGaps(last14Days);
console.log('EWMA Weights:');
processed14.forEach((e, i) => {
    const weightStr = e.ewmaWeight !== null ? e.ewmaWeight.toFixed(3) : 'null';
    console.log(`  ${i + 1}. ${e.date}: ${weightStr} kg`);
});

const firstEWMA14 = processed14[0]?.ewmaWeight;
const lastEWMA14 = processed14[processed14.length - 1]?.ewmaWeight;
const ewmaDelta14 = lastEWMA14 - firstEWMA14;
console.log('');
console.log(`First EWMA: ${firstEWMA14?.toFixed(3)} kg`);
console.log(`Last EWMA: ${lastEWMA14?.toFixed(3)} kg`);
console.log(`EWMA Delta: ${ewmaDelta14.toFixed(3)} kg`);

const calorieEntries14 = last14Days.filter(e => e.calories !== null && !isNaN(e.calories));
const avgCalories14 = calorieEntries14.reduce((sum, e) => sum + e.calories, 0) / calorieEntries14.length;
console.log('');
console.log(`Average Calories: ${avgCalories14.toFixed(0)} kcal`);
console.log(`Tracked Days: ${stableResult.trackedDays}`);

if (stableResult.slope !== undefined) {
    console.log(`Slope: ${stableResult.slope.toFixed(4)} kg/day`);
}
if (stableResult.hasLargeGap !== undefined) {
    console.log(`Has Large Gap: ${stableResult.hasLargeGap}`);
}
if (stableResult.cv !== undefined) {
    console.log(`CV (Coefficient of Variation): ${(stableResult.cv * 100).toFixed(2)}%`);
}
if (stableResult.isWeightVolatile !== undefined) {
    console.log(`Is Weight Volatile: ${stableResult.isWeightVolatile}`);
}
if (stableResult.rSquared !== undefined && stableResult.rSquared !== null) {
    console.log(`R² (Fit Quality): ${stableResult.rSquared.toFixed(4)}`);
}
if (stableResult.fitQuality !== undefined && stableResult.fitQuality !== null) {
    console.log(`Fit Quality: ${stableResult.fitQuality}`);
}

console.log('');
console.log('RESULT:');
console.log(`  14-Day TDEE: ${stableResult.tdee !== null ? stableResult.tdee.toFixed(0) : 'null'} kcal/day`);
console.log(`  Confidence: ${stableResult.confidence}`);
console.log('');

console.log('='.repeat(80));
console.log('COMPARISON: 7-Day vs 14-Day TDEE');
console.log('='.repeat(80));
console.log('');
console.log(`7-Day TDEE:  ${fastResult.tdee !== null ? fastResult.tdee.toFixed(0) : 'null'} kcal/day (${fastResult.confidence} confidence)`);
console.log(`14-Day TDEE: ${stableResult.tdee !== null ? stableResult.tdee.toFixed(0) : 'null'} kcal/day (${stableResult.confidence} confidence)`);

if (fastResult.tdee !== null && stableResult.tdee !== null) {
    const diff = fastResult.tdee - stableResult.tdee;
    const percentDiff = (diff / stableResult.tdee) * 100;
    console.log('');
    console.log(`Difference: ${diff.toFixed(0)} kcal/day (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%)`);
    console.log('');
    if (Math.abs(percentDiff) > 10) {
        console.log('⚠️  WARNING: Large difference (>10%) between 7-day and 14-day TDEE');
        console.log('   This suggests recent changes in metabolism or data quality issues.');
    } else if (Math.abs(percentDiff) > 5) {
        console.log('ℹ️  NOTE: Moderate difference (5-10%) between 7-day and 14-day TDEE');
        console.log('   This is normal during metabolic adaptation or weight changes.');
    } else {
        console.log('✓ GOOD: 7-day and 14-day TDEE are within 5% of each other');
        console.log('   Metabolism appears stable.');
    }
}
console.log('');
console.log('='.repeat(80));
console.log('DEBUG COMPLETE');
console.log('='.repeat(80));
