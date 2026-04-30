module.exports = {
    testDir: './tests/e2e',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:8765',
        browserName: 'chromium',
        headless: true
    },
    projects: [
        { name: 'chromium', use: { browserName: 'chromium' } },
        { name: 'webkit',   use: { browserName: 'webkit'   } }
    ],
    webServer: {
        command: 'npx serve . -p 8765',
        port: 8765,
        timeout: 120000,
        reuseExistingServer: true
    }
};
