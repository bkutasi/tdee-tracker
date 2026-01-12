
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
            checkSyntax(fullPath);
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            try {
                // Try to compile the script to check for syntax errors
                new vm.Script(content);
                // console.log(`PASS: ${file}`);
            } catch (err) {
                console.error(`FAIL: ${file}`);
                console.error(err.message);
                errorCount++;
            }
        }
    });

    if (errorCount > 0) {
        console.error(`Found ${errorCount} syntax errors.`);
        process.exit(1);
    } else {
        console.log('All JS files passed syntax check.');
    }
}

console.log('Running syntax check...');
checkSyntax(jsDir);
