
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsDir = path.join(__dirname, '../js');

function checkSyntax(dir) {
    const files = fs.readdirSync(dir);
    let errorCount = 0;

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            errorCount += checkSyntax(fullPath);
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            try {
                new vm.Script(content);
            } catch (err) {
                console.error(`FAIL: ${file}`);
                console.error(err.message);
                errorCount++;
            }
        }
    });

    return errorCount;
}

/**
 * Scan for top-level const/let/var declarations across all JS files
 * and detect duplicate global names.
 *
 * Strategy:
 * - Only match declarations at indentation 0 (true top-level)
 * - Ignore declarations inside IIFE bodies (indented >= 4 spaces)
 * - Track (name, file, line) tuples and report collisions
 */
function checkDuplicateGlobals(dir) {
    const declarations = new Map(); // name -> [{ file, line }]
    let duplicateCount = 0;

    function scanFile(filePath, relativePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Match top-level declarations: const/let/var at column 0
            // Captures: keyword, variable name
            const match = line.match(/^(const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
            if (match) {
                const name = match[2];
                const lineNumber = i + 1;

                if (!declarations.has(name)) {
                    declarations.set(name, []);
                }
                declarations.get(name).push({ file: relativePath, line: lineNumber });
            }
        }
    }

    function walkDir(dirPath, baseDir) {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);
            const relativePath = path.relative(baseDir, fullPath);

            if (stat.isDirectory()) {
                walkDir(fullPath, baseDir);
            } else if (file.endsWith('.js')) {
                scanFile(fullPath, relativePath);
            }
        });
    }

    walkDir(dir, dir);

    // Report duplicates
    const sortedNames = Array.from(declarations.keys()).sort();
    sortedNames.forEach(name => {
        const locations = declarations.get(name);
        if (locations.length > 1) {
            duplicateCount++;
            const locStr = locations.map(loc => `${loc.file}:${loc.line}`).join(' and ');
            console.error(`DUPLICATE: "${name}" declared in ${locStr}`);
        }
    });

    return duplicateCount;
}

console.log('Running syntax check...');
const syntaxErrors = checkSyntax(jsDir);
if (syntaxErrors > 0) {
    console.error(`Found ${syntaxErrors} syntax error(s).`);
    process.exit(1);
} else {
    console.log('All JS files passed syntax check.');
}

console.log('\nRunning duplicate global check...');
const dupCount = checkDuplicateGlobals(jsDir);
if (dupCount > 0) {
    console.error(`Found ${dupCount} duplicate global(s).`);
    process.exit(1);
} else {
    console.log('No duplicate globals found.');
}
