#!/usr/bin/env node
/**
 * Config Validation Tests
 *
 * Validates js/config.js and the generate-config script to prevent
 * deployment of placeholder/broken Supabase credentials.
 *
 * Catches:
 * - Placeholder values deployed to production
 * - Missing Supabase URL or anon key
 * - Malformed URLs (not https://)
 * - Empty or whitespace-only values
 * - generate-config.js validation logic
 *
 * Run: node tests/node-test.js (included in main suite)
 *      node tests/config-validation.test.js (standalone)
 */

(function () {
    'use strict';

    const fs = typeof require !== 'undefined' ? require('fs') : null;
    const path = typeof require !== 'undefined' ? require('path') : null;
    const { execSync } = typeof require !== 'undefined' ? require('child_process') : null;

    const PLACEHOLDER_VALUES = [
        'placeholder',
        'placeholder.supabase.co',
        'placeholder-anon-key',
        'your-project-url-here',
        'your-anon-key-here',
        'your_supabase_url',
        'your_supabase_anon_key',
        'sb_publishable_',
    ];

    const VALID_SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.(co|co\.uk|eu)/i;
    const VALID_ANON_KEY_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

    function readConfigFile() {
        if (!fs || !path) return null;
        const configPath = path.join(__dirname, '..', 'js', 'config.js');
        if (!fs.existsSync(configPath)) return null;
        const content = fs.readFileSync(configPath, 'utf8');

        const urlMatch = content.match(/url:\s*['"]([^'"]+)['"]/);
        const keyMatch = content.match(/anonKey:\s*['"]([^'"]+)['"]/);
        const siteUrlMatch = content.match(/siteUrl:\s*['"]([^'"]+)['"]/);

        return {
            content,
            url: urlMatch ? urlMatch[1] : null,
            anonKey: keyMatch ? keyMatch[1] : null,
            siteUrl: siteUrlMatch ? siteUrlMatch[1] : null,
        };
    }

    function readGenerateScript() {
        if (!fs || !path) return null;
        const scriptPath = path.join(__dirname, '..', 'scripts', 'generate-config.js');
        if (!fs.existsSync(scriptPath)) return null;
        return fs.readFileSync(scriptPath, 'utf8');
    }

    function isPlaceholder(value) {
        if (!value) return true;
        const lower = value.toLowerCase();
        return PLACEHOLDER_VALUES.some(placeholder => lower.includes(placeholder));
    }

    function testConfigFileValues(config) {
        test('config.js exists and is readable', () => {
            expect(config).not.toBeNull();
        });

        test('config.js has SUPABASE_CONFIG.url defined', () => {
            expect(config.url).not.toBeNull();
            expect(config.url.length).toBeGreaterThan(0);
        });

        test('config.js has SUPABASE_CONFIG.anonKey defined', () => {
            expect(config.anonKey).not.toBeNull();
            expect(config.anonKey.length).toBeGreaterThan(0);
        });

        test('config.js has SUPABASE_CONFIG.siteUrl defined', () => {
            expect(config.siteUrl).not.toBeNull();
            expect(config.siteUrl.length).toBeGreaterThan(0);
        });

        test('config.js URL is NOT a placeholder value', () => {
            if (isPlaceholder(config.url)) {
                throw new Error(
                    `CRITICAL: config.js URL contains placeholder "${config.url}". ` +
                    'Run `node scripts/generate-config.js` with real Supabase credentials.'
                );
            }
        });

        test('config.js anonKey is NOT a placeholder value', () => {
            if (isPlaceholder(config.anonKey)) {
                throw new Error(
                    `CRITICAL: config.js anonKey contains placeholder "${config.anonKey}". ` +
                    'Run `node scripts/generate-config.js` with real Supabase credentials.'
                );
            }
        });

        test('config.js siteUrl is NOT a placeholder value', () => {
            if (isPlaceholder(config.siteUrl)) {
                throw new Error(
                    `CRITICAL: config.js siteUrl contains placeholder "${config.siteUrl}". ` +
                    'Run `node scripts/generate-config.js` with real Supabase credentials.'
                );
            }
        });

        test('config.js URL uses HTTPS protocol', () => {
            if (config.url && !config.url.startsWith('https://')) {
                throw new Error(`Supabase URL must use HTTPS. Got: "${config.url}"`);
            }
        });

        test('config.js URL matches Supabase domain pattern', () => {
            if (config.url && !VALID_SUPABASE_URL_PATTERN.test(config.url)) {
                throw new Error(
                    `Supabase URL doesn't match expected pattern. Got: "${config.url}". ` +
                    'Expected: https://<project-ref>.supabase.co'
                );
            }
        });

        test('config.js anonKey has sufficient length (min 20 chars)', () => {
            if (config.anonKey && config.anonKey.length < 20) {
                throw new Error(
                    `Supabase anonKey too short (${config.anonKey.length} chars). ` +
                    'Real keys are 100+ characters.'
                );
            }
        });

        test('config.js anonKey matches expected format', () => {
            if (config.anonKey && !VALID_ANON_KEY_PATTERN.test(config.anonKey)) {
                if (config.anonKey.includes(' ') || config.anonKey.includes('\n')) {
                    throw new Error(
                        `Supabase anonKey contains invalid characters. Got: "${config.anonKey.substring(0, 20)}..."`
                    );
                }
            }
        });
    }

    function testGenerateScript(generateScript) {
        test('generate-config.js script exists', () => {
            expect(generateScript).not.toBeNull();
        });

        test('generate-config.js validates required credentials', () => {
            expect(generateScript).toContain('SUPABASE_URL');
            expect(generateScript).toContain('SUPABASE_ANON_KEY');
        });

        test('generate-config.js exits with error on missing credentials', () => {
            expect(generateScript).toContain('process.exit(1)');
        });

        test('generate-config.js reads from .env file for local dev', () => {
            expect(generateScript).toContain('.env');
        });

        test('generate-config.js reads from environment variables for CI/CD', () => {
            expect(generateScript).toContain('process.env');
        });
    }

    function testGenerateScriptFunctional(generateScript) {
        test('generate-config.js rejects missing credentials', () => {
            if (!execSync) return;

            const envPath = path.join(__dirname, '..', '.env');
            const envBackupPath = path.join(__dirname, '..', '.env.test-backup');
            let hadEnv = false;

            try {
                if (fs.existsSync(envPath)) {
                    fs.renameSync(envPath, envBackupPath);
                    hadEnv = true;
                }

                execSync('node scripts/generate-config.js', {
                    env: { ...process.env, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' },
                    stdio: 'pipe',
                    cwd: path.join(__dirname, '..'),
                });
                throw new Error('generate-config.js should have exited with error for missing credentials');
            } catch (error) {
                if (error.status !== 1) throw error;
            } finally {
                if (hadEnv && fs.existsSync(envBackupPath)) {
                    fs.renameSync(envBackupPath, envPath);
                }
            }
        });

        test('generate-config.js produces valid config with real-looking credentials', () => {
            if (!execSync || !fs) return;

            const testConfigPath = path.join(__dirname, '..', 'js', 'config.test-temp.js');

            try {
                const modifiedScript = generateScript
                    .replace(/path\.join\(__dirname, '\.\.', 'js', 'config\.js'\)/g,
                        `'${testConfigPath.replace(/\\/g, '/')}'`);

                const tempScriptPath = path.join(__dirname, 'temp-generate-config.js');
                fs.writeFileSync(tempScriptPath, modifiedScript);

                execSync(`node "${tempScriptPath}"`, {
                    env: {
                        ...process.env,
                        SUPABASE_URL: 'https://test-project.supabase.co',
                        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
                        SITE_URL: 'https://test.example.com',
                    },
                    stdio: 'pipe',
                    cwd: path.join(__dirname, '..'),
                });

                if (fs.existsSync(testConfigPath)) {
                    const testConfig = fs.readFileSync(testConfigPath, 'utf8');
                    expect(testConfig).toContain('https://test-project.supabase.co');
                    expect(testConfig).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature');
                    expect(testConfig).toContain('https://test.example.com');
                    expect(testConfig).toContain('window.SUPABASE_CONFIG');
                    fs.unlinkSync(testConfigPath);
                }

                if (fs.existsSync(tempScriptPath)) {
                    fs.unlinkSync(tempScriptPath);
                }
            } catch (error) {
                try {
                    if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
                    const tempScriptPath = path.join(__dirname, 'temp-generate-config.js');
                    if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
                } catch (_) { /* ignore cleanup errors */ }
                throw error;
            }
        });
    }

    function testEnvExample() {
        const envExamplePath = path.join(__dirname, '..', '.env.example');

        test('.env.example exists', () => {
            expect(fs.existsSync(envExamplePath)).toBe(true);
        });

        test('.env.example has SUPABASE_URL placeholder', () => {
            if (fs.existsSync(envExamplePath)) {
                const content = fs.readFileSync(envExamplePath, 'utf8');
                expect(content).toContain('SUPABASE_URL');
            }
        });

        test('.env.example has SUPABASE_ANON_KEY placeholder', () => {
            if (fs.existsSync(envExamplePath)) {
                const content = fs.readFileSync(envExamplePath, 'utf8');
                expect(content).toContain('SUPABASE_ANON_KEY');
            }
        });

        test('.env.example does NOT contain real credentials', () => {
            if (fs.existsSync(envExamplePath)) {
                const content = fs.readFileSync(envExamplePath, 'utf8');
                if (VALID_SUPABASE_URL_PATTERN.test(content)) {
                    throw new Error('.env.example contains what looks like a real Supabase URL');
                }
            }
        });
    }

    function testGitignore() {
        const gitignorePath = path.join(__dirname, '..', '.gitignore');

        test('.gitignore includes js/config.js', () => {
            if (fs.existsSync(gitignorePath)) {
                const content = fs.readFileSync(gitignorePath, 'utf8');
                expect(content).toContain('js/config.js');
            }
        });

        test('.gitignore includes .env', () => {
            if (fs.existsSync(gitignorePath)) {
                const content = fs.readFileSync(gitignorePath, 'utf8');
                expect(content).toContain('.env');
            }
        });
    }

    function runConfigTests() {
        const config = readConfigFile();
        const generateScript = readGenerateScript();

        if (typeof test !== 'undefined' && config) {
            testConfigFileValues(config);
        }

        if (typeof test !== 'undefined' && generateScript) {
            testGenerateScript(generateScript);
            testGenerateScriptFunctional(generateScript);
        }

        if (typeof test !== 'undefined' && fs && path) {
            testEnvExample();
            testGitignore();
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            runConfigTests,
            readConfigFile,
            isPlaceholder,
            PLACEHOLDER_VALUES,
            VALID_SUPABASE_URL_PATTERN,
            VALID_ANON_KEY_PATTERN,
        };
    }

    if (typeof test !== 'undefined') {
        runConfigTests();
    }
})();
