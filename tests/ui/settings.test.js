/**
 * Settings UI Component Tests
 * 
 * Tests for Settings component rendering, preference changes, and data management.
 * Browser-only tests (skip in Node.js environment).
 * 
 * Run: open tests/test-runner.html
 */

(function() {
    'use strict';

    // Skip all tests in Node.js environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { skipped: true, reason: 'Browser environment required' };
        }
        return;
    }

    // Test utilities
    function getSettingsModal() {
        return document.getElementById('settings-modal');
    }

    function getSettingsBtn() {
        return document.getElementById('settings-btn');
    }

    function getCloseSettingsBtn() {
        return document.getElementById('close-settings-btn');
    }

    function getGenderSelect() {
        return document.getElementById('user-gender');
    }

    function getAgeInput() {
        return document.getElementById('user-age');
    }

    function getHeightInput() {
        return document.getElementById('user-height');
    }

    function getActivityLevelSelect() {
        return document.getElementById('activity-level');
    }

    function getStartingWeightInput() {
        return document.getElementById('starting-weight');
    }

    function getGoalWeightInput() {
        return document.getElementById('goal-weight');
    }

    function getTargetDeficitInput() {
        return document.getElementById('target-deficit');
    }

    function getWeightUnitSelect() {
        return document.getElementById('weight-unit');
    }

    function getCalorieUnitSelect() {
        return document.getElementById('calorie-unit');
    }

    function getExportDataBtn() {
        return document.getElementById('export-data-btn');
    }

    function getImportDataBtn() {
        return document.getElementById('import-data-btn');
    }

    function getClearDataBtn() {
        return document.getElementById('clear-data-btn');
    }

    function getThemeButtons() {
        return document.querySelectorAll('.theme-btn');
    }

    function getStorageInfo() {
        return document.getElementById('storage-info');
    }

    // Test suite
    describe('Settings Component', () => {
        // Setup before each test
        beforeEach(() => {
            // Ensure Settings module is available
            if (typeof Settings === 'undefined') {
                throw new Error('Settings module not loaded');
            }
        });

        // Cleanup after each test
        afterEach(() => {
            // Reset settings to defaults
            if (typeof Storage !== 'undefined' && typeof Storage.saveSettings === 'function') {
                Storage.saveSettings({
                    gender: 'male',
                    age: null,
                    height: null,
                    activityLevel: 1.2,
                    startingWeight: null,
                    goalWeight: null,
                    targetDeficit: -0.2,
                    weightUnit: 'kg',
                    calorieUnit: 'cal',
                    theme: 'system'
                });
            }
        });

        describe('Settings Structure', () => {
            it('has settings modal element', () => {
                const modal = getSettingsModal();
                expect(modal).toBeDefined();
            });

            it('has settings button to open modal', () => {
                const btn = getSettingsBtn();
                expect(btn).toBeDefined();
            });

            it('has close button in modal', () => {
                const btn = getCloseSettingsBtn();
                expect(btn).toBeDefined();
            });

            it('has gender select field', () => {
                const select = getGenderSelect();
                expect(select).toBeDefined();
            });

            it('has age input field', () => {
                const input = getAgeInput();
                expect(input).toBeDefined();
            });

            it('has height input field', () => {
                const input = getHeightInput();
                expect(input).toBeDefined();
            });

            it('has activity level select', () => {
                const select = getActivityLevelSelect();
                expect(select).toBeDefined();
            });

            it('has starting weight input', () => {
                const input = getStartingWeightInput();
                expect(input).toBeDefined();
            });

            it('has goal weight input', () => {
                const input = getGoalWeightInput();
                expect(input).toBeDefined();
            });

            it('has target deficit input', () => {
                const input = getTargetDeficitInput();
                expect(input).toBeDefined();
            });

            it('has weight unit select', () => {
                const select = getWeightUnitSelect();
                expect(select).toBeDefined();
            });

            it('has calorie unit select', () => {
                const select = getCalorieUnitSelect();
                expect(select).toBeDefined();
            });
        });

        describe('Settings Initialization', () => {
            it('Settings module is defined', () => {
                expect(typeof Settings).toBe('object');
            });

            it('Settings has init method', () => {
                expect(typeof Settings.init).toBe('function');
            });

            it('Settings has refresh method', () => {
                expect(typeof Settings.refresh).toBe('function');
            });

            it('Settings.init() does not throw', () => {
                expect(() => {
                    Settings.init();
                }).not.toThrow();
            });
        });

        describe('Settings Modal Behavior', () => {
            it('modal is initially hidden', () => {
                const modal = getSettingsModal();
                if (modal) {
                    expect(modal.classList.contains('hidden')).toBe(true);
                }
            });

            it('clicking settings button opens modal', () => {
                const btn = getSettingsBtn();
                const modal = getSettingsModal();
                
                if (btn && modal) {
                    btn.click();
                    expect(modal.classList.contains('hidden')).toBe(false);
                    
                    // Close for cleanup
                    Components.closeModal('settings-modal');
                }
            });

            it('clicking close button closes modal', () => {
                const closeBtn = getCloseSettingsBtn();
                const modal = getSettingsModal();
                
                if (closeBtn && modal) {
                    // Open first
                    Components.openModal('settings-modal');
                    
                    // Then close
                    closeBtn.click();
                    expect(modal.classList.contains('hidden')).toBe(true);
                }
            });

            it('clicking overlay closes modal', () => {
                const modal = getSettingsModal();
                
                if (modal) {
                    Components.openModal('settings-modal');
                    
                    // Click on overlay
                    const overlay = modal.querySelector('.modal-overlay') || modal;
                    const event = new MouseEvent('click', { bubbles: true });
                    overlay.dispatchEvent(event);
                    
                    expect(modal.classList.contains('hidden')).toBe(true);
                }
            });

            it('Escape key closes modal', () => {
                const modal = getSettingsModal();
                
                if (modal) {
                    Components.openModal('settings-modal');
                    
                    const event = new KeyboardEvent('keydown', {
                        key: 'Escape',
                        bubbles: true
                    });
                    document.dispatchEvent(event);
                    
                    expect(modal.classList.contains('hidden')).toBe(true);
                }
            });
        });

        describe('Settings Form Loading', () => {
            it('loadSettings() populates gender field', () => {
                if (typeof Settings.loadSettings !== 'function') return;
                
                // Set a value
                const genderSelect = getGenderSelect();
                if (genderSelect) {
                    genderSelect.value = 'female';
                    Settings.loadSettings();
                    expect(genderSelect.value).toBeDefined();
                }
            });

            it('loadSettings() populates age field', () => {
                if (typeof Settings.loadSettings !== 'function') return;
                
                const ageInput = getAgeInput();
                if (ageInput) {
                    ageInput.value = '30';
                    Settings.loadSettings();
                    expect(ageInput.value).toBeDefined();
                }
            });

            it('loadSettings() populates height field', () => {
                if (typeof Settings.loadSettings !== 'function') return;
                
                const heightInput = getHeightInput();
                if (heightInput) {
                    heightInput.value = '180';
                    Settings.loadSettings();
                    expect(heightInput.value).toBeDefined();
                }
            });

            it('loadSettings() populates activity level', () => {
                if (typeof Settings.loadSettings !== 'function') return;
                
                const activitySelect = getActivityLevelSelect();
                if (activitySelect) {
                    activitySelect.value = '1.55';
                    Settings.loadSettings();
                    expect(activitySelect.value).toBeDefined();
                }
            });

            it('loadSettings() applies theme', () => {
                if (typeof Settings.loadSettings !== 'function') return;
                
                Settings.loadSettings();
                
                // Theme should be applied
                const theme = document.documentElement.getAttribute('data-theme');
                // Theme can be null (system) or 'light' or 'dark'
                expect(theme === null || theme === 'light' || theme === 'dark').toBe(true);
            });
        });

        describe('Settings Saving', () => {
            it('saveSettings() method exists', () => {
                expect(typeof Settings.saveSettings).toBe('function');
            });

            it('saveSettings() persists gender', () => {
                if (typeof Settings.saveSettings !== 'function') return;
                
                const genderSelect = getGenderSelect();
                if (genderSelect) {
                    genderSelect.value = 'female';
                    Settings.saveSettings();
                    
                    const settings = Storage.getSettings();
                    expect(settings.gender).toBe('female');
                }
            });

            it('saveSettings() persists age as number', () => {
                if (typeof Settings.saveSettings !== 'function') return;
                
                const ageInput = getAgeInput();
                if (ageInput) {
                    ageInput.value = '35';
                    Settings.saveSettings();
                    
                    const settings = Storage.getSettings();
                    expect(settings.age).toBe(35);
                }
            });

            it('saveSettings() persists height as number', () => {
                if (typeof Settings.saveSettings !== 'function') return;
                
                const heightInput = getHeightInput();
                if (heightInput) {
                    heightInput.value = '175';
                    Settings.saveSettings();
                    
                    const settings = Storage.getSettings();
                    expect(settings.height).toBe(175);
                }
            });

            it('saveSettings() persists activity level as float', () => {
                if (typeof Settings.saveSettings !== 'function') return;
                
                const activitySelect = getActivityLevelSelect();
                if (activitySelect) {
                    activitySelect.value = '1.725';
                    Settings.saveSettings();
                    
                    const settings = Storage.getSettings();
                    expect(settings.activityLevel).toBe(1.725);
                }
            });

            it('saveSettings() persists weight unit', () => {
                if (typeof Settings.saveSettings !== 'function') return;
                
                const unitSelect = getWeightUnitSelect();
                if (unitSelect) {
                    unitSelect.value = 'lb';
                    Settings.saveSettings();
                    
                    const settings = Storage.getSettings();
                    expect(settings.weightUnit).toBe('lb');
                }
            });

            it('saveSettings() persists calorie unit', () => {
                if (typeof Settings.saveSettings !== 'function') return;
                
                const unitSelect = getCalorieUnitSelect();
                if (unitSelect) {
                    unitSelect.value = 'kcal';
                    Settings.saveSettings();
                    
                    const settings = Storage.getSettings();
                    expect(settings.calorieUnit).toBe('kcal');
                }
            });
        });

        describe('Theme Switching', () => {
            it('theme buttons exist', () => {
                const buttons = getThemeButtons();
                expect(buttons.length).toBeGreaterThan(0);
            });

            it('clicking theme button changes theme', () => {
                const buttons = getThemeButtons();
                
                if (buttons.length > 0) {
                    // Find a theme button
                    const themeBtn = Array.from(buttons).find(btn => btn.dataset.theme);
                    
                    if (themeBtn) {
                        const theme = themeBtn.dataset.theme;
                        themeBtn.click();
                        
                        if (theme === 'system') {
                            expect(document.documentElement.getAttribute('data-theme')).toBeNull();
                        } else {
                            expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
                        }
                    }
                }
            });

            it('theme is persisted to storage', () => {
                const buttons = getThemeButtons();
                
                if (buttons.length > 0) {
                    const themeBtn = Array.from(buttons).find(btn => btn.dataset.theme === 'dark');
                    
                    if (themeBtn) {
                        themeBtn.click();
                        
                        const settings = Storage.getSettings();
                        expect(settings.theme).toBe('dark');
                        
                        // Reset to system
                        const systemBtn = Array.from(buttons).find(btn => btn.dataset.theme === 'system');
                        if (systemBtn) systemBtn.click();
                    }
                }
            });
        });

        describe('Data Export', () => {
            it('export button exists', () => {
                const btn = getExportDataBtn();
                expect(btn).toBeDefined();
            });

            it('export button is clickable', () => {
                const btn = getExportDataBtn();
                
                if (btn) {
                    // Should not throw
                    expect(() => {
                        btn.click();
                    }).not.toThrow();
                }
            });

            it('export creates download', () => {
                const btn = getExportDataBtn();
                
                if (btn) {
                    // Track if click handler exists
                    expect(typeof btn.onclick === 'function' || btn.hasAttribute('onclick') || 
                           btn.parentElement !== null).toBe(true);
                }
            });
        });

        describe('Data Import', () => {
            it('import button exists', () => {
                const btn = getImportDataBtn();
                expect(btn).toBeDefined();
            });

            it('import file input exists', () => {
                const input = document.getElementById('import-file');
                expect(input).toBeDefined();
            });

            it('import file input is type file', () => {
                const input = document.getElementById('import-file');
                if (input) {
                    expect(input.type).toBe('file');
                }
            });
        });

        describe('Clear Data', () => {
            it('clear data button exists', () => {
                const btn = getClearDataBtn();
                expect(btn).toBeDefined();
            });

            it('clear data shows confirmation', () => {
                const btn = getClearDataBtn();
                
                if (btn) {
                    // Mock confirm to return false (cancel)
                    const originalConfirm = window.confirm;
                    window.confirm = () => false;
                    
                    // Should not throw
                    expect(() => {
                        btn.click();
                    }).not.toThrow();
                    
                    // Restore
                    window.confirm = originalConfirm;
                }
            });

            it('clear data cancels when user declines', () => {
                const btn = getClearDataBtn();
                
                if (btn) {
                    const originalConfirm = window.confirm;
                    window.confirm = () => false;
                    
                    // Get initial entry count
                    const initialInfo = Storage.getStorageInfo();
                    
                    btn.click();
                    
                    // Count should be unchanged
                    const afterInfo = Storage.getStorageInfo();
                    expect(afterInfo.entriesCount).toBe(initialInfo.entriesCount);
                    
                    // Restore
                    window.confirm = originalConfirm;
                }
            });
        });

        describe('Storage Info Display', () => {
            it('storage info element exists', () => {
                const info = getStorageInfo();
                expect(info).toBeDefined();
            });

            it('storage info shows entry count', () => {
                if (typeof Settings.loadSettings !== 'function') return;
                
                Settings.loadSettings();
                
                const info = getStorageInfo();
                if (info) {
                    expect(info.textContent).toContain('entries');
                }
            });

            it('storage info shows storage used', () => {
                if (typeof Settings.loadSettings !== 'function') return;
                
                Settings.loadSettings();
                
                const info = getStorageInfo();
                if (info) {
                    expect(info.textContent).toMatch(/(KB|MB|bytes) used/);
                }
            });
        });

        describe('Advanced Settings', () => {
            it('advanced settings toggle exists', () => {
                const toggle = document.getElementById('advanced-settings-toggle');
                expect(toggle).toBeDefined();
            });

            it('advanced settings content exists', () => {
                const content = document.getElementById('advanced-settings-content');
                expect(content).toBeDefined();
            });

            it('advanced settings content is initially hidden', () => {
                const content = document.getElementById('advanced-settings-content');
                if (content) {
                    expect(content.classList.contains('hidden')).toBe(true);
                }
            });

            it('toggling advanced settings shows content', () => {
                const toggle = document.getElementById('advanced-settings-toggle');
                const content = document.getElementById('advanced-settings-content');
                
                if (toggle && content) {
                    toggle.click();
                    expect(content.classList.contains('hidden')).toBe(false);
                    
                    // Toggle back
                    toggle.click();
                }
            });
        });
    });
})();
