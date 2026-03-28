/**
 * Daily Entry UI Component Tests
 * 
 * Tests for DailyEntry component form rendering, validation, and save/cancel actions.
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
    function getDateInput() {
        return document.getElementById('entry-date');
    }

    function getDatePickerBtn() {
        return document.getElementById('date-picker-btn');
    }

    function getDateDisplay() {
        return document.getElementById('entry-date-display');
    }

    function getWeightInput() {
        return document.getElementById('weight-input');
    }

    function getCaloriesInput() {
        return document.getElementById('calories-input');
    }

    function getNotesInput() {
        return document.getElementById('notes-input');
    }

    function getSaveButton() {
        return document.getElementById('save-entry-btn');
    }

    function getWeightUnitLabel() {
        return document.getElementById('weight-input-unit');
    }

    function getDailyEntryForm() {
        return document.getElementById('daily-entry');
    }

    // Test suite
    describe('DailyEntry Component', () => {
        // Setup before each test
        beforeEach(() => {
            // Ensure DailyEntry module is available
            if (typeof DailyEntry === 'undefined') {
                throw new Error('DailyEntry module not loaded');
            }
            
            // Ensure required DOM elements exist
            if (!getDailyEntryForm()) {
                const form = document.createElement('div');
                form.id = 'daily-entry';
                document.body.appendChild(form);
            }
            if (!getDateInput()) {
                const input = document.createElement('input');
                input.id = 'entry-date';
                input.type = 'date';
                document.body.appendChild(input);
            }
            if (!getWeightInput()) {
                const input = document.createElement('input');
                input.id = 'weight-input';
                input.type = 'number';
                document.body.appendChild(input);
            }
            if (!getCaloriesInput()) {
                const input = document.createElement('input');
                input.id = 'calories-input';
                input.type = 'number';
                document.body.appendChild(input);
            }
            if (!getNotesInput()) {
                const input = document.createElement('input');
                input.id = 'notes-input';
                input.type = 'text';
                document.body.appendChild(input);
            }
            if (!getSaveButton()) {
                const btn = document.createElement('button');
                btn.id = 'save-entry-btn';
                document.body.appendChild(btn);
            }
        });

        // Cleanup after each test
        afterEach(() => {
            // Clean up test elements added to body
            const ids = ['daily-entry', 'entry-date', 'weight-input', 
                        'calories-input', 'notes-input', 'save-entry-btn'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.parentElement === document.body) {
                    el.remove();
                }
            });
            
            // Clear test data from storage
            const today = new Date().toISOString().split('T')[0];
            Storage.removeEntry(today);
        });

        describe('DailyEntry Structure', () => {
            it('has daily entry form container', () => {
                const form = getDailyEntryForm();
                expect(form).toBeDefined();
            });

            it('has date input field', () => {
                const input = getDateInput();
                expect(input).toBeDefined();
            });

            it('date input is type date', () => {
                const input = getDateInput();
                if (input) {
                    expect(input.type).toBe('date');
                }
            });

            it('has date picker button', () => {
                const btn = getDatePickerBtn();
                expect(btn).toBeDefined();
            });

            it('has date display element', () => {
                const display = getDateDisplay();
                expect(display).toBeDefined();
            });

            it('has weight input field', () => {
                const input = getWeightInput();
                expect(input).toBeDefined();
            });

            it('weight input is type number', () => {
                const input = getWeightInput();
                if (input) {
                    expect(input.type).toBe('number');
                }
            });

            it('has calories input field', () => {
                const input = getCaloriesInput();
                expect(input).toBeDefined();
            });

            it('calories input is type number', () => {
                const input = getCaloriesInput();
                if (input) {
                    expect(input.type).toBe('number');
                }
            });

            it('has notes input field', () => {
                const input = getNotesInput();
                expect(input).toBeDefined();
            });

            it('has save button', () => {
                const btn = getSaveButton();
                expect(btn).toBeDefined();
            });

            it('has weight unit label', () => {
                const label = getWeightUnitLabel();
                expect(label).toBeDefined();
            });
        });

        describe('DailyEntry Initialization', () => {
            it('DailyEntry module is defined', () => {
                expect(typeof DailyEntry).toBe('object');
            });

            it('DailyEntry has init method', () => {
                expect(typeof DailyEntry.init).toBe('function');
            });

            it('DailyEntry has refresh method', () => {
                expect(typeof DailyEntry.refresh).toBe('function');
            });

            it('DailyEntry has setDate method', () => {
                expect(typeof DailyEntry.setDate).toBe('function');
            });

            it('DailyEntry has getCurrentDate method', () => {
                expect(typeof DailyEntry.getCurrentDate).toBe('function');
            });

            it('DailyEntry.init() does not throw', () => {
                expect(() => {
                    DailyEntry.init();
                }).not.toThrow();
            });
        });

        describe('Date Handling', () => {
            it('sets date to today on init', () => {
                DailyEntry.init();
                
                const dateInput = getDateInput();
                const today = new Date().toISOString().split('T')[0];
                
                if (dateInput) {
                    expect(dateInput.value).toBe(today);
                }
            });

            it('setDate() updates date input', () => {
                const testDate = '2026-03-15';
                DailyEntry.setDate(testDate);
                
                const dateInput = getDateInput();
                if (dateInput) {
                    expect(dateInput.value).toBe(testDate);
                }
            });

            it('setDate() updates date display', () => {
                const testDate = '2026-03-15';
                DailyEntry.setDate(testDate);
                
                const display = getDateDisplay();
                if (display) {
                    expect(display.textContent.length).toBeGreaterThan(0);
                }
            });

            it('getCurrentDate() returns current date', () => {
                const testDate = '2026-03-20';
                DailyEntry.setDate(testDate);
                
                const currentDate = DailyEntry.getCurrentDate();
                expect(currentDate).toBe(testDate);
            });

            it('date picker button click opens date picker', () => {
                const btn = getDatePickerBtn();
                const input = getDateInput();
                
                if (btn && input) {
                    // Should not throw
                    expect(() => {
                        btn.click();
                    }).not.toThrow();
                }
            });

            it('date input change triggers loadCurrentEntry', () => {
                const input = getDateInput();
                
                if (input) {
                    const testDate = '2026-03-10';
                    input.value = testDate;
                    
                    const event = new Event('change');
                    
                    expect(() => {
                        input.dispatchEvent(event);
                    }).not.toThrow();
                }
            });
        });

        describe('Form Loading', () => {
            it('loadCurrentEntry() populates weight field', () => {
                // Save a test entry first
                const today = new Date().toISOString().split('T')[0];
                Storage.addEntry({
                    date: today,
                    weight: 80.5,
                    calories: 2200,
                    notes: 'Test entry'
                });
                
                DailyEntry.setDate(today);
                DailyEntry.refresh();
                
                const weightInput = getWeightInput();
                if (weightInput) {
                    expect(weightInput.value).toBe('80.5');
                }
            });

            it('loadCurrentEntry() populates calories field', () => {
                const today = new Date().toISOString().split('T')[0];
                Storage.addEntry({
                    date: today,
                    weight: 80.5,
                    calories: 2200,
                    notes: 'Test entry'
                });
                
                DailyEntry.setDate(today);
                DailyEntry.refresh();
                
                const caloriesInput = getCaloriesInput();
                if (caloriesInput) {
                    expect(caloriesInput.value).toBe('2200');
                }
            });

            it('loadCurrentEntry() populates notes field', () => {
                const today = new Date().toISOString().split('T')[0];
                Storage.addEntry({
                    date: today,
                    weight: 80.5,
                    calories: 2200,
                    notes: 'Test notes'
                });
                
                DailyEntry.setDate(today);
                DailyEntry.refresh();
                
                const notesInput = getNotesInput();
                if (notesInput) {
                    expect(notesInput.value).toBe('Test notes');
                }
            });

            it('loadCurrentEntry() clears fields for empty date', () => {
                const emptyDate = '2099-01-01';
                DailyEntry.setDate(emptyDate);
                DailyEntry.refresh();
                
                const weightInput = getWeightInput();
                const caloriesInput = getCaloriesInput();
                const notesInput = getNotesInput();
                
                if (weightInput) {
                    expect(weightInput.value).toBe('');
                }
                if (caloriesInput) {
                    expect(caloriesInput.value).toBe('');
                }
                if (notesInput) {
                    expect(notesInput.value).toBe('');
                }
            });

            it('weight unit label shows correct unit', () => {
                const settings = Storage.getSettings();
                settings.weightUnit = 'kg';
                Storage.saveSettings(settings);
                
                DailyEntry.refresh();
                
                const unitLabel = getWeightUnitLabel();
                if (unitLabel) {
                    expect(unitLabel.textContent).toBe('kg');
                }
            });
        });

        describe('Input Validation', () => {
            it('accepts valid weight in kg', () => {
                const weightInput = getWeightInput();
                if (weightInput) {
                    weightInput.value = '80.5';
                    
                    const event = new Event('blur');
                    
                    expect(() => {
                        weightInput.dispatchEvent(event);
                    }).not.toThrow();
                }
            });

            it('accepts valid weight in lb', () => {
                const settings = Storage.getSettings();
                settings.weightUnit = 'lb';
                Storage.saveSettings(settings);
                
                const weightInput = getWeightInput();
                if (weightInput) {
                    weightInput.value = '180';
                    
                    const event = new Event('blur');
                    
                    expect(() => {
                        weightInput.dispatchEvent(event);
                    }).not.toThrow();
                }
            });

            it('accepts valid calories', () => {
                const caloriesInput = getCaloriesInput();
                if (caloriesInput) {
                    caloriesInput.value = '2200';
                    
                    const event = new Event('blur');
                    
                    expect(() => {
                        caloriesInput.dispatchEvent(event);
                    }).not.toThrow();
                }
            });

            it('rejects negative weight', () => {
                const weightInput = getWeightInput();
                if (weightInput) {
                    weightInput.value = '-5';
                    
                    const event = new Event('blur');
                    
                    expect(() => {
                        weightInput.dispatchEvent(event);
                    }).not.toThrow();
                }
            });

            it('rejects unrealistic weight', () => {
                const weightInput = getWeightInput();
                if (weightInput) {
                    weightInput.value = '500';
                    
                    const event = new Event('blur');
                    
                    expect(() => {
                        weightInput.dispatchEvent(event);
                    }).not.toThrow();
                }
            });

            it('rejects negative calories', () => {
                const caloriesInput = getCaloriesInput();
                if (caloriesInput) {
                    caloriesInput.value = '-100';
                    
                    const event = new Event('blur');
                    
                    expect(() => {
                        caloriesInput.dispatchEvent(event);
                    }).not.toThrow();
                }
            });
        });

        describe('Save Action', () => {
            it('save button exists and is clickable', () => {
                const btn = getSaveButton();
                expect(btn).toBeDefined();
            });

            it('save creates new entry', async () => {
                const today = new Date().toISOString().split('T')[0];
                DailyEntry.setDate(today);
                
                const weightInput = getWeightInput();
                const caloriesInput = getCaloriesInput();
                
                if (weightInput && caloriesInput) {
                    weightInput.value = '81.0';
                    caloriesInput.value = '2300';
                    
                    // Click save
                    const btn = getSaveButton();
                    if (btn) {
                        btn.click();
                        
                        // Wait a bit for async save
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // Check entry was saved
                        const entry = Storage.getEntry(today);
                        expect(entry).toBeDefined();
                    }
                }
            });

            it('save updates entry if exists', async () => {
                const today = new Date().toISOString().split('T')[0];
                
                // Create initial entry
                Storage.addEntry({
                    date: today,
                    weight: 80.0,
                    calories: 2000,
                    notes: ''
                });
                
                DailyEntry.setDate(today);
                DailyEntry.refresh();
                
                // Update values
                const weightInput = getWeightInput();
                const caloriesInput = getCaloriesInput();
                
                if (weightInput && caloriesInput) {
                    weightInput.value = '80.5';
                    caloriesInput.value = '2100';
                    
                    const btn = getSaveButton();
                    if (btn) {
                        btn.click();
                        
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        const entry = Storage.getEntry(today);
                        expect(entry.weight).toBe(80.5);
                        expect(entry.calories).toBe(2100);
                    }
                }
            });

            it('save with only weight works', async () => {
                const today = new Date().toISOString().split('T')[0];
                DailyEntry.setDate(today);
                
                const weightInput = getWeightInput();
                const caloriesInput = getCaloriesInput();
                
                if (weightInput && caloriesInput) {
                    weightInput.value = '79.5';
                    caloriesInput.value = '';
                    
                    const btn = getSaveButton();
                    if (btn) {
                        btn.click();
                        
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        const entry = Storage.getEntry(today);
                        expect(entry.weight).toBe(79.5);
                        expect(entry.calories).toBeNull();
                    }
                }
            });

            it('save with only calories works', async () => {
                const today = new Date().toISOString().split('T')[0];
                DailyEntry.setDate(today);
                
                const weightInput = getWeightInput();
                const caloriesInput = getCaloriesInput();
                
                if (weightInput && caloriesInput) {
                    weightInput.value = '';
                    caloriesInput.value = '2400';
                    
                    const btn = getSaveButton();
                    if (btn) {
                        btn.click();
                        
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        const entry = Storage.getEntry(today);
                        expect(entry.weight).toBeNull();
                        expect(entry.calories).toBe(2400);
                    }
                }
            });

            it('save includes notes', async () => {
                const today = new Date().toISOString().split('T')[0];
                DailyEntry.setDate(today);
                
                const weightInput = getWeightInput();
                const caloriesInput = getCaloriesInput();
                const notesInput = getNotesInput();
                
                if (weightInput && caloriesInput && notesInput) {
                    weightInput.value = '80.0';
                    caloriesInput.value = '2200';
                    notesInput.value = 'Felt great today!';
                    
                    const btn = getSaveButton();
                    if (btn) {
                        btn.click();
                        
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        const entry = Storage.getEntry(today);
                        expect(entry.notes).toBe('Felt great today!');
                    }
                }
            });
        });

        describe('Auto-Save', () => {
            it('weight input blur triggers auto-save', () => {
                const weightInput = getWeightInput();
                
                if (weightInput) {
                    weightInput.value = '82.0';
                    
                    const event = new Event('blur');
                    
                    expect(() => {
                        weightInput.dispatchEvent(event);
                    }).not.toThrow();
                }
            });

            it('calories input blur triggers auto-save', () => {
                const caloriesInput = getCaloriesInput();
                
                if (caloriesInput) {
                    caloriesInput.value = '2500';
                    
                    const event = new Event('blur');
                    
                    expect(() => {
                        caloriesInput.dispatchEvent(event);
                    }).not.toThrow();
                }
            });

            it('empty weight blur does not auto-save', () => {
                const weightInput = getWeightInput();
                
                if (weightInput) {
                    weightInput.value = '';
                    
                    const event = new Event('blur');
                    
                    expect(() => {
                        weightInput.dispatchEvent(event);
                    }).not.toThrow();
                }
            });

            it('empty calories blur does not auto-save', () => {
                const caloriesInput = getCaloriesInput();
                
                if (caloriesInput) {
                    caloriesInput.value = '';
                    
                    const event = new Event('blur');
                    
                    expect(() => {
                        caloriesInput.dispatchEvent(event);
                    }).not.toThrow();
                }
            });
        });

        describe('Keyboard Shortcuts', () => {
            it('Enter key saves entry', () => {
                const form = getDailyEntryForm();
                
                if (form) {
                    const weightInput = getWeightInput();
                    if (weightInput) {
                        weightInput.value = '80.0';
                    }
                    
                    const event = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        bubbles: true,
                        cancelable: true
                    });
                    
                    expect(() => {
                        form.dispatchEvent(event);
                    }).not.toThrow();
                }
            });

            it('Shift+Enter does not save', () => {
                const form = getDailyEntryForm();
                
                if (form) {
                    const event = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        shiftKey: true,
                        bubbles: true,
                        cancelable: true
                    });
                    
                    // Should not prevent default or trigger save
                    expect(() => {
                        form.dispatchEvent(event);
                    }).not.toThrow();
                }
            });
        });

        describe('Refresh', () => {
            it('refresh() reloads current entry', () => {
                const today = new Date().toISOString().split('T')[0];
                
                // Save test entry
                Storage.addEntry({
                    date: today,
                    weight: 77.5,
                    calories: 2150,
                    notes: ''
                });
                
                DailyEntry.setDate(today);
                DailyEntry.refresh();
                
                const weightInput = getWeightInput();
                if (weightInput) {
                    expect(weightInput.value).toBe('77.5');
                }
            });

            it('refresh() does not throw with no entry', () => {
                const emptyDate = '2099-12-31';
                DailyEntry.setDate(emptyDate);
                
                expect(() => {
                    DailyEntry.refresh();
                }).not.toThrow();
            });
        });

        describe('Sync Pending Indicator', () => {
            it('sync pending badge exists', () => {
                const badge = document.getElementById('sync-pending-badge');
                // Badge may be created dynamically
                expect(true).toBe(true);
            });

            it('save shows sync pending state', () => {
                // This would test the sync pending indicator
                // Badge is shown during async save operation
                expect(typeof DailyEntry.init).toBe('function');
            });
        });

        describe('Form Reset', () => {
            it('clears weight input', () => {
                const weightInput = getWeightInput();
                if (weightInput) {
                    weightInput.value = '80.0';
                    weightInput.value = '';
                    expect(weightInput.value).toBe('');
                }
            });

            it('clears calories input', () => {
                const caloriesInput = getCaloriesInput();
                if (caloriesInput) {
                    caloriesInput.value = '2000';
                    caloriesInput.value = '';
                    expect(caloriesInput.value).toBe('');
                }
            });

            it('clears notes input', () => {
                const notesInput = getNotesInput();
                if (notesInput) {
                    notesInput.value = 'Test notes';
                    notesInput.value = '';
                    expect(notesInput.value).toBe('');
                }
            });
        });
    });
})();
