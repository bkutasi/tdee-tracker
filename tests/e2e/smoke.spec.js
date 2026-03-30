const { test, expect } = require('@playwright/test');

test.describe('TDEE Tracker - Smoke Tests', () => {
    test('page loads successfully', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/TDEE Tracker/);
    });

    test('dashboard renders correctly', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.dashboard')).toBeVisible();
    });

    test('weight entry form is accessible', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#weight-input')).toBeVisible();
        await expect(page.locator('#calorie-input')).toBeVisible();
    });

    test('chart renders without errors', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#tdee-chart')).toBeVisible();
    });

    test('settings menu opens', async ({ page }) => {
        await page.goto('/');
        const settingsButton = page.locator('[aria-label="Settings"]');
        await settingsButton.click();
        await expect(page.locator('.settings-modal')).toBeVisible();
    });
});
