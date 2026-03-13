/**
 * Calculator Module Tests
 * Tests for EWMA, TDEE calculation, gap handling, and statistics
 */

describe('Calculator.round', () => {
    it('rounds to 2 decimal places by default', () => {
        expect(Calculator.round(3.14159)).toBe(3.14);
    });

    it('rounds to specified decimal places', () => {
        expect(Calculator.round(3.14159, 3)).toBe(3.142);
        expect(Calculator.round(3.14159, 0)).toBe(3);
    });

    it('handles null and undefined', () => {
        expect(Calculator.round(null)).toBeNull();
        expect(Calculator.round(undefined)).toBeNull();
    });

    it('handles edge case floating point issues', () => {
        // This should NOT produce 0.30000000000000004
        expect(Calculator.round(0.1 + 0.2, 2)).toBe(0.3);
    });
});

describe('Calculator.mround', () => {
    it('rounds to nearest 10 by default', () => {
        expect(Calculator.mround(1847)).toBe(1850);
        expect(Calculator.mround(1843)).toBe(1840);
    });

    it('rounds to specified multiple', () => {
        expect(Calculator.mround(1847, 5)).toBe(1845);
        expect(Calculator.mround(1847, 100)).toBe(1800);
    });
});

describe('Calculator.calculateEWMA', () => {
    it('returns current value when no previous value', () => {
        expect(Calculator.calculateEWMA(82.5, null)).toBe(82.5);
    });

    it('applies 0.3/0.7 smoothing by default', () => {
        // current * 0.3 + previous * 0.7 = 82 * 0.3 + 80 * 0.7 = 24.6 + 56 = 80.6
        expect(Calculator.calculateEWMA(82, 80)).toBe(80.6);
    });

    it('respects custom alpha', () => {
        // current * 0.5 + previous * 0.5 = 82 * 0.5 + 80 * 0.5 = 81
        expect(Calculator.calculateEWMA(82, 80, 0.5)).toBe(81);
    });

    it('matches Excel BA column calculation', () => {
        // From Excel: Week 1 weights 82.0, 82.6, 83.6, 81.6, 81.4, 81.0, 81.1
        // Simulating EWMA progression
        let ewma = Calculator.calculateEWMA(82.0, null);
        expect(ewma).toBe(82.0);

        ewma = Calculator.calculateEWMA(82.6, ewma);
        expect(ewma).toBeCloseTo(82.18, 2);

        ewma = Calculator.calculateEWMA(83.6, ewma);
        expect(ewma).toBeCloseTo(82.61, 2);
    });
});

describe('Calculator.calculateTDEE', () => {
    it('calculates TDEE from weight change and calories', () => {
        // If eating 1600 cal/day and losing 0.5kg/week (7 days)
        // TDEE = 1600 + (0.5 * 7716 / 7) = 1600 + 551 = 2151
        const tdee = Calculator.calculateTDEE({
            avgCalories: 1600,
            weightDelta: -0.5,
            trackedDays: 7,
            unit: 'kg'
        });
        expect(tdee).toBe(2151);
    });

    it('handles weight gain (surplus)', () => {
        // If eating 2500 cal/day and gaining 0.3kg/week
        // TDEE = 2500 + (-0.3 * 7716 / 7) = 2500 - 331 = 2169
        const tdee = Calculator.calculateTDEE({
            avgCalories: 2500,
            weightDelta: 0.3,
            trackedDays: 7,
            unit: 'kg'
        });
        expect(tdee).toBe(2169);
    });

    it('returns null for zero tracked days', () => {
        const tdee = Calculator.calculateTDEE({
            avgCalories: 1600,
            weightDelta: -0.5,
            trackedDays: 0,
            unit: 'kg'
        });
        expect(tdee).toBeNull();
    });

    it('returns null for physiologically impossible TDEE (< 800 kcal)', () => {
        // Extremely low calories + massive weight gain = impossible TDEE
        // 500 cal + (2kg * 7716 / 7) = 500 + 2204 = 2704 (valid)
        // But if we force an impossible scenario:
        const tdee = Calculator.calculateTDEE({
            avgCalories: 200,
            weightDelta: 2,  // Gaining 2kg/week on 200 cal is impossible
            trackedDays: 7,
            unit: 'kg'
        });
        // This should return null as it's below 800 kcal
        expect(tdee).toBeNull();
    });

    it('returns null for physiologically impossible TDEE (> 5000 kcal)', () => {
        // Very high calories + massive weight loss = impossible TDEE
        const tdee = Calculator.calculateTDEE({
            avgCalories: 4500,
            weightDelta: -3,  // Losing 3kg/week is extreme
            trackedDays: 7,
            unit: 'kg'
        });
        // 4500 + (3 * 7716 / 7) = 4500 + 3307 = 7807 (impossible)
        expect(tdee).toBeNull();
    });

    it('works with pounds', () => {
        // 1lb = 3500 cal
        const tdee = Calculator.calculateTDEE({
            avgCalories: 1600,
            weightDelta: -1,
            trackedDays: 7,
            unit: 'lb'
        });
        expect(tdee).toBe(2100); // 1600 + (1 * 3500 / 7)
    });
});

describe('Calculator.calculateRollingTDEE', () => {
    it('calculates average of valid weeks', () => {
        const weeklyData = [
            { tdee: 2000 },
            { tdee: 2100 },
            { tdee: 1900 },
            { tdee: 2050 }
        ];
        expect(Calculator.calculateRollingTDEE(weeklyData, 4)).toBe(2013);
    });

    it('ignores null TDEE values', () => {
        const weeklyData = [
            { tdee: 2000 },
            { tdee: null },
            { tdee: 2100 }
        ];
        expect(Calculator.calculateRollingTDEE(weeklyData, 6)).toBe(2050);
    });

    it('uses only last N weeks', () => {
        const weeklyData = [
            { tdee: 1000 }, // Should be excluded
            { tdee: 2000 },
            { tdee: 2100 }
        ];
        expect(Calculator.calculateRollingTDEE(weeklyData, 2)).toBe(2050);
    });
});

describe('Calculator.calculateDailyTarget', () => {
    it('calculates target with deficit', () => {
        // 2000 TDEE, 20% deficit = 1600
        expect(Calculator.calculateDailyTarget(2000, -0.2)).toBe(1600);
    });

    it('calculates target with surplus', () => {
        // 2000 TDEE, 10% surplus = 2200
        expect(Calculator.calculateDailyTarget(2000, 0.1)).toBe(2200);
    });

    it('returns null for null TDEE', () => {
        expect(Calculator.calculateDailyTarget(null, -0.2)).toBeNull();
    });
});

describe('Calculator.processEntriesWithGaps', () => {
    it('identifies gap days correctly', () => {
        const entries = [
            { date: '2025-01-01', weight: 80, calories: 1600 },
            { date: '2025-01-02', weight: 80.5, calories: null }, // Weight only
            { date: '2025-01-03', weight: null, calories: null }  // Full gap
        ];

        const processed = Calculator.processEntriesWithGaps(entries);

        expect(processed[0].isGap).toBeFalse();
        expect(processed[1].isGap).toBeTrue();
        expect(processed[1].weightOnly).toBeTrue();
        expect(processed[2].isGap).toBeTrue();
        expect(processed[2].weightOnly).toBeFalse();
    });

    it('continues EWMA calculation for weight-only entries', () => {
        const entries = [
            { date: '2025-01-01', weight: 80, calories: 1600 },
            { date: '2025-01-02', weight: 81, calories: null }
        ];

        const processed = Calculator.processEntriesWithGaps(entries);

        expect(processed[0].ewmaWeight).toBe(80);
        expect(processed[1].ewmaWeight).toBeCloseTo(80.3, 2); // 81*0.3 + 80*0.7
    });
});

describe('Calculator.calculateWeeklySummary', () => {
    it('calculates summary statistics', () => {
        const entries = [
            { date: '2025-01-01', weight: 80, calories: 1600, ewmaWeight: 80 },
            { date: '2025-01-02', weight: 81, calories: 1700, ewmaWeight: 80.3 },
            { date: '2025-01-03', weight: 80, calories: 1500, ewmaWeight: 80.21 }
        ];

        const summary = Calculator.calculateWeeklySummary(entries);

        expect(summary.avgWeight).toBeCloseTo(80.33, 2);
        expect(summary.avgCalories).toBe(1600);
        expect(summary.trackedDays).toBe(3);
        expect(summary.confidence).toBe(1);
    });

    it('calculates confidence for partial weeks', () => {
        const entries = [
            { date: '2025-01-01', weight: 80, calories: 1600, ewmaWeight: 80 },
            { date: '2025-01-02', weight: 81, calories: null, ewmaWeight: 80.3 },
            { date: '2025-01-03', weight: null, calories: null, ewmaWeight: 80.3 }
        ];

        const summary = Calculator.calculateWeeklySummary(entries);

        expect(summary.trackedDays).toBe(1);
        expect(summary.totalDays).toBe(3);
        expect(summary.confidence).toBeCloseTo(0.33, 2);
        expect(summary.hasGaps).toBeTrue();
    });
});

describe('Calculator.detectOutliers', () => {
    it('identifies outliers using Z-score', () => {
        // Most values around 80, one extreme outlier
        const data = [80, 81, 80.5, 79.5, 80, 95]; // 95 is an outlier

        const results = Calculator.detectOutliers(data);

        expect(results[5].isOutlier).toBeTrue();
        expect(results[0].isOutlier).toBeFalse();
    });

    it('handles small datasets', () => {
        const data = [80, 81];
        const results = Calculator.detectOutliers(data);

        expect(results[0].isOutlier).toBeFalse();
        expect(results[1].isOutlier).toBeFalse();
    });
});

describe('Calculator.calculateStats', () => {
    it('calculates mean correctly', () => {
        const stats = Calculator.calculateStats([10, 20, 30]);
        expect(stats.mean).toBe(20);
    });

    it('calculates standard deviation', () => {
        const stats = Calculator.calculateStats([2, 4, 4, 4, 5, 5, 7, 9]);
        expect(stats.stdDev).toBeCloseTo(2, 0);
    });

    it('handles empty array', () => {
        const stats = Calculator.calculateStats([]);
        expect(stats.mean).toBe(0);
        expect(stats.stdDev).toBe(0);
    });
});

describe('Calculator.convertWeight', () => {
    it('converts kg to lb', () => {
        expect(Calculator.convertWeight(80, 'kg', 'lb')).toBeCloseTo(176.37, 2);
    });

    it('converts lb to kg', () => {
        expect(Calculator.convertWeight(176, 'lb', 'kg')).toBeCloseTo(79.83, 2);
    });

    it('returns same value for same unit', () => {
        expect(Calculator.convertWeight(80, 'kg', 'kg')).toBe(80);
    });
});

describe('Calculator.calculateFastTDEE', () => {
    it('uses trackedDays (calorie entries) not calendar days for TDEE calculation', () => {
        // BUG FIX TEST: Previously used entries.length (7) instead of trackedDays (4)
        // This caused TDEE to be artificially diluted: 209 kcal instead of ~2400 kcal
        const entries = [
            { date: '2025-01-01', weight: 80.0, calories: 2000 },
            { date: '2025-01-02', weight: 80.2, calories: null }, // No calories
            { date: '2025-01-03', weight: 80.1, calories: null }, // No calories
            { date: '2025-01-04', weight: 80.3, calories: 2100 },
            { date: '2025-01-05', weight: 80.0, calories: null }, // No calories
            { date: '2025-01-06', weight: 79.8, calories: 1900 },
            { date: '2025-01-07', weight: 79.9, calories: 2050 }
        ];

        const result = TDEE.calculateFastTDEE(entries, 'kg', 4);

        // Should have 4 tracked days (days with calorie data)
        expect(result.trackedDays).toBe(4);
        
        // TDEE should be reasonable (~2000-2500), NOT 209 kcal
        // With avg ~2012 cal and slight weight loss (0.1kg over 7 days)
        // TDEE ≈ 2012 + (0.1 * 7716 / 4) ≈ 2012 + 193 ≈ 2205
        expect(result.tdee).toBeGreaterThan(1500);
        expect(result.tdee).toBeLessThan(3000);
        
        // Confidence should be low (only 4 tracked days)
        expect(result.confidence).toBe('low');
    });

    it('returns null TDEE when below minimum tracked days', () => {
        const entries = [
            { date: '2025-01-01', weight: 80.0, calories: 2000 },
            { date: '2025-01-02', weight: 80.2, calories: null },
            { date: '2025-01-03', weight: 80.1, calories: null },
            { date: '2025-01-04', weight: 80.3, calories: null }
        ];

        const result = TDEE.calculateFastTDEE(entries, 'kg', 4);

        expect(result.tdee).toBeNull();
        expect(result.trackedDays).toBe(1);
        expect(result.confidence).toBe('none');
        expect(result.neededDays).toBe(3);
    });
});

describe('Calculator - Excel Parity Test', () => {
    it('matches Excel calculations for Week 1 data', () => {
        // From Improved_TDEE_Tracker.xlsx Row 12-13
        const weights = [82.0, 82.6, 83.6, 81.6, 81.4, 81.0, 81.1];
        const calories = [1724, 1711, 1541, 1675, 1600, 1600, 1650];

        // Calculate EWMA for all weights
        let ewma = null;
        for (const w of weights) {
            ewma = Calculator.calculateEWMA(w, ewma);
        }

        // Excel BA12 shows smoothed weight progression
        // Final EWMA should be close to the smoothed value
        expect(ewma).toBeCloseTo(81.97, 1);

        // Average calories
        const avgCalories = calories.reduce((a, b) => a + b, 0) / calories.length;
        expect(Calculator.round(avgCalories, 0)).toBe(1643);
    });
});
