#!/usr/bin/env node
/**
 * Version Consistency Check
 * 
 * Ensures CACHE_VERSION in sw.js matches APP_VERSION in js/version.js.
 * Called by CI/CD and pre-deploy hooks to prevent version drift.
 * 
 * Usage:
 *   node scripts/check-versions.js
 * 
 * Exit codes:
 *   0 - versions match
 *   1 - versions mismatch or file missing
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SW_PATH = path.join(ROOT, 'sw.js');
const VERSION_PATH = path.join(ROOT, 'js', 'version.js');

/**
 * Extract version from a file using regex.
 * @param {string} filePath - Absolute path to the file
 * @param {string} label - Human-readable label for error messages
 * @param {RegExp} regex   - Regex with a capture group for the version
 * @returns {string|null}  - Extracted version or null on failure
 */
function extractVersion(filePath, label, regex) {
    if (!fs.existsSync(filePath)) {
        console.error(`✗ File not found: ${filePath}`);
        return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(regex);

    if (!match || !match[1]) {
        console.error(`✗ Could not extract ${label} from ${filePath}`);
        return null;
    }

    return match[1];
}

// Extract both versions
const cacheVersion = extractVersion(
    SW_PATH,
    'CACHE_VERSION',
    /const CACHE_VERSION\s*=\s*['"](\S+?)['"]/
);

const appVersion = extractVersion(
    VERSION_PATH,
    'APP_VERSION',
    /const APP_VERSION\s*=\s*['"](\S+?)['"]/
);

// Fail if either extraction returned null
if (cacheVersion === null || appVersion === null) {
    process.exit(1);
}

// Compare
if (cacheVersion !== appVersion) {
    console.error(`✗ Version mismatch: sw.js=${cacheVersion}, version.js=${appVersion}`);
    process.exit(1);
}

console.log(`✓ Versions match: ${cacheVersion}`);
process.exit(0);
