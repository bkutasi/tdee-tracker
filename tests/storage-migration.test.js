/**
 * Storage Migration and Data Preservation Tests
 * Tests for schema migration, data integrity, and import/export
 * 
 * Known issues being tested:
 * - Storage migration may be corrupting data (91 entries → 0 entries)
 * - Entry structure preservation during migration
 * - Import/export round-trip data integrity
 */

// Skip in Node.js environment (browser-only tests)
if (typeof describe === 'undefined') {
    console.log('[storage-migration.test.js] Skipping browser-only tests in Node.js');
} else {

// Mock localStorage for Node.js environment
const mockLocalStorage = {
    data: {},
    getItem(key) {
        return this.data[key] || null;
    },
    setItem(key, value) {
        this.data[key] = value;
    },
    removeItem(key) {
        delete this.data[key];
    },
    clear() {
        this.data = {};
    }
};

global.localStorage = mockLocalStorage;

describe('Storage Schema Migration', () => {

    // Positive: v0 to v1 migration initializes defaults
    it('migrates from v0 to v1 and initializes defaults', () => {
        mockLocalStorage.clear();
        // Start with no schema version (v0)
        expect(localStorage.getItem('tdee_schema_version')).toBeNull();
        expect(localStorage.getItem('tdee_settings')).toBeNull();
        expect(localStorage.getItem('tdee_entries')).toBeNull();
        
        // Initialize storage (triggers migration)
        Storage.init();
        
        // Verify migration occurred
        expect(localStorage.getItem('tdee_schema_version')).toBe('1');
        
        // Verify defaults were created
        const settings = JSON.parse(localStorage.getItem('tdee_settings'));
        expect(settings).toBeDefined();
        expect(settings.weightUnit).toBe('kg');
        
        const entries = JSON.parse(localStorage.getItem('tdee_entries'));
        expect(entries).toEqual({});
    });

    // Positive: v1 storage doesn't re-migrate
    it('does not re-migrate if already at v1', () => {
        // Start at v1
        localStorage.setItem('tdee_schema_version', '1');
        localStorage.setItem('tdee_settings', JSON.stringify({ weightUnit: 'lb' }));
        localStorage.setItem('tdee_entries', JSON.stringify({ '2026-01-01': { weight: 80 } }));
        
        // Initialize (should not change anything)
        Storage.init();
        
        // Verify data unchanged
        expect(localStorage.getItem('tdee_schema_version')).toBe('1');
        const settings = JSON.parse(localStorage.getItem('tdee_settings'));
        expect(settings.weightUnit).toBe('lb'); // Custom value preserved
    });

    // Positive: migration preserves existing entries
    it('preserves existing entries during migration', () => {
        // Pre-populate with entries (simulating existing data)
        const existingEntries = {
            '2026-01-01': { weight: 80, calories: 1600, notes: 'Day 1' },
            '2026-01-02': { weight: 79.5, calories: 1700, notes: 'Day 2' },
            '2026-01-03': { weight: 79.8, calories: null, notes: '' }
        };
        localStorage.setItem('tdee_entries', JSON.stringify(existingEntries));
        
        // Initialize (triggers migration)
        Storage.init();
        
        // Verify entries preserved
        const migratedEntries = JSON.parse(localStorage.getItem('tdee_entries'));
        expect(Object.keys(migratedEntries).length).toBe(3);
        expect(migratedEntries['2026-01-01'].weight).toBe(80);
        expect(migratedEntries['2026-01-02'].weight).toBe(79.5);
    });
});

describe('Storage Data Preservation', () => {

    // Positive: entry structure preservation
    it('preserves complete entry structure (date, weight, calories, notes)', () => {
        mockLocalStorage.clear();
        Storage.init();
        const entry = {
            weight: 80.5,
            calories: 1600,
            notes: 'Test entry with notes'
        };
        
        const result = Storage.saveEntry('2026-02-26', entry);
        expect(result).toBeTrue();
        
        const retrieved = Storage.getEntry('2026-02-26');
        expect(retrieved).toBeDefined();
        expect(retrieved.weight).toBe(80.5);
        expect(retrieved.calories).toBe(1600);
        expect(retrieved.notes).toBe('Test entry with notes');
        expect(retrieved.updatedAt).toBeDefined();
    });

    // Positive: partial entry structure
    it('preserves partial entries (weight only)', () => {
        const entry = { weight: 80 };
        
        Storage.saveEntry('2026-02-26', entry);
        const retrieved = Storage.getEntry('2026-02-26');
        
        expect(retrieved.weight).toBe(80);
        expect(retrieved.calories).toBeNull();
        expect(retrieved.notes).toBe('');
    });

    // Positive: entry count preservation
    it('preserves entry count after multiple saves', () => {
        // Save 91 entries (simulating the reported issue)
        const entriesToSave = 91;
        for (let i = 0; i < entriesToSave; i++) {
            const date = new Date('2026-01-01');
            date.setDate(date.getDate() + i);
            const dateStr = Utils.formatDate(date);
            
            Storage.saveEntry(dateStr, {
                weight: 80 + (i * 0.1),
                calories: 1600 + (i * 10),
                notes: `Entry ${i + 1}`
            });
        }
        
        // Verify count
        const allEntries = Storage.getAllEntries();
        expect(Object.keys(allEntries).length).toBe(entriesToSave);
    });

    // Positive: entry retrieval after bulk save
    it('retrieves all entries after bulk save', () => {
        // Save 91 entries
        const entriesToSave = 91;
        for (let i = 0; i < entriesToSave; i++) {
            const date = new Date('2026-01-01');
            date.setDate(date.getDate() + i);
            const dateStr = Utils.formatDate(date);
            
            Storage.saveEntry(dateStr, {
                weight: 80 + (i * 0.1),
                calories: 1600
            });
        }
        
        // Verify we can retrieve entries
        const firstEntry = Storage.getEntry('2026-01-01');
        expect(firstEntry).toBeDefined();
        expect(firstEntry.weight).toBe(80);
        
        const lastEntry = Storage.getEntry('2026-03-31');
        expect(lastEntry).toBeDefined();
        expect(lastEntry.weight).toBeCloseTo(89, 1);
    });

    // Positive: getEntriesInRange returns correct count
    it('getEntriesInRange returns correct entry count', () => {
        // Save 10 entries
        for (let i = 0; i < 10; i++) {
            const date = new Date('2026-01-01');
            date.setDate(date.getDate() + i);
            const dateStr = Utils.formatDate(date);
            
            Storage.saveEntry(dateStr, {
                weight: 80,
                calories: 1600
            });
        }
        
        // Query range
        const entries = Storage.getEntriesInRange('2026-01-01', '2026-01-10');
        
        // Should return 10 entries (including gap days with null values)
        expect(entries).toHaveLength(10);
        
        // Verify all have dates
        entries.forEach((entry, index) => {
            expect(entry.date).toBeDefined();
        });
    });
});

describe('Storage Import/Export Round Trip', () => {

    // Positive: export contains all data
    it('exports all data with correct structure', () => {
        mockLocalStorage.clear();
        Storage.init();
    });

    // Positive: export contains all data
    it('exports all data with correct structure', () => {
        // Save some data
        Storage.saveEntry('2026-01-01', { weight: 80, calories: 1600, notes: 'Test' });
        Storage.saveSettings({ weightUnit: 'lb', goalWeight: 75 });
        
        // Export
        const exported = Storage.exportData();
        
        // Verify structure
        expect(exported.version).toBe(Storage.CURRENT_SCHEMA_VERSION);
        expect(exported.exportedAt).toBeDefined();
        expect(exported.settings).toBeDefined();
        expect(exported.entries).toBeDefined();
        
        // Verify data
        expect(exported.settings.weightUnit).toBe('lb');
        expect(exported.entries['2026-01-01'].weight).toBe(80);
    });

    // Positive: import preserves entry count
    it('imports and preserves entry count', () => {
        // Create export data with 91 entries
        const exportData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            settings: { weightUnit: 'kg' },
            entries: {}
        };
        
        for (let i = 0; i < 91; i++) {
            const date = new Date('2026-01-01');
            date.setDate(date.getDate() + i);
            const dateStr = Utils.formatDate(date);
            
            exportData.entries[dateStr] = {
                weight: 80 + (i * 0.1),
                calories: 1600 + (i * 10),
                notes: `Entry ${i + 1}`,
                updatedAt: new Date().toISOString()
            };
        }
        
        // Import
        const result = Storage.importData(exportData);
        
        // Verify import success
        expect(result.success).toBeTrue();
        expect(result.entriesImported).toBe(91);
        expect(result.entriesSkipped).toBe(0);
        
        // Verify count
        const allEntries = Storage.getAllEntries();
        expect(Object.keys(allEntries).length).toBe(91);
    });

    // Positive: import preserves entry structure
    it('imports and preserves entry structure', () => {
        const exportData = {
            version: 1,
            settings: { weightUnit: 'kg' },
            entries: {
                '2026-01-15': {
                    weight: 82.5,
                    calories: 1700,
                    notes: 'Important notes',
                    updatedAt: new Date().toISOString()
                }
            }
        };
        
        Storage.importData(exportData);
        
        const entry = Storage.getEntry('2026-01-15');
        expect(entry.weight).toBe(82.5);
        expect(entry.calories).toBe(1700);
        expect(entry.notes).toBe('Important notes');
        expect(entry.updatedAt).toBeDefined();
    });

    // Positive: round-trip preserves data
    it('export → import round-trip preserves all data', () => {
        // Create initial data
        Storage.saveEntry('2026-01-01', { weight: 80, calories: 1600, notes: 'Day 1' });
        Storage.saveEntry('2026-01-02', { weight: 79.5, calories: 1700, notes: 'Day 2' });
        Storage.saveSettings({ weightUnit: 'lb', goalWeight: 70 });
        
        // Export
        const exported = Storage.exportData();
        
        // Clear storage
        mockLocalStorage.clear();
        Storage.init();
        
        // Import
        const importResult = Storage.importData(exported);
        
        // Verify
        expect(importResult.success).toBeTrue();
        expect(importResult.entriesImported).toBe(2);
        
        const entry1 = Storage.getEntry('2026-01-01');
        expect(entry1.weight).toBe(80);
        expect(entry1.calories).toBe(1600);
        
        const entry2 = Storage.getEntry('2026-01-02');
        expect(entry2.weight).toBe(79.5);
        
        const settings = Storage.getSettings();
        expect(settings.weightUnit).toBe('lb');
        expect(settings.goalWeight).toBe(70);
    });

    // Negative: import with invalid dates
    it('skips entries with invalid date formats', () => {
        const exportData = {
            version: 1,
            settings: {},
            entries: {
                '2026-01-01': { weight: 80, calories: 1600 }, // Valid
                'invalid-date': { weight: 81, calories: 1700 }, // Invalid
                '01-02-2026': { weight: 82, calories: 1800 }, // Wrong format
                '2026-01-03': { weight: 83, calories: 1900 } // Valid
            }
        };
        
        const result = Storage.importData(exportData);
        
        // Only valid dates should be imported
        expect(result.success).toBeTrue();
        expect(result.entriesImported).toBe(2);
        expect(result.entriesSkipped).toBe(2);
        
        // Verify only valid entries exist
        const allEntries = Storage.getAllEntries();
        expect(Object.keys(allEntries).length).toBe(2);
        expect(allEntries['2026-01-01']).toBeDefined();
        expect(allEntries['2026-01-03']).toBeDefined();
    });

    // Negative: import sanitizes malicious data
    it('sanitizes HTML/script tags in notes during import', () => {
        const exportData = {
            version: 1,
            settings: {},
            entries: {
                '2026-01-01': {
                    weight: 80,
                    calories: 1600,
                    notes: '<script>alert("XSS")</script>Malicious notes'
                }
            }
        };
        
        const result = Storage.importData(exportData);
        expect(result.success).toBeTrue();
        
        const entry = Storage.getEntry('2026-01-01');
        // Script tags should be removed
        expect(entry.notes.includes('<script>')).toBeFalse();
        expect(entry.notes.includes('</script>')).toBeFalse();
    });
});

describe('Storage Date Validation Integration', () => {

    // Positive: saveEntry validates date format
    it('saveEntry validates date format before saving', () => {
        mockLocalStorage.clear();
        Storage.init();
        const result = Storage.saveEntry('invalid-date', { weight: 80 });
        expect(result.success).toBeFalse();
        expect(result.code).toBe('INVALID_FORMAT');
    });

    // Positive: saveEntry accepts valid date
    it('saveEntry accepts valid YYYY-MM-DD date', () => {
        const result = Storage.saveEntry('2026-02-26', { weight: 80 });
        expect(result).toBeTrue();
    });

    // Positive: getEntry validates date format
    it('getEntry validates date format before retrieving', () => {
        const result = Storage.getEntry('invalid-date');
        expect(result).toBeNull();
    });

    // Positive: getEntriesInRange validates date range
    it('getEntriesInRange validates date range', () => {
        // Invalid start date
        const result1 = Storage.getEntriesInRange('bad', '2026-01-31');
        expect(result1).toEqual([]);
        
        // Invalid end date
        const result2 = Storage.getEntriesInRange('2026-01-01', 'bad');
        expect(result2).toEqual([]);
        
        // Start > end
        const result3 = Storage.getEntriesInRange('2026-01-31', '2026-01-01');
        expect(result3).toEqual([]);
        
        // Range too large
        const result4 = Storage.getEntriesInRange('2020-01-01', '2026-01-01');
        expect(result4).toEqual([]);
    });

    // Positive: deleteEntry validates date format
    it('deleteEntry validates date format', () => {
        const result = Storage.deleteEntry('invalid-date');
        expect(result.success).toBeFalse();
        expect(result.code).toBe('INVALID_FORMAT');
    });

    // Edge case: null date handling
    it('handles null date gracefully', () => {
        const saveResult = Storage.saveEntry(null, { weight: 80 });
        expect(saveResult.success).toBeFalse();
        
        const getResult = Storage.getEntry(null);
        expect(getResult).toBeNull();
        
        const deleteResult = Storage.deleteEntry(null);
        expect(deleteResult.success).toBeFalse();
    });
});

describe('Storage Entry Count Regression Test', () => {

    // Regression test for: "91 entries → 0 entries" issue
    it('preserves 91 entries through migration and retrieval', () => {
        mockLocalStorage.clear();
        // Setup: Create 91 entries
        mockLocalStorage.setItem('tdee_schema_version', '0');
        const entries = {};
        for (let i = 0; i < 91; i++) {
            const date = new Date('2026-01-01');
            date.setDate(date.getDate() + i);
            const dateStr = Utils.formatDate(date);
            entries[dateStr] = {
                weight: 80 + (i * 0.1),
                calories: 1600 + (i * 10),
                notes: `Entry ${i + 1}`,
                updatedAt: new Date().toISOString()
            };
        }
        mockLocalStorage.setItem('tdee_entries', JSON.stringify(entries));
        
        // Act: Run migration
        Storage.init();
        
        // Assert: Entry count preserved
        const allEntries = Storage.getAllEntries();
        expect(Object.keys(allEntries).length).toBe(91);
        
        // Assert: Can query entries
        const range = Storage.getEntriesInRange('2026-01-01', '2026-03-31');
        expect(range.length).toBe(91);
        
        // Assert: Data integrity
        expect(allEntries['2026-01-01'].weight).toBe(80);
        expect(allEntries['2026-03-31'].weight).toBeCloseTo(89, 1);
    });
});

} // End of browser-only guard
