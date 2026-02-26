/**
 * Calculator Scientific Validation Tests
 * Test scenarios based on scientific literature and real-world edge cases
 * 
 * References:
 * - Hall & Chow (2011) - Minimum 14 days for reliable TDEE
 * - Energy density variations by body fat percentage
 * - Known failure modes: water retention, metabolic adaptation, plateaus
 */

describe('Scientific Confidence Tiers', () => {
    it('HIGH confidence requires 14+ days (Hall & Chow 2011)', () => {
        const entries = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 80 - (i * 0.1),
                calories: 1800
            });
        }
        
        const result = Calculator.calculateFastTDEE(entries, 'kg');
        expect(result.confidence).toBe('high');
        expect(result.accuracy).toBe('±5-10%');
    });

    it('MEDIUM confidence for 7-13 days', () => {
        const entries = [];
        for (let i = 0; i < 10; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 80 - (i * 0.1),
                calories: 1800
            });
        }
        
        const result = Calculator.calculateFastTDEE(entries, 'kg');
        expect(result.confidence).toBe('medium');
        expect(result.accuracy).toBe('±10-15%');
    });

    it('LOW confidence for 4-6 days', () => {
        const entries = [];
        for (let i = 0; i < 5; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 80 - (i * 0.1),
                calories: 1800
            });
        }
        
        const result = Calculator.calculateFastTDEE(entries, 'kg');
        expect(result.confidence).toBe('low');
        expect(result.accuracy).toBe('±15-25%');
    });

    it('None confidence for <4 days', () => {
        const entries = [];
        for (let i = 0; i < 3; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 80 - (i * 0.1),
                calories: 1800
            });
        }
        
        const result = Calculator.calculateFastTDEE(entries, 'kg');
        expect(result.confidence).toBe('none');
    });
});

describe('Dynamic Energy Density', () => {
    it('Lean individual (10kg fat) uses 5500 kcal/kg', () => {
        expect(Calculator.getEnergyDensity(10)).toBe(5500);
        expect(Calculator.getEnergyDensity(14)).toBe(5500);
    });

    it('Average individual (20kg fat) uses 6500 kcal/kg', () => {
        expect(Calculator.getEnergyDensity(15)).toBe(6500);
        expect(Calculator.getEnergyDensity(20));
        expect(Calculator.getEnergyDensity(24)).toBe(6500);
    });

    it('Overweight individual (30kg fat) uses 7200 kcal/kg', () => {
        expect(Calculator.getEnergyDensity(25)).toBe(7200);
        expect(Calculator.getEnergyDensity(30)).toBe(7200);
        expect(Calculator.getEnergyDensity(34)).toBe(7200);
    });

    it('Obese individual (35+kg fat) uses 7716 kcal/kg', () => {
        expect(Calculator.getEnergyDensity(35)).toBe(7716);
        expect(Calculator.getEnergyDensity(40)).toBe(7716);
        expect(Calculator.getEnergyDensity(50)).toBe(7716);
    });

    it('Null/undefined body fat defaults to 7716 kcal/kg', () => {
        expect(Calculator.getEnergyDensity(null)).toBe(7716);
        expect(Calculator.getEnergyDensity(undefined)).toBe(7716);
    });

    it('TDEE calculation uses dynamic energy density', () => {
        // Lean person: 10kg fat, losing 0.5kg/week at 1600 cal
        const tdeeLean = Calculator.calculateTDEE({
            avgCalories: 1600,
            weightDelta: -0.5,
            trackedDays: 7,
            unit: 'kg',
            bodyFatKg: 10
        });
        
        // TDEE = 1600 + (0.5 * 5500 / 7) = 1600 + 393 = 1993
        expect(tdeeLean).toBe(1993);
        
        // Obese person: 40kg fat, same scenario
        const tdeeObese = Calculator.calculateTDEE({
            avgCalories: 1600,
            weightDelta: -0.5,
            trackedDays: 7,
            unit: 'kg',
            bodyFatKg: 40
        });
        
        // TDEE = 1600 + (0.5 * 7716 / 7) = 1600 + 551 = 2151
        expect(tdeeObese).toBe(2151);
    });
});

describe('Scientific Test Scenarios', () => {
    it('Scenario 1: Maintenance (stable weight)', () => {
        // Eating at maintenance, weight should be stable
        const entries = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 80 + (Math.random() * 0.4 - 0.2), // ±0.2kg noise
                calories: 2200
            });
        }
        
        const result = Calculator.calculateStableTDEE(entries, 'kg', 14);
        
        // TDEE should be close to intake (2200) with high confidence
        expect(result.confidence).toBe('high');
        expect(result.tdee).toBeGreaterThan(2000);
        expect(result.tdee).toBeLessThan(2400);
    });

    it('Scenario 2: Aggressive deficit (1kg/week loss)', () => {
        // Very aggressive cut: 1kg/week loss
        const entries = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 85 - (i * 0.14), // ~1kg/week
                calories: 1400
            });
        }
        
        const result = Calculator.calculateStableTDEE(entries, 'kg', 14);
        
        // TDEE should be significantly higher than intake
        // 1400 + (0.14 * 7 * 7716 / 14) ≈ 1400 + 540 = 1940
        expect(result.tdee).toBeGreaterThan(1800);
        expect(result.tdee).toBeLessThan(2100);
    });

    it('Scenario 3: Moderate deficit (0.5kg/week loss)', () => {
        // Sustainable cut: 0.5kg/week
        const entries = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 82 - (i * 0.07), // ~0.5kg/week
                calories: 1800
            });
        }
        
        const result = Calculator.calculateStableTDEE(entries, 'kg', 14);
        
        // TDEE = 1800 + (0.07 * 7 * 7716 / 14) ≈ 1800 + 270 = 2070
        expect(result.tdee).toBeGreaterThan(1900);
        expect(result.tdee).toBeLessThan(2250);
    });

    it('Scenario 4: Lean bulk (0.25kg/week gain)', () => {
        // Controlled surplus for muscle gain
        const entries = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 75 + (i * 0.035), // ~0.25kg/week
                calories: 2800
            });
        }
        
        const result = Calculator.calculateStableTDEE(entries, 'kg', 14);
        
        // TDEE = 2800 - (0.035 * 7 * 7716 / 14) ≈ 2800 - 135 = 2665
        expect(result.tdee).toBeGreaterThan(2500);
        expect(result.tdee).toBeLessThan(2800);
    });

    it('Scenario 5: Water retention simulation', () => {
        // Week 1: normal loss, Week 2: water retention masks loss
        const entries = [];
        const baseWeight = 80;
        
        for (let i = 0; i < 21; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            
            let weight;
            if (i < 7) {
                // Week 1: losing 0.5kg/week
                weight = baseWeight - (i * 0.07);
            } else if (i < 14) {
                // Week 2: water retention (+1.5kg) masks loss
                weight = baseWeight - (7 * 0.07) + 1.5 - ((i - 7) * 0.07);
            } else {
                // Week 3: water drops, reveals actual loss
                weight = baseWeight - (14 * 0.07) - ((i - 14) * 0.07);
            }
            
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: weight,
                calories: 1700
            });
        }
        
        const result = Calculator.calculateStableTDEE(entries, 'kg', 21);
        
        // Despite water retention, should still detect deficit
        expect(result.tdee).toBeGreaterThan(1700);
        expect(result.hasLargeGap).toBe(false);
    });

    it('Scenario 6: Plateau detection (4 weeks <0.2kg change)', () => {
        const entries = [];
        for (let i = 0; i < 28; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 78 + (Math.random() * 0.3 - 0.15), // Minimal fluctuation
                calories: 1900
            });
        }
        
        const warnings = Calculator.getDataQualityWarnings(entries);
        
        // Should detect plateau
        expect(warnings).toContain(jasmine.stringMatching(/plateau/i));
    });

    it('Scenario 7: Metabolic adaptation warning (very low calories)', () => {
        const entries = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 75 - (i * 0.1),
                calories: 1000  // Very low
            });
        }
        
        const warnings = Calculator.getDataQualityWarnings(entries);
        
        // Should warn about low calorie intake
        expect(warnings).toContain(jasmine.stringMatching(/low.*calorie/i));
    });

    it('Scenario 8: High weight variance detection', () => {
        const entries = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            // Simulate high variance: ±1.5kg swings
            const variance = (i % 3 === 0) ? 1.5 : (i % 3 === 1) ? -1.2 : 0.5;
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 80 + variance,
                calories: 1800
            });
        }
        
        const warnings = Calculator.getDataQualityWarnings(entries);
        
        // Should detect high variance
        expect(warnings).toContain(jasmine.stringMatching(/variance/i));
    });

    it('Scenario 9: Missing data warning', () => {
        const entries = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: (i % 3 === 0) ? null : 80 - (i * 0.05),
                calories: (i % 2 === 0) ? 1800 : null
            });
        }
        
        const warnings = Calculator.getDataQualityWarnings(entries);
        
        // Should warn about missing data
        expect(warnings.length).toBeGreaterThan(0);
    });

    it('Scenario 10: Muscle gain during deficit (beginner gains)', () => {
        // Weight stable but strength increasing - recomposition
        const entries = [];
        for (let i = 0; i < 21; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 82 + (Math.random() * 0.6 - 0.3), // Stable weight
                calories: 1900  // Moderate deficit
            });
        }
        
        const result = Calculator.calculateStableTDEE(entries, 'kg', 21);
        
        // TDEE should be close to intake (maintenance)
        expect(result.tdee).toBeGreaterThan(1800);
        expect(result.tdee).toBeLessThan(2100);
    });
});

describe('Data Quality Warnings', () => {
    it('Returns empty array for good data', () => {
        const entries = [];
        for (let i = 0; i < 21; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: 80 - (i * 0.05),
                calories: 1800
            });
        }
        
        const warnings = Calculator.getDataQualityWarnings(entries);
        
        // Good data should have no warnings
        expect(warnings.length).toBe(0);
    });

    it('Warns about insufficient data', () => {
        const entries = [
            { date: '2025-01-01', weight: 80, calories: 1800 },
            { date: '2025-01-02', weight: 79.8, calories: 1750 },
            { date: '2025-01-03', weight: 79.6, calories: 1800 }
        ];
        
        const warnings = Calculator.getDataQualityWarnings(entries);
        
        expect(warnings).toContain(jasmine.stringMatching(/more data/i));
    });

    it('Warns about high variance', () => {
        const entries = [
            { date: '2025-01-01', weight: 80, calories: 1800 },
            { date: '2025-01-02', weight: 82.5, calories: 1800 },  // +2.5kg
            { date: '2025-01-03', weight: 79.0, calories: 1800 },  // -3.5kg
            { date: '2025-01-04', weight: 81.5, calories: 1800 },  // +2.5kg
            { date: '2025-01-05', weight: 78.5, calories: 1800 },  // -3.0kg
            { date: '2025-01-06', weight: 82.0, calories: 1800 },  // +3.5kg
            { date: '2025-01-07', weight: 79.5, calories: 1800 }   // -2.5kg
        ];
        
        const warnings = Calculator.getDataQualityWarnings(entries);
        
        expect(warnings).toContain(jasmine.stringMatching(/variance/i));
    });

    it('Multiple warnings for multiple issues', () => {
        const entries = [];
        for (let i = 0; i < 5; i++) {
            const date = new Date('2025-01-01');
            date.setDate(date.getDate() + i);
            entries.push({
                date: date.toISOString().split('T')[0],
                weight: (i % 2 === 0) ? 80 + Math.random() * 3 : null,
                calories: (i % 2 === 0) ? 900 : null  // Very low + missing
            });
        }
        
        const warnings = Calculator.getDataQualityWarnings(entries);
        
        // Should have multiple warnings
        expect(warnings.length).toBeGreaterThan(2);
    });
});

describe('Edge Cases and Error Handling', () => {
    it('Handles empty entries array', () => {
        const result = Calculator.calculateFastTDEE([], 'kg');
        expect(result.tdee).toBeNull();
        expect(result.confidence).toBe('none');
    });

    it('Handles null weight entries', () => {
        const entries = [
            { date: '2025-01-01', weight: null, calories: 1800 },
            { date: '2025-01-02', weight: null, calories: 1800 },
            { date: '2025-01-03', weight: null, calories: 1800 }
        ];
        
        const result = Calculator.calculateFastTDEE(entries, 'kg');
        expect(result.tdee).toBeNull();
    });

    it('Handles null calorie entries', () => {
        const entries = [
            { date: '2025-01-01', weight: 80, calories: null },
            { date: '2025-01-02', weight: 80.2, calories: null },
            { date: '2025-01-03', weight: 80.1, calories: null }
        ];
        
        const result = Calculator.calculateFastTDEE(entries, 'kg');
        expect(result.tdee).toBeNull();
        expect(result.neededDays).toBe(4);
    });

    it('Energy density for extreme body fat values', () => {
        expect(Calculator.getEnergyDensity(5)).toBe(5500);    // Very lean
        expect(Calculator.getEnergyDensity(100)).toBe(7716);  // Extreme obesity
    });
});
