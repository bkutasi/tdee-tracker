const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Find CSP meta tag - match double-quoted content attribute specifically
const metaMatch = htmlContent.match(
    /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]*)"[^>]*>/i
);

console.log('Meta match:', metaMatch);
console.log('CSP content:', metaMatch ? metaMatch[1] : 'NOT FOUND');

if (metaMatch) {
    const cspContent = metaMatch[1];
    const parts = cspContent.split(';');
    console.log('Parts:', parts);
    
    const directives = {};
    for (const part of parts) {
        const trimmed = part.trim();
        console.log('Processing part:', trimmed);
        if (!trimmed) continue;
        
        const [directive, ...values] = trimmed.split(/\s+/);
        console.log('Directive:', directive, 'Values:', values);
        if (directive) {
            directives[directive.toLowerCase()] = values.map(v => v.trim());
        }
    }
    console.log('Directives:', directives);
}
