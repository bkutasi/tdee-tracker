#!/usr/bin/env node
/**
 * Generate js/config.js from environment variables
 * 
 * Usage:
 *   Local: node scripts/generate-config.js
 *   GitHub Actions: node scripts/generate-config.js (with env vars set)
 * 
 * This script reads SUPABASE_URL and SUPABASE_ANON_KEY from:
 *   1. Environment variables (production/CI)
 *   2. .env file (local development)
 * 
 * Outputs: js/config.js (gitignored)
 */

const fs = require('fs');
const path = require('path');

// Path to .env file (local development)
const envPath = path.join(__dirname, '..', '.env');
const configPath = path.join(__dirname, '..', 'js', 'config.js');

/**
 * Load environment variables from .env file
 */
function loadEnvFile() {
    if (!fs.existsSync(envPath)) {
        console.log('⚠️  No .env file found. Using environment variables only.');
        return {};
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};

    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim();
            }
        }
    });

    return env;
}

/**
 * Generate js/config.js content
 * 
 * Produces hardcoded config from build-time environment variables.
 * This is the correct approach for Cloudflare Pages static sites:
 * - Environment variables are injected at BUILD TIME by CI/CD
 * - Generated config.js contains actual values (not runtime checks)
 * - No runtime environment detection (doesn't work for static sites)
 */
function generateConfig(supabaseUrl, supabaseAnonKey, siteUrl) {
    // Validate required parameters
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing required Supabase credentials');
    }

    // Default siteUrl to supabaseUrl if not provided
    const finalSiteUrl = siteUrl || supabaseUrl;

    return `// Auto-generated configuration - DO NOT EDIT
// Generated from build-time environment variables
// Script: scripts/generate-config.js
// 
// Cloudflare Pages: Environment variables injected by CI/CD at build time
// Local dev: Run \`node scripts/generate-config.js\` with .env file

'use strict';

window.SUPABASE_CONFIG = {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}',
    siteUrl: '${finalSiteUrl}'
};

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.SUPABASE_CONFIG;
}
`;
}

// Main execution
console.log('🔧 Generating config.js...');

// Load .env file (local development)
const envFromFile = loadEnvFile();

// Get values from environment (priority) or .env file
const supabaseUrl = process.env.SUPABASE_URL || envFromFile.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || envFromFile.SUPABASE_ANON_KEY;
const siteUrl = process.env.SITE_URL || envFromFile.SITE_URL;

// Validate
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('');
    console.error('Required environment variables:');
    console.error('  SUPABASE_URL - Your Supabase project URL');
    console.error('  SUPABASE_ANON_KEY - Your Supabase anon/public key');
    console.error('  SITE_URL - Your production URL (optional, defaults to SUPABASE_URL)');
    console.error('');
    console.error('For local development:');
    console.error('  1. Copy .env.example to .env');
    console.error('  2. Fill in your credentials');
    console.error('  3. Run: node scripts/generate-config.js');
    console.error('');
    process.exit(1);
}

// Generate config content
const configContent = generateConfig(supabaseUrl, supabaseAnonKey, siteUrl);

// Write config.js
fs.writeFileSync(configPath, configContent, 'utf8');

console.log('✅ Config generated successfully!');
console.log(`   Output: ${configPath}`);
console.log('');
console.log('📝 Next steps:');
console.log('   1. Create Supabase project at https://supabase.com');
console.log('   2. Run supabase-schema.sql in Supabase SQL Editor');
console.log('   3. Start testing!');
