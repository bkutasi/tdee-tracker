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
        await expect(page.locator('#calories-input')).toBeVisible();
    });

    test('chart renders without errors', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#progress-chart')).toBeVisible();
    });

    test('settings button is accessible', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('#settings-btn');
        const settingsButton = page.locator('#settings-btn');
        await expect(settingsButton).toBeVisible();
        await expect(settingsButton).toBeEnabled();
    });
});
