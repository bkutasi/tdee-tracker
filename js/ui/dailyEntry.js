/**
 * Daily Entry UI Component
 * Handles daily weight and calorie input
 */

const DailyEntry = (function () {
    'use strict';

    let currentDate = Utils.formatDate(new Date());
    let syncPendingCount = 0;
    
    // Debounced refresh function to prevent excessive DOM updates
    // Uses 300ms delay to batch rapid changes
    const debouncedRefresh = Utils.debounce(() => {
        WeeklyView.refresh();
        Dashboard.refresh();
        Chart.refresh();
    }, 300);

    /**
     * Show/hide sync pending badge
     * @param {boolean} show - Whether to show the badge
     */
    function setSyncPending(show) {
        const badge = document.getElementById('sync-pending-badge');
        if (!badge) return;
        
        if (show) {
            syncPendingCount++;
            badge.classList.remove('hidden');
        } else {
            syncPendingCount = Math.max(0, syncPendingCount - 1);
            if (syncPendingCount === 0) {
                badge.classList.add('hidden');
            }
        }
    }

    function init() {
        setupEventListeners();
        setDate(currentDate);
        loadCurrentEntry();
    }

    function setupEventListeners() {
        // Date picker
        const dateInput = document.getElementById('entry-date');
        const dateBtn = document.getElementById('date-picker-btn');

        dateBtn.addEventListener('click', () => {
            dateInput.showPicker?.() || dateInput.focus();
        });

        dateInput.addEventListener('change', (e) => {
            setDate(e.target.value);
            loadCurrentEntry();
        });

        // Save button
        document.getElementById('save-entry-btn').addEventListener('click', saveEntry);

        // Auto-save on blur for inputs
        const weightInput = document.getElementById('weight-input');
        const caloriesInput = document.getElementById('calories-input');

        weightInput.addEventListener('blur', () => {
            if (weightInput.value) autoSave();
        });

        caloriesInput.addEventListener('blur', () => {
            if (caloriesInput.value) autoSave();
        });

        // Enter key to save
        document.getElementById('daily-entry').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEntry();
            }
        });
    }

    function setDate(dateStr) {
        currentDate = dateStr;

        const dateInput = document.getElementById('entry-date');
        dateInput.value = dateStr;

        // Format display
        const date = Utils.parseDate(dateStr);
        const today = Utils.formatDate(new Date());
        const yesterday = Utils.formatDate(new Date(Date.now() - 86400000));

        let displayText;
        if (dateStr === today) {
            displayText = 'Today';
        } else if (dateStr === yesterday) {
            displayText = 'Yesterday';
        } else {
            displayText = date.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        }

        Components.setText('entry-date-display', displayText);
    }

    function loadCurrentEntry() {
        const entry = Storage.getEntry(currentDate);
        const settings = Storage.getSettings();

        const weightInput = document.getElementById('weight-input');
        const caloriesInput = document.getElementById('calories-input');
        const notesInput = document.getElementById('notes-input');

        weightInput.value = entry?.weight ?? '';
        caloriesInput.value = entry?.calories ?? '';
        notesInput.value = entry?.notes ?? '';

        // Update unit labels
        const unit = settings.weightUnit || 'kg';
        Components.setText('weight-input-unit', unit);
    }

    async function saveEntry() {
        const weightInput = document.getElementById('weight-input');
        const caloriesInput = document.getElementById('calories-input');
        const notesInput = document.getElementById('notes-input');
        const settings = Storage.getSettings();

        const weightVal = weightInput.value ? parseFloat(weightInput.value) : null;
        const caloriesVal = caloriesInput.value ? parseInt(caloriesInput.value, 10) : null;

        // Validate weight
        if (weightVal !== null) {
            const validation = Utils.validateWeight(weightVal, settings.weightUnit || 'kg');
            if (!validation.valid) {
                Components.showToast(validation.error, 'error');
                weightInput.focus();
                return;
            }
        }

        // Validate calories
        if (caloriesVal !== null) {
            const validation = Utils.validateCalories(caloriesVal);
            if (!validation.valid) {
                Components.showToast(validation.error, 'error');
                caloriesInput.focus();
                return;
            }
        }

        // Show sync pending indicator
        setSyncPending(true);

        try {
            // Save via Sync module (LocalStorage + Supabase queue)
            const result = await Sync.saveWeightEntry({
                date: currentDate,
                weight: weightVal,
                calories: caloriesVal,
                notes: notesInput.value.trim()
            });

            if (result.success) {
                // Check if sync is pending (authenticated but not yet synced to Supabase)
                const syncStatus = Sync.getStatus();
                const syncMessage = syncStatus.isAuthenticated && syncStatus.isOnline 
                    ? 'Entry saved! Syncing to cloud...' 
                    : 'Entry saved!';
                
                Components.showToast(syncMessage, 'success');

                // Trigger updates
                WeeklyView.refresh();
                Dashboard.refresh();
                Chart.refresh();
            } else {
                Components.showToast(result.error || 'Failed to save entry', 'error');
            }
        } catch (error) {
            console.error('[DailyEntry] Save error:', error);
            Components.showToast('Failed to save entry', 'error');
        } finally {
            // Hide sync pending indicator
            setSyncPending(false);
        }
    }

    async function autoSave() {
        const weightInput = document.getElementById('weight-input');
        const caloriesInput = document.getElementById('calories-input');
        const notesInput = document.getElementById('notes-input');

        const weightVal = weightInput.value ? parseFloat(weightInput.value) : null;
        const caloriesVal = caloriesInput.value ? parseInt(caloriesInput.value, 10) : null;

        // Only auto-save if we have at least one value
        if (weightVal === null && caloriesVal === null) return;

        // Show sync pending indicator (subtle for auto-save)
        setSyncPending(true);

        try {
            // Save via Sync module (LocalStorage + Supabase queue)
            // Silent failure for auto-save (no toast notifications)
            const result = await Sync.saveWeightEntry({
                date: currentDate,
                weight: weightVal,
                calories: caloriesVal,
                notes: notesInput.value.trim()
            });

            if (!result.success) {
                console.error('[DailyEntry] Auto-save failed:', result.error);
            }
        } catch (error) {
            console.error('[DailyEntry] Auto-save error:', error);
        } finally {
            // Hide sync pending indicator
            setSyncPending(false);
        }

        // Use debounced refresh to prevent excessive DOM updates
        debouncedRefresh();
    }

    function getCurrentDate() {
        return currentDate;
    }

    function refresh() {
        loadCurrentEntry();
    }

    return {
        init,
        setDate,
        getCurrentDate,
        refresh
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.DailyEntry = DailyEntry;
}
