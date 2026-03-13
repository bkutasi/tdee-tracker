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
        // Test with 14-day minimum standard (research-backed)
        // Creates 14 days of data with full calorie tracking
        const entries = [];
        const startDate = new Date('2025-01-01');
        for (let i = 0; i < 14; i++) {
            entries.push({
                date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                weight: 80.0 - (i * 0.05), // Gradual weight loss: 80.0 → 79.3
                calories: 2000 + (i % 3 === 0 ? 100 : -50) // Varies around 2000
            });
        }

        const result = TDEE.calculateFastTDEE(entries, 'kg', 14);

        // Should have 14 tracked days (all days have calorie data)
        expect(result.trackedDays).toBe(14);
        
        // TDEE should be reasonable (~2000-2500)
        // With avg ~2000 cal and weight loss of 0.7kg over 14 days
        // TDEE ≈ 2000 + (0.7 * 7716 / 14) ≈ 2000 + 386 ≈ 2386
        expect(result.tdee).toBeGreaterThan(1500);
        expect(result.tdee).toBeLessThan(3000);
        
        // Confidence should be medium (14 tracked days)
        expect(result.confidence).toBe('medium');
    });

    it('returns null TDEE when below minimum tracked days (14-day standard)', () => {
        // Only 7 days of data - below 14-day minimum
        const entries = [];
        const startDate = new Date('2025-01-01');
        for (let i = 0; i < 7; i++) {
            entries.push({
                date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                weight: 80.0 - (i * 0.05),
                calories: 2000
            });
        }

        const result = TDEE.calculateFastTDEE(entries, 'kg', 14);

        expect(result.tdee).toBeNull();
        expect(result.trackedDays).toBe(7);
        expect(result.confidence).toBe('low'); // 7 days = low confidence
        expect(result.neededDays).toBe(7); // Needs 7 more days to reach 14
    });

    it('achieves high confidence with 28+ days of data', () => {
        // 28 days of data - achieves HIGH confidence tier
        const entries = [];
        const startDate = new Date('2025-01-01');
        for (let i = 0; i < 28; i++) {
            entries.push({
                date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                weight: 80.0 - (i * 0.03), // Gradual weight loss
                calories: 2000
            });
        }

        const result = TDEE.calculateFastTDEE(entries, 'kg', 14);

        expect(result.trackedDays).toBe(28);
        expect(result.confidence).toBe('high');
        expect(result.accuracy).toBe('±5-10%');
        expect(result.tdee).not.toBeNull();
    });

    it('returns null TDEE with very insufficient data (< 7 days)', () => {
        const entries = [
            { date: '2025-01-01', weight: 80.0, calories: 2000 },
            { date: '2025-01-02', weight: 80.2, calories: null },
            { date: '2025-01-03', weight: 80.1, calories: null },
            { date: '2025-01-04', weight: 80.3, calories: null }
        ];

        const result = TDEE.calculateFastTDEE(entries, 'kg', 14);

        expect(result.tdee).toBeNull();
        expect(result.trackedDays).toBe(1);
        expect(result.confidence).toBe('none'); // Less than 7 days
        expect(result.neededDays).toBe(13);
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

describe('Calculator.calculateCV', () => {
    it('calculates CV correctly for stable weights', () => {
        // Arrange: Stable weights with low variation
        const weights = [80.0, 80.1, 80.0, 79.9, 80.0];
        
        // Act: Calculate CV
        const cv = Calculator.calculateCV(weights);
        
        // Assert: CV should be low (< 1%)
        expect(cv).toBeLessThan(1);
        expect(cv).toBeGreaterThan(0);
    });

    it('calculates CV correctly for volatile weights', () => {
        // Arrange: Volatile weights with high variation
        const weights = [78.0, 82.0, 79.0, 83.0, 80.0];
        
        // Act: Calculate CV
        const cv = Calculator.calculateCV(weights);
        
        // Assert: CV should be higher (> 2%)
        expect(cv).toBeGreaterThan(2);
    });

    it('returns null for empty array', () => {
        // Arrange: Empty array
        const weights = [];
        
        // Act: Calculate CV
        const cv = Calculator.calculateCV(weights);
        
        // Assert: Should return null
        expect(cv).toBeNull();
    });

    it('returns null for null/undefined input', () => {
        // Arrange: Null/undefined inputs
        const nullInput = null;
        const undefinedInput = undefined;
        
        // Act: Calculate CV
        const cvNull = Calculator.calculateCV(nullInput);
        const cvUndefined = Calculator.calculateCV(undefinedInput);
        
        // Assert: Should return null
        expect(cvNull).toBeNull();
        expect(cvUndefined).toBeNull();
    });

    it('returns null for zero mean (all zeros)', () => {
        // Arrange: All zero weights (edge case)
        const weights = [0, 0, 0, 0];
        
        // Act: Calculate CV
        const cv = Calculator.calculateCV(weights);
        
        // Assert: Should return null (division by zero)
        expect(cv).toBeNull();
    });

    it('matches manual CV calculation', () => {
        // Arrange: Known weights for manual verification
        // weights = [10, 20, 30]
        // mean = 20
        // variance = ((10-20)^2 + (20-20)^2 + (30-20)^2) / 3 = (100 + 0 + 100) / 3 = 66.67
        // stdDev = sqrt(66.67) = 8.165
        // CV = (8.165 / 20) * 100 = 40.82%
        const weights = [10, 20, 30];
        
        // Act: Calculate CV
        const cv = Calculator.calculateCV(weights);
        
        // Assert: Should match manual calculation
        expect(cv).toBeCloseTo(40.82, 1);
    });

    it('handles single element array', () => {
        // Arrange: Single weight
        const weights = [80];
        
        // Act: Calculate CV
        const cv = Calculator.calculateCV(weights);
        
        // Assert: CV should be 0 (no variation)
        expect(cv).toBe(0);
    });

    it('detects volatile periods (CV > 2%)', () => {
        // Arrange: Volatile weights
        const volatileWeights = [75, 85, 77, 84, 79];
        
        // Act: Calculate CV and check volatility
        const cv = Calculator.calculateCV(volatileWeights);
        const isVolatile = Calculator.isVolatile(cv);
        
        // Assert: Should be flagged as volatile
        expect(cv).toBeGreaterThan(2);
        expect(isVolatile).toBeTrue();
    });

    it('detects stable periods (CV <= 2%)', () => {
        // Arrange: Stable weights
        const stableWeights = [80.0, 80.2, 80.1, 79.9, 80.0];
        
        // Act: Calculate CV and check volatility
        const cv = Calculator.calculateCV(stableWeights);
        const isVolatile = Calculator.isVolatile(cv);
        
        // Assert: Should NOT be flagged as volatile
        expect(cv).toBeLessThanOrEqual(2);
        expect(isVolatile).toBeFalse();
    });
});

describe('Calculator.getAdaptiveAlpha', () => {
    it('returns default alpha for stable weights', () => {
        // Arrange: Low CV (stable)
        const stableCV = 1.5;
        
        // Act: Get adaptive alpha
        const alpha = Calculator.getAdaptiveAlpha(stableCV);
        
        // Assert: Should return default alpha (0.3)
        expect(alpha).toBe(Calculator.DEFAULT_ALPHA);
    });

    it('returns volatile alpha for volatile weights', () => {
        // Arrange: High CV (volatile)
        const volatileCV = 3.0;
        
        // Act: Get adaptive alpha
        const alpha = Calculator.getAdaptiveAlpha(volatileCV);
        
        // Assert: Should return volatile alpha (0.1)
        expect(alpha).toBe(Calculator.VOLATILE_ALPHA);
    });

    it('returns default alpha for null CV', () => {
        // Arrange: Null CV
        const nullCV = null;
        
        // Act: Get adaptive alpha
        const alpha = Calculator.getAdaptiveAlpha(nullCV);
        
        // Assert: Should return default alpha
        expect(alpha).toBe(Calculator.DEFAULT_ALPHA);
    });
});

describe('Calculator.isVolatile', () => {
    it('returns true for CV above threshold', () => {
        // Arrange: CV above default threshold (2%)
        const cv = 2.5;
        
        // Act: Check volatility
        const result = Calculator.isVolatile(cv);
        
        // Assert: Should be volatile
        expect(result).toBeTrue();
    });

    it('returns false for CV at or below threshold', () => {
        // Arrange: CV at threshold
        const cv = 2.0;
        
        // Act: Check volatility
        const result = Calculator.isVolatile(cv);
        
        // Assert: Should NOT be volatile (threshold is exclusive)
        expect(result).toBeFalse();
    });

    it('returns false for null CV', () => {
        // Arrange: Null CV
        const cv = null;
        
        // Act: Check volatility
        const result = Calculator.isVolatile(cv);
        
        // Assert: Should NOT be volatile
        expect(result).toBeFalse();
    });

    it('respects custom threshold', () => {
        // Arrange: CV = 1.5, custom threshold = 1.0
        const cv = 1.5;
        const customThreshold = 1.0;
        
        // Act: Check volatility with custom threshold
        const result = Calculator.isVolatile(cv, customThreshold);
        
        // Assert: Should be volatile with lower threshold
        expect(result).toBeTrue();
    });
});

describe('Calculator - CV Integration with TDEE', () => {
    it('includes CV in Fast TDEE result', () => {
        // Arrange: Sample entries
        const entries = [
            { date: '2025-01-01', weight: 80.0, calories: 2000 },
            { date: '2025-01-02', weight: 80.2, calories: 2100 },
            { date: '2025-01-03', weight: 80.1, calories: 1900 },
            { date: '2025-01-04', weight: 80.3, calories: 2050 },
            { date: '2025-01-05', weight: 80.0, calories: 2000 }
        ];
        
        // Act: Calculate Fast TDEE
        const result = TDEE.calculateFastTDEE(entries, 'kg', 4);
        
        // Assert: Result should include CV and isVolatile
        expect(result.cv).not.toBeNull();
        expect(typeof result.isVolatile).toBe('boolean');
    });

    it('includes CV in Stable TDEE result', () => {
        // Arrange: Sample entries (14+ days for stable TDEE)
        const entries = [];
        let weight = 80.0;
        for (let i = 0; i < 14; i++) {
            entries.push({
                date: `2025-01-${String(i + 1).padStart(2, '0')}`,
                weight: weight + (Math.random() - 0.5) * 0.2,
                calories: 2000 + Math.random() * 200
            });
        }
        
        // Act: Calculate Stable TDEE
        const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 4);
        
        // Assert: Result should include CV and isVolatile
        expect(result.cv).not.toBeNull();
        expect(typeof result.isVolatile).toBe('boolean');
    });

    it('flags volatile weights in TDEE result', () => {
        // Arrange: Volatile weight entries
        const entries = [
            { date: '2025-01-01', weight: 78.0, calories: 2000 },
            { date: '2025-01-02', weight: 82.0, calories: 2100 },
            { date: '2025-01-03', weight: 77.0, calories: 1900 },
            { date: '2025-01-04', weight: 83.0, calories: 2050 },
            { date: '2025-01-05', weight: 79.0, calories: 2000 }
        ];
        
        // Act: Calculate Fast TDEE
        const result = TDEE.calculateFastTDEE(entries, 'kg', 4);
        
        // Assert: Should detect volatility
        expect(result.cv).toBeGreaterThan(2);
        expect(result.isVolatile).toBeTrue();
    });
});

describe('Calculator.calculateLinearRegression', () => {
    it('calculates slope and intercept for perfect linear data', () => {
        // Arrange: Perfect linear relationship y = 2x + 1
        const dataPoints = [
            { x: 0, y: 1 },
            { x: 1, y: 3 },
            { x: 2, y: 5 },
            { x: 3, y: 7 }
        ];
        
        // Act: Calculate linear regression
        const result = Calculator.calculateLinearRegression(dataPoints);
        
        // Assert: Should find exact slope and intercept
        expect(result).not.toBeNull();
        expect(result.slope).toBe(2);
        expect(result.intercept).toBe(1);
    });

    it('returns null for insufficient data points', () => {
        // Arrange: Only 1 data point
        const dataPoints = [{ x: 0, y: 5 }];
        
        // Act: Calculate linear regression
        const result = Calculator.calculateLinearRegression(dataPoints);
        
        // Assert: Should return null
        expect(result).toBeNull();
    });

    it('returns null for empty array', () => {
        // Arrange: Empty array
        const dataPoints = [];
        
        // Act: Calculate linear regression
        const result = Calculator.calculateLinearRegression(dataPoints);
        
        // Assert: Should return null
        expect(result).toBeNull();
    });

    it('handles null/undefined input', () => {
        // Arrange: Null/undefined inputs
        const nullInput = null;
        const undefinedInput = undefined;
        
        // Act: Calculate linear regression
        const resultNull = Calculator.calculateLinearRegression(nullInput);
        const resultUndefined = Calculator.calculateLinearRegression(undefinedInput);
        
        // Assert: Should return null
        expect(resultNull).toBeNull();
        expect(resultUndefined).toBeNull();
    });
});

describe('Calculator.calculateRSquared', () => {
    it('returns R² = 1.0 for perfect linear trend', () => {
        // Arrange: Perfect linear relationship y = 2x + 1
        const dataPoints = [
            { x: 0, y: 1 },
            { x: 1, y: 3 },
            { x: 2, y: 5 },
            { x: 3, y: 7 },
            { x: 4, y: 9 }
        ];
        
        // Act: Calculate R²
        const rSquared = Calculator.calculateRSquared(dataPoints);
        
        // Assert: Should be exactly 1.0 (perfect fit)
        expect(rSquared).toBe(1);
    });

    it('returns R² < 1.0 for noisy data', () => {
        // Arrange: Noisy linear trend (y ≈ 2x + 1 with noise)
        const dataPoints = [
            { x: 0, y: 1.2 },
            { x: 1, y: 2.8 },
            { x: 2, y: 5.1 },
            { x: 3, y: 6.9 },
            { x: 4, y: 9.3 }
        ];
        
        // Act: Calculate R²
        const rSquared = Calculator.calculateRSquared(dataPoints);
        
        // Assert: Should be high but not perfect (0.9-1.0)
        expect(rSquared).toBeGreaterThan(0.9);
        expect(rSquared).toBeLessThan(1);
    });

    it('returns R² ≈ 0.0 for random noise', () => {
        // Arrange: Random noise with no linear trend
        const dataPoints = [
            { x: 0, y: 5 },
            { x: 1, y: 2 },
            { x: 2, y: 8 },
            { x: 3, y: 1 },
            { x: 4, y: 9 }
        ];
        
        // Act: Calculate R²
        const rSquared = Calculator.calculateRSquared(dataPoints);
        
        // Assert: Should be close to 0 (no linear relationship)
        expect(rSquared).toBeLessThan(0.3);
    });

    it('returns null for < 2 data points', () => {
        // Arrange: Only 1 data point
        const dataPoints = [{ x: 0, y: 5 }];
        
        // Act: Calculate R²
        const rSquared = Calculator.calculateRSquared(dataPoints);
        
        // Assert: Should return null
        expect(rSquared).toBeNull();
    });

    it('returns null for zero variance (all y values same)', () => {
        // Arrange: All y values are identical (no variance)
        const dataPoints = [
            { x: 0, y: 5 },
            { x: 1, y: 5 },
            { x: 2, y: 5 },
            { x: 3, y: 5 }
        ];
        
        // Act: Calculate R²
        const rSquared = Calculator.calculateRSquared(dataPoints);
        
        // Assert: Should return null (cannot calculate R²)
        expect(rSquared).toBeNull();
    });

    it('returns null for null/undefined input', () => {
        // Arrange: Null/undefined inputs
        const nullInput = null;
        const undefinedInput = undefined;
        
        // Act: Calculate R²
        const rSquaredNull = Calculator.calculateRSquared(nullInput);
        const rSquaredUndefined = Calculator.calculateRSquared(undefinedInput);
        
        // Assert: Should return null
        expect(rSquaredNull).toBeNull();
        expect(rSquaredUndefined).toBeNull();
    });

    it('returns null for empty array', () => {
        // Arrange: Empty array
        const dataPoints = [];
        
        // Act: Calculate R²
        const rSquared = Calculator.calculateRSquared(dataPoints);
        
        // Assert: Should return null
        expect(rSquared).toBeNull();
    });

    it('calculates R² correctly for moderate fit', () => {
        // Arrange: Moderate linear relationship with noticeable scatter
        const dataPoints = [
            { x: 0, y: 2 },
            { x: 1, y: 4 },
            { x: 2, y: 3 },
            { x: 3, y: 6 },
            { x: 4, y: 5 }
        ];
        
        // Act: Calculate R²
        const rSquared = Calculator.calculateRSquared(dataPoints);
        
        // Assert: Should be moderate (0.5-0.8)
        expect(rSquared).toBeGreaterThan(0.5);
        expect(rSquared).toBeLessThan(0.8);
    });
});

describe('Calculator.getFitQuality', () => {
    it('returns "excellent" for R² > 0.8', () => {
        // Arrange: High R² values
        const excellentValues = [0.81, 0.9, 0.95, 1.0];
        
        // Act & Assert: Each should return 'excellent'
        for (const rSquared of excellentValues) {
            expect(Calculator.getFitQuality(rSquared)).toBe('excellent');
        }
    });

    it('returns "good" for R² between 0.6 and 0.8', () => {
        // Arrange: Moderate-high R² values
        const goodValues = [0.61, 0.65, 0.7, 0.79];
        
        // Act & Assert: Each should return 'good'
        for (const rSquared of goodValues) {
            expect(Calculator.getFitQuality(rSquared)).toBe('good');
        }
    });

    it('returns "fair" for R² between 0.4 and 0.6', () => {
        // Arrange: Moderate R² values
        const fairValues = [0.41, 0.45, 0.5, 0.59];
        
        // Act & Assert: Each should return 'fair'
        for (const rSquared of fairValues) {
            expect(Calculator.getFitQuality(rSquared)).toBe('fair');
        }
    });

    it('returns "poor" for R² < 0.4', () => {
        // Arrange: Low R² values
        const poorValues = [0.0, 0.1, 0.2, 0.39];
        
        // Act & Assert: Each should return 'poor'
        for (const rSquared of poorValues) {
            expect(Calculator.getFitQuality(rSquared)).toBe('poor');
        }
    });

    it('returns null for null/undefined R²', () => {
        // Arrange: Null/undefined inputs
        const nullInput = null;
        const undefinedInput = undefined;
        
        // Act: Get fit quality
        const qualityNull = Calculator.getFitQuality(nullInput);
        const qualityUndefined = Calculator.getFitQuality(undefinedInput);
        
        // Assert: Should return null
        expect(qualityNull).toBeNull();
        expect(qualityUndefined).toBeNull();
    });

    it('handles boundary values correctly', () => {
        // Arrange: Boundary R² values
        expect(Calculator.getFitQuality(0.8)).toBe('good');      // Exactly 0.8 → good
        expect(Calculator.getFitQuality(0.6)).toBe('fair');      // Exactly 0.6 → fair
        expect(Calculator.getFitQuality(0.4)).toBe('poor');      // Exactly 0.4 → poor
    });
});

describe('Calculator.getDaysTrackedScore', () => {
    it('returns 100 for 28+ days', () => {
        expect(TDEE.getDaysTrackedScore(28)).toBe(100);
        expect(TDEE.getDaysTrackedScore(50)).toBe(100);
    });

    it('returns 70 for 14-27 days', () => {
        expect(TDEE.getDaysTrackedScore(14)).toBe(70);
        expect(TDEE.getDaysTrackedScore(20)).toBe(70);
        expect(TDEE.getDaysTrackedScore(27)).toBe(70);
    });

    it('returns 40 for 7-13 days', () => {
        expect(TDEE.getDaysTrackedScore(7)).toBe(40);
        expect(TDEE.getDaysTrackedScore(10)).toBe(40);
        expect(TDEE.getDaysTrackedScore(13)).toBe(40);
    });

    it('returns 10 for <7 days', () => {
        expect(TDEE.getDaysTrackedScore(0)).toBe(10);
        expect(TDEE.getDaysTrackedScore(3)).toBe(10);
        expect(TDEE.getDaysTrackedScore(6)).toBe(10);
    });
});

describe('Calculator.getCVScore', () => {
    it('returns 100 for CV < 1% (very stable)', () => {
        expect(TDEE.getCVScore(0.5)).toBe(100);
        expect(TDEE.getCVScore(0.9)).toBe(100);
    });

    it('returns 80 for CV 1-2% (stable)', () => {
        expect(TDEE.getCVScore(1.0)).toBe(80);
        expect(TDEE.getCVScore(1.5)).toBe(80);
        expect(TDEE.getCVScore(1.9)).toBe(80);
    });

    it('returns 60 for CV 2-3% (somewhat volatile)', () => {
        expect(TDEE.getCVScore(2.0)).toBe(60);
        expect(TDEE.getCVScore(2.5)).toBe(60);
        expect(TDEE.getCVScore(2.9)).toBe(60);
    });

    it('returns 30 for CV > 3% (very volatile)', () => {
        expect(TDEE.getCVScore(3.0)).toBe(30);
        expect(TDEE.getCVScore(5.0)).toBe(30);
    });

    it('returns 30 for null/undefined CV', () => {
        expect(TDEE.getCVScore(null)).toBe(30);
        expect(TDEE.getCVScore(undefined)).toBe(30);
    });
});

describe('Calculator.getRSquaredScore', () => {
    it('returns 100 for R² > 0.8 (excellent fit)', () => {
        expect(TDEE.getRSquaredScore(0.81)).toBe(100);
        expect(TDEE.getRSquaredScore(0.95)).toBe(100);
        expect(TDEE.getRSquaredScore(1.0)).toBe(100);
    });

    it('returns 70 for R² 0.5-0.8 (moderate fit)', () => {
        expect(TDEE.getRSquaredScore(0.5)).toBe(70);
        expect(TDEE.getRSquaredScore(0.65)).toBe(70);
        expect(TDEE.getRSquaredScore(0.8)).toBe(70);
    });

    it('returns 40 for R² < 0.5 (poor fit)', () => {
        expect(TDEE.getRSquaredScore(0.4)).toBe(40);
        expect(TDEE.getRSquaredScore(0.2)).toBe(40);
        expect(TDEE.getRSquaredScore(0.0)).toBe(40);
    });

    it('returns 40 for null/undefined R²', () => {
        expect(TDEE.getRSquaredScore(null)).toBe(40);
        expect(TDEE.getRSquaredScore(undefined)).toBe(40);
    });
});

describe('Calculator.getLoggingConsistencyScore', () => {
    it('returns 100 for perfect logging (all days have both)', () => {
        const entries = [
            { date: '2025-01-01', weight: 80, calories: 2000 },
            { date: '2025-01-02', weight: 80.5, calories: 2100 },
            { date: '2025-01-03', weight: 80.2, calories: 1900 }
        ];
        expect(TDEE.getLoggingConsistencyScore(entries, 3)).toBe(100);
    });

    it('returns 50 for partial logging (half days have both)', () => {
        const entries = [
            { date: '2025-01-01', weight: 80, calories: 2000 },
            { date: '2025-01-02', weight: 80.5, calories: null },
            { date: '2025-01-03', weight: 80.2, calories: 1900 },
            { date: '2025-01-04', weight: null, calories: null }
        ];
        // 2 out of 4 days have both = 50%
        expect(TDEE.getLoggingConsistencyScore(entries, 4)).toBe(50);
    });

    it('returns 0 for no logging (no days have both)', () => {
        const entries = [
            { date: '2025-01-01', weight: 80, calories: null },
            { date: '2025-01-02', weight: null, calories: 2100 },
            { date: '2025-01-03', weight: null, calories: null }
        ];
        expect(TDEE.getLoggingConsistencyScore(entries, 3)).toBe(0);
    });

    it('returns 0 for empty entries', () => {
        expect(TDEE.getLoggingConsistencyScore([], 7)).toBe(0);
    });
});

describe('Calculator.calculateMultiFactorConfidence', () => {
    it('returns HIGH confidence for excellent data across all factors', () => {
        // Arrange: 30 days tracked, low CV, high R², perfect logging
        const tdeeResult = {
            trackedDays: 30,
            cv: 0.8,        // Very stable (<1%)
            rSquared: 0.95, // Excellent fit
            entries: Array(30).fill({ date: '2025-01-01', weight: 80, calories: 2000 })
        };

        // Act
        const result = TDEE.calculateMultiFactorConfidence(tdeeResult);

        // Assert
        expect(result.confidenceTier).toBe('HIGH');
        expect(result.confidenceScore).toBeGreaterThanOrEqual(80);
        expect(result.breakdown.daysScore).toBe(100);
        expect(result.breakdown.cvScore).toBe(100);
        expect(result.breakdown.rSquaredScore).toBe(100);
        expect(result.breakdown.loggingScore).toBe(100);
    });

    it('returns MEDIUM confidence for moderate data', () => {
        // Arrange: 15 days tracked, moderate CV, moderate R², good logging
        const tdeeResult = {
            trackedDays: 15,
            cv: 1.5,        // Stable (1-2%)
            rSquared: 0.65, // Moderate fit
            entries: Array(15).fill({ date: '2025-01-01', weight: 80, calories: 2000 })
        };

        // Act
        const result = TDEE.calculateMultiFactorConfidence(tdeeResult);

        // Assert: Should be MEDIUM tier (60-79)
        expect(result.confidenceTier).toBe('MEDIUM');
        expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
        expect(result.confidenceScore).toBeLessThan(80);
    });

    it('returns LOW confidence for poor data', () => {
        // Arrange: 8 days tracked, high CV, low R², poor logging
        const tdeeResult = {
            trackedDays: 8,
            cv: 2.5,        // Somewhat volatile (2-3%)
            rSquared: 0.4,  // Poor fit
            entries: [
                { date: '2025-01-01', weight: 80, calories: 2000 },
                { date: '2025-01-02', weight: 80.5, calories: null },
                { date: '2025-01-03', weight: null, calories: null },
                { date: '2025-01-04', weight: 81, calories: 2100 },
                { date: '2025-01-05', weight: null, calories: null },
                { date: '2025-01-06', weight: 80.8, calories: null },
                { date: '2025-01-07', weight: null, calories: null },
                { date: '2025-01-08', weight: 80.3, calories: 1900 }
            ]
        };

        // Act
        const result = TDEE.calculateMultiFactorConfidence(tdeeResult);

        // Assert: Should be LOW tier (40-59)
        expect(result.confidenceTier).toBe('LOW');
        expect(result.confidenceScore).toBeGreaterThanOrEqual(40);
        expect(result.confidenceScore).toBeLessThan(60);
    });

    it('returns NONE confidence for very poor data', () => {
        // Arrange: 3 days tracked, very high CV, very low R², no logging consistency
        const tdeeResult = {
            trackedDays: 3,
            cv: 4.0,        // Very volatile (>3%)
            rSquared: 0.2,  // Very poor fit
            entries: [
                { date: '2025-01-01', weight: 80, calories: null },
                { date: '2025-01-02', weight: null, calories: 2000 },
                { date: '2025-01-03', weight: 82, calories: null }
            ]
        };

        // Act
        const result = TDEE.calculateMultiFactorConfidence(tdeeResult);

        // Assert: Should be NONE tier (<40)
        expect(result.confidenceTier).toBe('NONE');
        expect(result.confidenceScore).toBeLessThan(40);
    });

    it('handles null/undefined input gracefully', () => {
        // Act
        const result = TDEE.calculateMultiFactorConfidence(null);

        // Assert
        expect(result.confidenceTier).toBe('NONE');
        expect(result.confidenceScore).toBe(0);
    });

    it('calculates weighted average correctly', () => {
        // Arrange: Known scores for verification
        // daysScore=70 (14-27 days), cvScore=80 (1-2%), rSquaredScore=70 (0.5-0.8), loggingScore=50
        // Weighted: 70*0.30 + 80*0.25 + 70*0.25 + 50*0.20 = 21 + 20 + 17.5 + 10 = 68.5 ≈ 68
        const tdeeResult = {
            trackedDays: 15,  // 70 points
            cv: 1.5,          // 80 points
            rSquared: 0.6,    // 70 points
            entries: [
                { date: '2025-01-01', weight: 80, calories: 2000 },
                { date: '2025-01-02', weight: 80.5, calories: null }
            ]
        };

        // Act
        const result = TDEE.calculateMultiFactorConfidence(tdeeResult);

        // Assert: Should be around 68 (MEDIUM tier)
        expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
        expect(result.confidenceScore).toBeLessThan(80);
    });

    it('includes detailed breakdown in result', () => {
        // Arrange
        const tdeeResult = {
            trackedDays: 20,
            cv: 1.2,
            rSquared: 0.7,
            entries: Array(20).fill({ date: '2025-01-01', weight: 80, calories: 2000 })
        };

        // Act
        const result = TDEE.calculateMultiFactorConfidence(tdeeResult);

        // Assert
        expect(result.breakdown).toBeDefined();
        expect(typeof result.breakdown.daysScore).toBe('number');
        expect(typeof result.breakdown.cvScore).toBe('number');
        expect(typeof result.breakdown.rSquaredScore).toBe('number');
        expect(typeof result.breakdown.loggingScore).toBe('number');
    });
});

describe('Calculator - Multi-Factor Confidence Integration', () => {
    it('includes confidenceScore and confidenceTier in Fast TDEE result', () => {
        // Arrange: 14 days of data
        const entries = [];
        for (let i = 0; i < 14; i++) {
            entries.push({
                date: `2025-01-${String(i + 1).padStart(2, '0')}`,
                weight: 80.0 - (i * 0.1),
                calories: 2000
            });
        }

        // Act
        const result = TDEE.calculateFastTDEE(entries, 'kg', 14);

        // Assert
        expect(result.confidenceScore).toBeDefined();
        expect(result.confidenceTier).toBeDefined();
        expect(result.confidenceBreakdown).toBeDefined();
        expect(typeof result.confidenceScore).toBe('number');
    });

    it('includes confidenceScore and confidenceTier in Stable TDEE result', () => {
        // Arrange: 20 days of data with good trend
        const entries = [];
        for (let i = 0; i < 20; i++) {
            entries.push({
                date: `2025-01-${String(i + 1).padStart(2, '0')}`,
                weight: 80.0 - (i * 0.15),
                calories: 2000
            });
        }

        // Act
        const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 14);

        // Assert
        expect(result.confidenceScore).toBeDefined();
        expect(result.confidenceTier).toBeDefined();
        expect(result.confidenceBreakdown).toBeDefined();
        expect(typeof result.confidenceScore).toBe('number');
        expect(result.rSquared).toBeDefined(); // Stable TDEE includes R²
    });

    it('achieves HIGH confidence with excellent data in Stable TDEE', () => {
        // Arrange: 30 days of consistent data
        const entries = [];
        for (let i = 0; i < 30; i++) {
            entries.push({
                date: `2025-01-${String(i + 1).padStart(2, '0')}`,
                weight: 80.0 - (i * 0.1),
                calories: 2000
            });
        }

        // Act
        const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 14);

        // Assert
        expect(result.confidenceTier).toBe('HIGH');
        expect(result.confidenceScore).toBeGreaterThanOrEqual(80);
    });
});

describe('Calculator - R² Integration with Stable TDEE', () => {
    it('includes rSquared and fitQuality in Stable TDEE result', () => {
        // Arrange: Sample entries with linear weight trend
        const entries = [];
        for (let i = 0; i < 14; i++) {
            entries.push({
                date: `2025-01-${String(i + 1).padStart(2, '0')}`,
                weight: 80.0 - (i * 0.1), // Linear weight loss
                calories: 2000
            });
        }
        
        // Act: Calculate Stable TDEE
        const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 4);
        
        // Assert: Result should include rSquared and fitQuality
        expect(result.rSquared).not.toBeNull();
        expect(result.fitQuality).not.toBeNull();
        expect(['excellent', 'good', 'fair', 'poor']).toContain(result.fitQuality);
    });

    it('detects excellent fit for consistent weight trend', () => {
        // Arrange: Very consistent linear weight loss
        const entries = [];
        for (let i = 0; i < 20; i++) {
            entries.push({
                date: `2025-01-${String(i + 1).padStart(2, '0')}`,
                weight: 80.0 - (i * 0.15), // Perfect linear trend
                calories: 2000
            });
        }
        
        // Act: Calculate Stable TDEE
        const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 4);
        
        // Assert: Should detect excellent fit
        expect(result.rSquared).toBeGreaterThan(0.95);
        expect(result.fitQuality).toBe('excellent');
    });

    it('detects poor fit for volatile weight data', () => {
        // Arrange: Highly volatile weights (no clear trend)
        const entries = [];
        for (let i = 0; i < 14; i++) {
            entries.push({
                date: `2025-01-${String(i + 1).padStart(2, '0')}`,
                weight: 80.0 + (Math.random() - 0.5) * 4, // Random fluctuation
                calories: 2000
            });
        }
        
        // Act: Calculate Stable TDEE
        const result = TDEE.calculateStableTDEE(entries, 'kg', 14, 4);
        
        // Assert: Should detect poor or fair fit
        expect(result.rSquared).toBeLessThan(0.6);
        expect(['poor', 'fair']).toContain(result.fitQuality);
    });
});
