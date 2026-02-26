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
        expect(Storage.getEntry('2025-02-01').weight).toBe(83);
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
