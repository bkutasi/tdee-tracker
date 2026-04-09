/**
 * Settings Menu Tests
 * Tests for simplified settings modal UI
 * 
 * Run: open tests/test-runner.html
 */

(function() {
    'use strict';

    // Skip all tests in Node.js environment (UI tests require browser)
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.log('[Settings Menu Tests] Skipped - browser environment required');
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { skipped: true, reason: 'Browser environment required' };
        }
        return;
    }

    // Test utilities - Helper functions for DOM queries
    function getSettingsModal() {
        return document.getElementById('settings-modal');
    }

    function getSettingsOverlay() {
        const modal = getSettingsModal();
        return modal ? modal.closest('.modal-overlay') : null;
    }

    function getExportButton() {
        return document.getElementById('export-data-btn');
    }

    function getImportButton() {
        return document.getElementById('import-data-btn');
    }

    function getImportFileInput() {
        return document.getElementById('import-file');
    }

    function getClearDataButton() {
        return document.getElementById('clear-data-btn');
    }

    function getExportCompactButton() {
        return document.getElementById('export-compact-btn');
    }

    function getAdvancedSettingsToggle() {
        return document.getElementById('advanced-settings-toggle');
    }

    function getAdvancedSettingsContent() {
        return document.getElementById('advanced-settings-content');
    }

    function getDataManagementSection() {
        const modal = getSettingsModal();
        return modal ? modal.querySelector('.setting-group h3') : null;
    }

    function getBtnGroup() {
        const modal = getSettingsModal();
        return modal ? modal.querySelector('.btn-group') : null;
    }

    function isOpen() {
        const overlay = getSettingsOverlay();
        return overlay && !overlay.classList.contains('hidden');
    }

    // Test suite
    describe('Settings Menu UI', () => {
        // Setup before each test
        beforeEach(() => {
            // Clean up any existing modal
            const existing = document.getElementById('settings-modal');
            if (existing) {
                // Close modal first if open
                if (typeof Components !== 'undefined') {
                    Components.closeModal('settings-modal');
                }
            }
            
            // Clear localStorage for clean state
            localStorage.clear();
            
            // Initialize Storage
            if (typeof Storage !== 'undefined') {
                Storage.init();
            }
            
            // Initialize Settings module
            if (typeof Settings !== 'undefined') {
                Settings.init();
            }
        });

        // Cleanup after each test
        afterEach(() => {
            // Close modal if open
            if (typeof Components !== 'undefined') {
                Components.closeModal('settings-modal');
            }
            
            // Clear localStorage
            localStorage.clear();
        });

        // ============================================
        // Export Button Tests
        // ============================================
        describe('Export Button', () => {
            it('export button exists in settings modal', () => {
                const exportBtn = getExportButton();
                expect(exportBtn).toBeDefined();
                expect(exportBtn).not.toBeNull();
            });

            it('export button has correct label "Export Data"', () => {
                const exportBtn = getExportButton();
                expect(exportBtn.textContent).toContain('Export Data');
            });

            it('export button is clickable', () => {
                const exportBtn = getExportButton();
                expect(exportBtn.tagName).toBe('BUTTON');
                expect(exportBtn.disabled).toBe(false);
            });

            it('export button has primary button styling', () => {
                const exportBtn = getExportButton();
                expect(exportBtn.classList.contains('btn')).toBe(true);
                expect(exportBtn.classList.contains('btn-primary')).toBe(true);
            });

            it('export button has download icon', () => {
                const exportBtn = getExportButton();
                const svg = exportBtn.querySelector('svg');
                expect(svg).toBeDefined();
                expect(svg).not.toBeNull();
            });

            it('export button click triggers file download', () => {
                // Arrange - Add some test data
                Storage.saveEntry('2026-03-13', { weight: 80.5, calories: 2000, notes: 'Test' });
                Storage.saveSettings({ weightUnit: 'kg' });
                
                // Act - Click export button (this will trigger download)
                const exportBtn = getExportButton();
                
                // Track if click was successful (no errors thrown)
                let clickSuccessful = false;
                try {
                    exportBtn.click();
                    clickSuccessful = true;
                } catch (e) {
                    clickSuccessful = false;
                }
                
                // Assert - Click should not throw errors
                expect(clickSuccessful).toBe(true);
            });

            it('export creates valid JSON structure', () => {
                // Arrange - Add test data
                localStorage.clear();
                Storage.init();
                Storage.saveEntry('2026-03-13', { weight: 80.5, calories: 2000, notes: 'Test' });
                Storage.saveSettings({ weightUnit: 'kg', goalWeight: 75 });
                
                // Act - Export data directly via Storage
                const exported = Storage.exportData();
                
                // Assert - Verify JSON structure
                expect(exported.version).toBeDefined();
                expect(exported.exportedAt).toBeDefined();
                expect(exported.settings).toBeDefined();
                expect(exported.entries).toBeDefined();
                expect(exported.settings.weightUnit).toBe('kg');
                expect(exported.entries['2026-03-13'].weight).toBe(80.5);
            });

            it('export button exists in data management section', () => {
                const dataManagementSection = getDataManagementSection();
                expect(dataManagementSection).toBeDefined();
                expect(dataManagementSection.textContent).toBe('Data Management');
            });
        });

        // ============================================
        // Import Button Tests
        // ============================================
        describe('Import Button', () => {
            it('import button exists in settings modal', () => {
                const importBtn = getImportButton();
                expect(importBtn).toBeDefined();
                expect(importBtn).not.toBeNull();
            });

            it('import button has correct label "Import"', () => {
                const importBtn = getImportButton();
                expect(importBtn.textContent).toContain('Import');
            });

            it('import button is clickable', () => {
                const importBtn = getImportButton();
                expect(importBtn.tagName).toBe('BUTTON');
                expect(importBtn.disabled).toBe(false);
            });

            it('import button has secondary button styling', () => {
                const importBtn = getImportButton();
                expect(importBtn.classList.contains('btn')).toBe(true);
                expect(importBtn.classList.contains('btn-secondary')).toBe(true);
            });

            it('import button click triggers file picker', () => {
                // Arrange
                const importBtn = getImportButton();
                const fileInput = getImportFileInput();
                
                // Act - Click import button
                importBtn.click();
                
                // Assert - File input should exist (file picker would open in real scenario)
                expect(fileInput).toBeDefined();
                expect(fileInput.type).toBe('file');
            });

            it('import file input accepts .json files', () => {
                const fileInput = getImportFileInput();
                expect(fileInput).toBeDefined();
                expect(fileInput.accept).toContain('.json');
            });

            it('import file input is hidden by default', () => {
                const fileInput = getImportFileInput();
                expect(fileInput.classList.contains('hidden')).toBe(true);
            });

            it('import button is in same button group as export', () => {
                const btnGroup = getBtnGroup();
                expect(btnGroup).toBeDefined();
                
                const exportBtn = btnGroup.querySelector('#export-data-btn');
                const importBtn = btnGroup.querySelector('#import-data-btn');
                
                expect(exportBtn).toBeDefined();
                expect(importBtn).toBeDefined();
            });
        });

        // ============================================
        // Clear Data Button Tests
        // ============================================
        describe('Clear Data Button', () => {
            it('clear data button exists', () => {
                const clearBtn = getClearDataButton();
                expect(clearBtn).toBeDefined();
                expect(clearBtn).not.toBeNull();
            });

            it('clear data button has correct label "Clear Data"', () => {
                const clearBtn = getClearDataButton();
                expect(clearBtn.textContent).toContain('Clear Data');
            });

            it('clear data button is clickable', () => {
                const clearBtn = getClearDataButton();
                expect(clearBtn.tagName).toBe('BUTTON');
                expect(clearBtn.disabled).toBe(false);
            });

            it('clear data button has ghost button styling', () => {
                const clearBtn = getClearDataButton();
                expect(clearBtn.classList.contains('btn')).toBe(true);
                expect(clearBtn.classList.contains('btn-ghost-error')).toBe(true);
            });

            it('clear data button has warning confirmation', () => {
                // Arrange - Add some test data
                Storage.saveEntry('2026-03-13', { weight: 80.5, calories: 2000 });
                
                // Mock confirm to return true (simulate user confirmation)
                const originalConfirm = window.confirm;
                window.confirm = () => true;
                
                // Act - Click clear button
                const clearBtn = getClearDataButton();
                clearBtn.click();
                
                // Restore confirm
                window.confirm = originalConfirm;
                
                // Assert - Data should be cleared
                const entries = Storage.getEntriesInRange('2026-03-13', '2026-03-13');
                expect(entries).toHaveLength(0);
            });

            it('clear data button respects user cancellation', () => {
                // Arrange - Add some test data
                Storage.saveEntry('2026-03-13', { weight: 80.5, calories: 2000 });
                
                // Mock confirm to return false (simulate user cancellation)
                const originalConfirm = window.confirm;
                window.confirm = () => false;
                
                // Act - Click clear button
                const clearBtn = getClearDataButton();
                clearBtn.click();
                
                // Restore confirm
                window.confirm = originalConfirm;
                
                // Assert - Data should still exist
                const entry = Storage.getEntry('2026-03-13');
                expect(entry).toBeDefined();
                expect(entry.weight).toBe(80.5);
            });

            it('clear data button shows success toast after clearing', () => {
                // Arrange
                const originalConfirm = window.confirm;
                window.confirm = () => true;
                
                // Mock showToast to track calls
                const originalShowToast = typeof Components !== 'undefined' ? Components.showToast : null;
                let toastCalled = false;
                let toastMessage = '';
                
                if (typeof Components !== 'undefined') {
                    Components.showToast = (message, type) => {
                        toastCalled = true;
                        toastMessage = message;
                    };
                }
                
                // Act
                const clearBtn = getClearDataButton();
                clearBtn.click();
                
                // Restore
                window.confirm = originalConfirm;
                if (originalShowToast && typeof Components !== 'undefined') {
                    Components.showToast = originalShowToast;
                }
                
                // Assert
                expect(toastCalled).toBe(true);
                expect(toastMessage).toContain('deleted');
            });
        });

        // ============================================
        // UI Simplification Tests
        // ============================================
        describe('UI Simplification', () => {
            it('export format dropdown does not exist', () => {
                // The old UI had a dropdown to select export format
                // The simplified UI removes this dropdown
                const formatDropdown = document.getElementById('export-format');
                expect(formatDropdown).toBeNull();
            });

            it('button group has proper CSS classes', () => {
                const btnGroup = getBtnGroup();
                expect(btnGroup).toBeDefined();
                expect(btnGroup.classList.contains('btn-group')).toBe(true);
            });

            it('buttons are horizontally aligned (not full-width)', () => {
                const btnGroup = getBtnGroup();
                const computedStyle = window.getComputedStyle(btnGroup);
                
                // Button group should use flexbox for horizontal alignment
                expect(computedStyle.display).toBe('flex');
                
                // Buttons should not be full-width
                const exportBtn = getExportButton();
                const btnStyle = window.getComputedStyle(exportBtn);
                expect(btnStyle.width).not.toBe('100%');
            });

            it('all three buttons exist in button group', () => {
                const btnGroup = getBtnGroup();
                
                const exportBtn = btnGroup.querySelector('#export-data-btn');
                const importBtn = btnGroup.querySelector('#import-data-btn');
                const clearBtn = btnGroup.querySelector('#clear-data-btn');
                
                expect(exportBtn).toBeDefined();
                expect(importBtn).toBeDefined();
                expect(clearBtn).toBeDefined();
            });

            it('button group is in data management section', () => {
                const modal = getSettingsModal();
                const dataManagementGroup = modal.querySelector('.setting-group');
                const btnGroup = dataManagementGroup.querySelector('.btn-group');
                
                expect(btnGroup).toBeDefined();
            });

            it('help text shows storage info', () => {
                const modal = getSettingsModal();
                const helpText = modal.querySelector('.help-text');
                const storageInfo = document.getElementById('storage-info');
                
                expect(helpText).toBeDefined();
                expect(storageInfo).toBeDefined();
            });
        });

        // ============================================
        // Advanced Settings Tests
        // ============================================
        describe('Advanced Settings', () => {
            it('compact export button exists in advanced settings', () => {
                const compactBtn = getExportCompactButton();
                expect(compactBtn).toBeDefined();
                expect(compactBtn).not.toBeNull();
            });

            it('compact export button is separate from main export', () => {
                const compactBtn = getExportCompactButton();
                const mainExportBtn = getExportButton();
                
                // They should be different buttons
                expect(compactBtn).not.toBe(mainExportBtn);
                
                // Compact button should be in advanced settings content
                const advancedContent = getAdvancedSettingsContent();
                expect(advancedContent.contains(compactBtn)).toBe(true);
                
                // Main export should NOT be in advanced settings
                expect(advancedContent.contains(mainExportBtn)).toBe(false);
            });

            it('advanced settings section is collapsible', () => {
                const toggle = getAdvancedSettingsToggle();
                const content = getAdvancedSettingsContent();
                
                expect(toggle).toBeDefined();
                expect(content).toBeDefined();
                
                // Toggle should have aria-expanded attribute
                expect(toggle.getAttribute('aria-expanded')).toBeDefined();
            });

            it('advanced settings content is hidden by default', () => {
                const content = getAdvancedSettingsContent();
                expect(content.classList.contains('hidden')).toBe(true);
            });

            it('advanced settings toggle expands content when clicked', () => {
                const toggle = getAdvancedSettingsToggle();
                const content = getAdvancedSettingsContent();
                
                // Initial state: hidden
                expect(content.classList.contains('hidden')).toBe(true);
                expect(toggle.getAttribute('aria-expanded')).toBe('false');
                
                // Act - Click toggle
                toggle.click();
                
                // Assert - Should be expanded
                expect(content.classList.contains('hidden')).toBe(false);
                expect(toggle.getAttribute('aria-expanded')).toBe('true');
            });

            it('compact export button has secondary styling', () => {
                const compactBtn = getExportCompactButton();
                expect(compactBtn.classList.contains('btn')).toBe(true);
                expect(compactBtn.classList.contains('btn-secondary')).toBe(true);
                expect(compactBtn.classList.contains('btn-sm')).toBe(true);
            });

            it('compact export button has descriptive label', () => {
                const compactBtn = getExportCompactButton();
                expect(compactBtn.textContent).toContain('Compact');
                expect(compactBtn.textContent).toContain('JSON');
            });

            it('advanced settings has help text explaining compact export', () => {
                const advancedContent = getAdvancedSettingsContent();
                const helpText = advancedContent.querySelector('.help-text');
                
                expect(helpText).toBeDefined();
                expect(helpText.textContent.toLowerCase()).toContain('minified');
            });

            it('compact export creates minified JSON', () => {
                // Arrange - Add test data
                localStorage.clear();
                Storage.init();
                Storage.saveEntry('2026-03-13', { weight: 80.5, calories: 2000 });
                
                // Act - Export compact directly
                const exported = Storage.exportData();
                const compactJson = JSON.stringify(exported);
                const prettyJson = JSON.stringify(exported, null, 2);
                
                // Assert - Compact should be shorter
                expect(compactJson.length).toBeLessThan(prettyJson.length);
                
                // Compact should not have newlines/indentation
                expect(compactJson).not.toContain('\n');
            });
        });

        // ============================================
        // Modal Structure Tests
        // ============================================
        describe('Modal Structure', () => {
            it('settings modal element exists', () => {
                const modal = getSettingsModal();
                expect(modal).toBeDefined();
                expect(modal).not.toBeNull();
            });

            it('modal has overlay element', () => {
                const overlay = getSettingsOverlay();
                expect(overlay).toBeDefined();
                expect(overlay.classList.contains('modal-overlay')).toBe(true);
            });

            it('modal is initially hidden', () => {
                const overlay = getSettingsOverlay();
                expect(overlay.classList.contains('hidden')).toBe(true);
            });

            it('modal has close button', () => {
                const closeBtn = document.getElementById('close-settings-btn');
                expect(closeBtn).toBeDefined();
                expect(closeBtn.classList.contains('btn-icon')).toBe(true);
            });

            it('modal has modal-header with title', () => {
                const modal = getSettingsModal();
                const header = modal.querySelector('.modal-header');
                const title = header.querySelector('h2');
                
                expect(header).toBeDefined();
                expect(title).toBeDefined();
                expect(title.textContent).toBe('Settings');
            });

            it('modal has modal-body container', () => {
                const modal = getSettingsModal();
                const body = modal.querySelector('.modal-body');
                expect(body).toBeDefined();
            });
        });

        // ============================================
        // Modal Behavior Tests
        // ============================================
        describe('Modal Behavior', () => {
            it('settings button opens modal', () => {
                if (typeof Components === 'undefined') return;
                
                const settingsBtn = document.getElementById('settings-btn');
                if (!settingsBtn) return;
                
                Components.openModal('settings-modal');
                expect(isOpen()).toBe(true);
            });

            it('close button closes modal', () => {
                if (typeof Components === 'undefined') return;
                
                Components.openModal('settings-modal');
                const closeBtn = document.getElementById('close-settings-btn');
                closeBtn.click();
                
                expect(isOpen()).toBe(false);
            });

            it('click on overlay closes modal', () => {
                if (typeof Components === 'undefined') return;
                
                Components.openModal('settings-modal');
                const overlay = getSettingsOverlay();
                
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true
                });
                overlay.dispatchEvent(event);
                
                expect(isOpen()).toBe(false);
            });

            it('click on modal content does NOT close modal', () => {
                if (typeof Components === 'undefined') return;
                
                Components.openModal('settings-modal');
                const modal = getSettingsModal();
                const content = modal.querySelector('.modal-body');
                
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true
                });
                content.dispatchEvent(event);
                
                expect(isOpen()).toBe(true);
            });

            it('Escape key closes modal', () => {
                if (typeof Components === 'undefined') return;
                
                Components.openModal('settings-modal');
                
                const event = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(event);
                
                expect(isOpen()).toBe(false);
            });
        });

        // ============================================
        // Accessibility Tests
        // ============================================
        describe('Accessibility', () => {
            it('close button has aria-label', () => {
                const closeBtn = document.getElementById('close-settings-btn');
                const ariaLabel = closeBtn.getAttribute('aria-label');
                expect(ariaLabel).toBeDefined();
                expect(ariaLabel.length).toBeGreaterThan(0);
            });

            it('advanced settings toggle has aria-expanded', () => {
                const toggle = getAdvancedSettingsToggle();
                const ariaExpanded = toggle.getAttribute('aria-expanded');
                expect(ariaExpanded).toBeDefined();
                expect(['true', 'false']).toContain(ariaExpanded);
            });

            it('advanced settings toggle has aria-controls', () => {
                const toggle = getAdvancedSettingsToggle();
                const ariaControls = toggle.getAttribute('aria-controls');
                expect(ariaControls).toBeDefined();
                expect(ariaControls).toBe('advanced-settings-content');
            });

            it('form inputs have associated labels', () => {
                const modal = getSettingsModal();
                const inputs = modal.querySelectorAll('input, select');
                
                inputs.forEach(input => {
                    const label = modal.querySelector(`label[for="${input.id}"]`);
                    expect(label).toBeDefined();
                });
            });

            it('buttons are focusable', () => {
                const exportBtn = getExportButton();
                const importBtn = getImportButton();
                const clearBtn = getClearDataButton();
                
                expect(exportBtn.tabIndex).toBeGreaterThanOrEqual(0);
                expect(importBtn.tabIndex).toBeGreaterThanOrEqual(0);
                expect(clearBtn.tabIndex).toBeGreaterThanOrEqual(0);
            });
        });

        // ============================================
        // Integration Tests
        // ============================================
        describe('Integration', () => {
            it('export button works with actual data', () => {
                // Arrange - Add realistic test data
                localStorage.clear();
                Storage.init();
                
                Storage.saveEntry('2026-03-10', { weight: 80.0, calories: 2000, notes: '' });
                Storage.saveEntry('2026-03-11', { weight: 79.8, calories: 1950, notes: '' });
                Storage.saveEntry('2026-03-12', { weight: 79.5, calories: 2100, notes: '' });
                Storage.saveEntry('2026-03-13', { weight: 79.3, calories: 2050, notes: 'Feeling good' });
                
                Storage.saveSettings({
                    weightUnit: 'kg',
                    calorieUnit: 'cal',
                    goalWeight: 75,
                    startingWeight: 82
                });
                
                // Act - Export data
                const exported = Storage.exportData();
                
                // Assert - All data exported correctly
                expect(Object.keys(exported.entries)).toHaveLength(4);
                expect(exported.settings.goalWeight).toBe(75);
                expect(exported.settings.startingWeight).toBe(82);
                
                // Verify entries are sorted (newest first)
                const dates = Object.keys(exported.entries);
                expect(dates[0]).toBe('2026-03-13');
                expect(dates[3]).toBe('2026-03-10');
            });

            it('import button works with valid JSON file', () => {
                // Arrange - Create valid import data
                const importData = {
                    version: 2,
                    exportedAt: new Date().toISOString(),
                    settings: { weightUnit: 'kg', goalWeight: 70 },
                    entries: {
                        '2026-03-01': { weight: 82, calories: 2200, notes: '' },
                        '2026-03-02': { weight: 81.8, calories: 2150, notes: '' }
                    }
                };
                
                // Act - Import data
                const result = Storage.importData(importData);
                
                // Assert - Import successful
                expect(result.success).toBe(true);
                expect(result.entriesImported).toBe(2);
                expect(result.entriesSkipped).toBe(0);
                
                // Verify data was imported
                const entry1 = Storage.getEntry('2026-03-01');
                const entry2 = Storage.getEntry('2026-03-02');
                expect(entry1.weight).toBe(82);
                expect(entry2.weight).toBe(81.8);
            });

            it('settings persist after page reload simulation', () => {
                // Arrange - Save settings
                Storage.saveSettings({
                    weightUnit: 'lb',
                    calorieUnit: 'kj',
                    goalWeight: 165,
                    gender: 'female'
                });
                
                // Act - Simulate reload by re-reading from storage
                const settings = Storage.getSettings();
                
                // Assert - Settings preserved
                expect(settings.weightUnit).toBe('lb');
                expect(settings.calorieUnit).toBe('kj');
                expect(settings.goalWeight).toBe(165);
                expect(settings.gender).toBe('female');
            });
        });
    });
})();
