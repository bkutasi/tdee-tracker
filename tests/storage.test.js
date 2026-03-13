/**
 * Storage Module Tests
 * Tests for LocalStorage persistence, import/export, and settings
 */

describe('Storage.init', () => {
    it('initializes storage without errors', () => {
        // Clear any existing data first
        localStorage.clear();
        Storage.init();
        expect(Storage.getSettings()).toEqual(Storage.getDefaultSettings());
    });
});

describe('Storage.saveEntry and getEntry', () => {
    it('saves and retrieves an entry', () => {
        const date = '2025-01-01';
        const entry = { weight: 80.5, calories: 1600, notes: 'Test' };

        const saved = Storage.saveEntry(date, entry);
        expect(saved).toBeTrue();

        const retrieved = Storage.getEntry(date);
        expect(retrieved.weight).toBe(80.5);
        expect(retrieved.calories).toBe(1600);
        expect(retrieved.notes).toBe('Test');
    });

    it('handles partial entries', () => {
        const date = '2025-01-02';
        Storage.saveEntry(date, { weight: 81 }); // No calories

        const retrieved = Storage.getEntry(date);
        expect(retrieved.weight).toBe(81);
        expect(retrieved.calories).toBeNull();
    });

    it('updates existing entries', () => {
        const date = '2025-01-03';
        Storage.saveEntry(date, { weight: 80 });
        Storage.saveEntry(date, { weight: 81, calories: 1500 });

        const retrieved = Storage.getEntry(date);
        expect(retrieved.weight).toBe(81);
        expect(retrieved.calories).toBe(1500);
    });
});

describe('Storage.getEntriesInRange', () => {
    it('returns entries for date range', () => {
        Storage.saveEntry('2025-01-10', { weight: 80, calories: 1600 });
        Storage.saveEntry('2025-01-12', { weight: 81, calories: 1700 });

        const entries = Storage.getEntriesInRange('2025-01-10', '2025-01-12');

        expect(entries).toHaveLength(3);
        expect(entries[0].date).toBe('2025-01-10');
        expect(entries[0].weight).toBe(80);
        expect(entries[1].date).toBe('2025-01-11');
        expect(entries[1].weight).toBeNull(); // Gap day
        expect(entries[2].date).toBe('2025-01-12');
    });
});

describe('Storage.deleteEntry', () => {
    it('deletes an entry', () => {
        const date = '2025-01-20';
        Storage.saveEntry(date, { weight: 80 });
        expect(Storage.getEntry(date)).toBeTruthy();

        Storage.deleteEntry(date);
        expect(Storage.getEntry(date)).toBeNull();
    });
});

describe('Storage.settings', () => {
    it('saves and retrieves settings', () => {
        Storage.saveSettings({ weightUnit: 'lb', goalWeight: 70 });

        const settings = Storage.getSettings();
        expect(settings.weightUnit).toBe('lb');
        expect(settings.goalWeight).toBe(70);
    });

    it('merges with default settings', () => {
        Storage.saveSettings({ weightUnit: 'lb' });

        const settings = Storage.getSettings();
        expect(settings.weightUnit).toBe('lb');
        expect(settings.calorieUnit).toBe('cal'); // Default value
    });
});

describe('Storage.exportData and importData', () => {
    it('exports all data', () => {
        Storage.saveSettings({ weightUnit: 'kg' });
        Storage.saveEntry('2025-01-25', { weight: 82 });

        const exported = Storage.exportData();

        expect(exported.version).toBe(Storage.CURRENT_SCHEMA_VERSION);
        expect(exported.settings.weightUnit).toBe('kg');
        expect(exported.entries['2025-01-25'].weight).toBe(82);
    });

    it('imports data from JSON string', () => {
        const importData = {
            settings: { goalWeight: 75 },
            entries: {
                '2025-02-01': { weight: 83, calories: 1800, notes: '' }
            }
        };

        const result = Storage.importData(JSON.stringify(importData));

        expect(result.success).toBeTrue();
        expect(result.entriesImported).toBe(1);
        expect(result.entriesSkipped).toBe(0);
        expect(Storage.getEntry('2025-02-01').weight).toBe(83);
    });

    it('imports multiple entries and tracks skipped count', () => {
        const importData = {
            settings: { weightUnit: 'kg' },
            entries: {
                '2025-01-01': { weight: 80, calories: 2000, notes: '' },
                '2025-01-02': { weight: 79.5, calories: 1900, notes: '' },
                '2025-01-03': { weight: 79, calories: 1950, notes: '' }
            }
        };

        const result = Storage.importData(importData);

        expect(result.success).toBeTrue();
        expect(result.entriesImported).toBe(3);
        expect(result.entriesSkipped).toBe(0);
    });

    it('handles old imported data correctly', () => {
        // Simulate importing data from 3 months ago
        const oldData = {
            version: 1,
            exportedAt: '2025-11-01T00:00:00.000Z',
            settings: { weightUnit: 'kg' },
            entries: {
                '2025-11-01': { weight: 82, calories: 1700, notes: 'Old data' },
                '2025-11-02': { weight: 81.8, calories: 1750, notes: 'Old data' },
                '2025-11-03': { weight: 81.5, calories: 1800, notes: 'Old data' }
            }
        };

        const result = Storage.importData(oldData);

        expect(result.success).toBeTrue();
        expect(result.entriesImported).toBe(3);
        expect(Storage.getEntry('2025-11-01').weight).toBe(82);
    });

    it('validates date format during import', () => {
        const importData = {
            entries: {
                'invalid-date': { weight: 80 },
                '2025-02-02': { weight: 81 }
            }
        };

        const result = Storage.importData(importData);

        expect(result.entriesImported).toBe(1); // Only valid date imported
    });
});

describe('Storage.getStorageInfo', () => {
    it('returns storage statistics', () => {
        const info = Storage.getStorageInfo();

        expect(info.used).toBeGreaterThan(0);
        expect(info.entriesCount).toBeGreaterThan(0);
        expect(info.usedFormatted).toContain('Bytes');
    });
});

describe('Storage.exportData - sorted exports', () => {
    it('should sort entries by date (newest first)', () => {
        // Arrange - Clear storage and add entries in non-chronological order
        localStorage.clear();
        Storage.init();
        Storage.saveEntry('2026-03-10', { weight: 80.0, calories: 2000, notes: 'Day 1' });
        Storage.saveEntry('2026-03-15', { weight: 79.5, calories: 1900, notes: 'Day 2' });
        Storage.saveEntry('2026-03-12', { weight: 79.8, calories: 1950, notes: 'Day 3' });
        Storage.saveEntry('2026-03-18', { weight: 79.2, calories: 2100, notes: 'Day 4' });

        // Act - Export data
        const exported = Storage.exportData();
        const dates = Object.keys(exported.entries);

        // Assert - Verify dates are sorted newest first (descending order)
        expect(dates).toHaveLength(4);
        expect(dates[0]).toBe('2026-03-18'); // Newest
        expect(dates[1]).toBe('2026-03-15');
        expect(dates[2]).toBe('2026-03-12');
        expect(dates[3]).toBe('2026-03-10'); // Oldest
    });

    it('should handle unsorted input data', () => {
        // Arrange - Clear and add entries in random order
        localStorage.clear();
        Storage.init();
        Storage.saveEntry('2026-03-01', { weight: 82.0, calories: 2200, notes: '' });
        Storage.saveEntry('2026-03-20', { weight: 80.0, calories: 2000, notes: '' });
        Storage.saveEntry('2026-03-05', { weight: 81.5, calories: 2100, notes: '' });
        Storage.saveEntry('2026-03-15', { weight: 80.5, calories: 2050, notes: '' });
        Storage.saveEntry('2026-03-10', { weight: 81.0, calories: 2150, notes: '' });

        // Act - Export data
        const exported = Storage.exportData();
        const dates = Object.keys(exported.entries);

        // Assert - Verify correct descending order regardless of insertion order
        expect(dates).toHaveLength(5);
        expect(dates[0]).toBe('2026-03-20');
        expect(dates[1]).toBe('2026-03-15');
        expect(dates[2]).toBe('2026-03-10');
        expect(dates[3]).toBe('2026-03-05');
        expect(dates[4]).toBe('2026-03-01');
    });

    it('should handle empty entries', () => {
        // Arrange - Clear storage, no entries added
        localStorage.clear();
        Storage.init();

        // Act - Export data with no entries
        const exported = Storage.exportData();
        const dates = Object.keys(exported.entries);

        // Assert - Empty array returned
        expect(dates).toHaveLength(0);
        expect(exported.entries).toEqual({});
    });

    it('should handle single entry', () => {
        // Arrange - Clear and add one entry
        localStorage.clear();
        Storage.init();
        Storage.saveEntry('2026-03-13', { weight: 80.5, calories: 2000, notes: 'Single entry' });

        // Act - Export data
        const exported = Storage.exportData();
        const dates = Object.keys(exported.entries);

        // Assert - Single date in array
        expect(dates).toHaveLength(1);
        expect(dates[0]).toBe('2026-03-13');
        expect(exported.entries['2026-03-13'].weight).toBe(80.5);
    });

    it('should maintain sort order in pretty format', () => {
        // Arrange - Add multiple entries
        localStorage.clear();
        Storage.init();
        Storage.saveEntry('2026-03-11', { weight: 81.0, calories: 2100, notes: '' });
        Storage.saveEntry('2026-03-14', { weight: 80.5, calories: 2000, notes: '' });
        Storage.saveEntry('2026-03-12', { weight: 80.8, calories: 2050, notes: '' });

        // Act - Export and stringify (pretty format)
        const exported = Storage.exportData();
        const jsonString = JSON.stringify(exported, null, 2);
        const parsed = JSON.parse(jsonString);
        const dates = Object.keys(parsed.entries);

        // Assert - Sort order preserved after JSON serialization
        expect(dates).toHaveLength(3);
        expect(dates[0]).toBe('2026-03-14');
        expect(dates[1]).toBe('2026-03-12');
        expect(dates[2]).toBe('2026-03-11');
    });

    it('should maintain sort order in compact format', () => {
        // Arrange - Add multiple entries
        localStorage.clear();
        Storage.init();
        Storage.saveEntry('2026-03-08', { weight: 81.5, calories: 2150, notes: '' });
        Storage.saveEntry('2026-03-06', { weight: 81.8, calories: 2200, notes: '' });
        Storage.saveEntry('2026-03-10', { weight: 81.2, calories: 2100, notes: '' });

        // Act - Export and stringify (compact format)
        const exported = Storage.exportData();
        const jsonString = JSON.stringify(exported);
        const parsed = JSON.parse(jsonString);
        const dates = Object.keys(parsed.entries);

        // Assert - Sort order preserved in compact format
        expect(dates).toHaveLength(3);
        expect(dates[0]).toBe('2026-03-10');
        expect(dates[1]).toBe('2026-03-08');
        expect(dates[2]).toBe('2026-03-06');
    });

    it('should sort entries with same-day updates correctly', () => {
        // Arrange - Add entry and update it (simulating multiple saves on same day)
        localStorage.clear();
        Storage.init();
        Storage.saveEntry('2026-03-13', { weight: 80.0, calories: 2000, notes: 'Initial' });
        Storage.saveEntry('2026-03-13', { weight: 80.5, calories: 2100, notes: 'Updated' });
        Storage.saveEntry('2026-03-12', { weight: 80.2, calories: 2050, notes: '' });

        // Act - Export data
        const exported = Storage.exportData();
        const dates = Object.keys(exported.entries);

        // Assert - Only one entry per date, sorted correctly
        expect(dates).toHaveLength(2);
        expect(dates[0]).toBe('2026-03-13');
        expect(dates[1]).toBe('2026-03-12');
        expect(exported.entries['2026-03-13'].weight).toBe(80.5); // Updated value
    });

    it('should handle entries spanning multiple months', () => {
        // Arrange - Add entries across month boundaries
        localStorage.clear();
        Storage.init();
        Storage.saveEntry('2026-02-28', { weight: 82.0, calories: 2200, notes: '' });
        Storage.saveEntry('2026-03-01', { weight: 81.8, calories: 2150, notes: '' });
        Storage.saveEntry('2026-03-15', { weight: 80.5, calories: 2000, notes: '' });
        Storage.saveEntry('2026-04-01', { weight: 79.5, calories: 1900, notes: '' });

        // Act - Export data
        const exported = Storage.exportData();
        const dates = Object.keys(exported.entries);

        // Assert - Correct chronological order across months
        expect(dates).toHaveLength(4);
        expect(dates[0]).toBe('2026-04-01');
        expect(dates[1]).toBe('2026-03-15');
        expect(dates[2]).toBe('2026-03-01');
        expect(dates[3]).toBe('2026-02-28');
    });

    it('should handle entries spanning year boundaries', () => {
        // Arrange - Add entries across year boundary
        localStorage.clear();
        Storage.init();
        Storage.saveEntry('2025-12-30', { weight: 83.0, calories: 2300, notes: '' });
        Storage.saveEntry('2025-12-31', { weight: 82.8, calories: 2250, notes: '' });
        Storage.saveEntry('2026-01-01', { weight: 82.5, calories: 2200, notes: '' });
        Storage.saveEntry('2026-01-15', { weight: 81.5, calories: 2100, notes: '' });

        // Act - Export data
        const exported = Storage.exportData();
        const dates = Object.keys(exported.entries);

        // Assert - Correct order across years
        expect(dates).toHaveLength(4);
        expect(dates[0]).toBe('2026-01-15');
        expect(dates[1]).toBe('2026-01-01');
        expect(dates[2]).toBe('2025-12-31');
        expect(dates[3]).toBe('2025-12-30');
    });

    it('should include metadata in exported data', () => {
        // Arrange - Add entry and settings
        localStorage.clear();
        Storage.init();
        Storage.saveSettings({ weightUnit: 'kg', goalWeight: 75 });
        Storage.saveEntry('2026-03-13', { weight: 80.5, calories: 2000, notes: 'Test' });

        // Act - Export data
        const exported = Storage.exportData();

        // Assert - All metadata present and entries sorted
        expect(exported.version).toBeDefined();
        expect(exported.exportedAt).toBeDefined();
        expect(exported.settings.weightUnit).toBe('kg');
        expect(exported.settings.goalWeight).toBe(75);
        expect(Object.keys(exported.entries)).toHaveLength(1);
        expect(Object.keys(exported.entries)[0]).toBe('2026-03-13');
    });
});
