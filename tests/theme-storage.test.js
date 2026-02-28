/**
 * Theme Storage Tests
 * Tests for theme persistence in localStorage via Storage module
 * 
 * Run in browser: open tests/test-runner.html
 * Run in Node.js: node tests/node-test.js (storage tests included there)
 */

// Check environment - skip in Node.js since storage tests are already in node-test.js
if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.log('[Theme Storage Tests] Skipped - browser environment required');
    return;
}

// These tests run in browser environment

describe('Theme Storage - localStorage', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('Storage.saveSettings for theme', () => {
        it('saves theme setting to localStorage', () => {
            const result = Storage.saveSettings({ theme: 'dark' });
            expect(result).toBe(true);
            
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('dark');
        });

        it('saves light theme setting', () => {
            Storage.saveSettings({ theme: 'light' });
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('light');
        });

        it('saves system theme setting', () => {
            Storage.saveSettings({ theme: 'system' });
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('system');
        });

        it('merges theme with existing settings', () => {
            Storage.saveSettings({ weightUnit: 'lb', goalWeight: 70 });
            Storage.saveSettings({ theme: 'dark' });
            
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('dark');
            expect(settings.weightUnit).toBe('lb');
            expect(settings.goalWeight).toBe(70);
        });

        it('updates existing theme setting', () => {
            Storage.saveSettings({ theme: 'light' });
            Storage.saveSettings({ theme: 'dark' });
            
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('dark');
        });
    });

    describe('Storage.getSettings for theme', () => {
        it('returns default theme when none set', () => {
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('system');
        });

        it('returns saved theme', () => {
            localStorage.setItem('tdee_settings', JSON.stringify({ theme: 'dark' }));
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('dark');
        });

        it('returns default when localStorage has invalid JSON', () => {
            localStorage.setItem('tdee_settings', 'invalid-json');
            const settings = Storage.getSettings();
            // Should fall back to defaults without throwing
            expect(settings.theme).toBeDefined();
        });

        it('handles empty localStorage', () => {
            localStorage.clear();
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('system');
        });
    });

    describe('Storage.getDefaultSettings', () => {
        it('returns system as default theme', () => {
            const defaults = Storage.getDefaultSettings();
            expect(defaults.theme).toBe('system');
        });

        it('includes all required settings', () => {
            const defaults = Storage.getDefaultSettings();
            expect(defaults.weightUnit).toBeDefined();
            expect(defaults.calorieUnit).toBeDefined();
            expect(defaults.theme).toBeDefined();
            expect(defaults.gender).toBeDefined();
            expect(defaults.activityLevel).toBeDefined();
        });
    });

    describe('Theme round-trip', () => {
        it('theme survives init cycle', () => {
            Storage.saveSettings({ theme: 'dark' });
            Storage.init();
            
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('dark');
        });

        it('theme persists across multiple saves', () => {
            Storage.saveSettings({ theme: 'light' });
            Storage.saveSettings({ weightUnit: 'lb' });
            Storage.saveSettings({ activityLevel: 1.375 });
            
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('light');
            expect(settings.weightUnit).toBe('lb');
            expect(settings.activityLevel).toBe(1.375);
        });

        it('partial settings update preserves theme', () => {
            Storage.saveSettings({ theme: 'dark', weightUnit: 'kg' });
            Storage.saveSettings({ weightUnit: 'lb' });
            
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('dark');
            expect(settings.weightUnit).toBe('lb');
        });
    });

    // Negative tests
    describe('Error handling', () => {
        it('handles null settings gracefully', () => {
            const result = Storage.saveSettings(null);
            // Should not throw, may return error or be a no-op
            expect(result === true || result.success === false).toBe(true);
        });

        it('handles undefined settings gracefully', () => {
            const result = Storage.saveSettings(undefined);
            expect(result === true || result.success === false).toBe(true);
        });

        it('getSettings handles corrupted localStorage', () => {
            localStorage.setItem('tdee_settings', null);
            const settings = Storage.getSettings();
            expect(settings).toBeDefined();
            expect(settings.theme).toBeDefined();
        });
    });
});

// Additional test for theme-specific storage keys
describe('Storage key structure', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
    });

    it('settings stored under correct key', () => {
        Storage.saveSettings({ theme: 'dark' });
        
        const stored = localStorage.getItem('tdee_settings');
        const parsed = JSON.parse(stored);
        
        expect(parsed.theme).toBe('dark');
    });
});
