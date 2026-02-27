/**
 * CSP Compliance Tests
 * 
 * Validates Content Security Policy meta tag in index.html
 * Ensures all required sources are allowed and policy is properly configured
 * 
 * Run: node tests/node-test.js (Node.js) or open tests/test-runner.html (browser)
 */

(function() {
    'use strict';

    // Node.js compatibility
    const fs = typeof require !== 'undefined' ? require('fs') : null;
    const path = typeof require !== 'undefined' ? require('path') : null;

    let cspContent = '';
    let cspDirectives = {};

    /**
     * Parse CSP content into structured directives
     */
    function parseCSP(cspString) {
        const directives = {};
        if (!cspString) return directives;

        const parts = cspString.split(';');
        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;

            const [directive, ...values] = trimmed.split(/\s+/);
            if (directive) {
                directives[directive.toLowerCase()] = values.map(v => v.trim());
            }
        }
        return directives;
    }

    /**
     * Extract CSP meta tag from HTML
     * Note: Uses specific quote matching because CSP content contains single quotes
     */
    function extractCSPFromHTML(htmlContent) {
        // Match meta tag with http-equiv="Content-Security-Policy"
        // Content attribute uses double quotes, CSP directives use single quotes inside
        const metaMatch = htmlContent.match(
            /<meta[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/i
        );
        return metaMatch ? metaMatch[1] : '';
    }

    /**
     * Initialize CSP data
     */
    function initCSPData() {
        if (cspContent) return; // Already initialized
        
        if (fs && path) {
            // Node.js environment
            const htmlPath = path.join(__dirname, '../index.html');
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            cspContent = extractCSPFromHTML(htmlContent);
            cspDirectives = parseCSP(cspContent);
        } else if (typeof document !== 'undefined') {
            // Browser environment
            const htmlContent = document.documentElement.outerHTML;
            cspContent = extractCSPFromHTML(htmlContent);
            cspDirectives = parseCSP(cspContent);
        }
    }

    // Initialize immediately for Node.js
    if (typeof describe === 'undefined') {
        initCSPData();
    }

    // Test suite
    if (typeof describe !== 'undefined') {
        // Browser test framework
        beforeAll(() => {
            initCSPData();
        });
        
        describe('CSP Compliance', () => {
            runCSPTests();
        });
    }

    /**
     * Main CSP test suite
     */
    function runCSPTests() {
        describe('CSP Meta Tag Existence', () => {
            it('has CSP meta tag in index.html', () => {
                expect(cspContent).toBeDefined();
                expect(cspContent.length).toBeGreaterThan(0);
            });

            it('CSP meta tag has valid structure', () => {
                expect(cspContent).toMatch(/default-src/);
            });
        });

        describe('Script Sources', () => {
            it('allows scripts from self', () => {
                const scriptSrc = cspDirectives['script-src'] || [];
                expect(scriptSrc).toContain("'self'");
            });

            it('allows inline scripts with unsafe-inline', () => {
                const scriptSrc = cspDirectives['script-src'] || [];
                expect(scriptSrc).toContain("'unsafe-inline'");
            });

            it('allows scripts from cdn.jsdelivr.net', () => {
                const scriptSrc = cspDirectives['script-src'] || [];
                expect(scriptSrc).toContain('https://cdn.jsdelivr.net');
            });

            it('does NOT allow scripts from untrusted CDNs', () => {
                const scriptSrc = cspDirectives['script-src'] || [];
                // Should not allow arbitrary CDNs
                expect(scriptSrc).not.toContain('https://unpkg.com');
                expect(scriptSrc).not.toContain('https://cdnjs.cloudflare.com');
            });
        });

        describe('Connect Sources', () => {
            it('allows connections to self', () => {
                const connectSrc = cspDirectives['connect-src'] || [];
                expect(connectSrc).toContain("'self'");
            });

            it('allows connections to Supabase', () => {
                const connectSrc = cspDirectives['connect-src'] || [];
                expect(connectSrc).toContain('https://*.supabase.co');
            });

            it('does NOT allow connections to arbitrary domains', () => {
                const connectSrc = cspDirectives['connect-src'] || [];
                // Should be restrictive
                expect(connectSrc).not.toContain('https://evil.com');
                expect(connectSrc).not.toContain('*');
            });
        });

        describe('Style Sources', () => {
            it('allows styles from self', () => {
                const styleSrc = cspDirectives['style-src'] || [];
                expect(styleSrc).toContain("'self'");
            });

            it('allows inline styles with unsafe-inline', () => {
                const styleSrc = cspDirectives['style-src'] || [];
                expect(styleSrc).toContain("'unsafe-inline'");
            });

            it('does NOT allow styles from external CDNs', () => {
                const styleSrc = cspDirectives['style-src'] || [];
                // Should be restrictive for styles
                expect(styleSrc).not.toContain('https://fonts.googleapis.com');
            });
        });

        describe('Image Sources', () => {
            it('allows images from self', () => {
                const imgSrc = cspDirectives['img-src'] || [];
                expect(imgSrc).toContain("'self'");
            });

            it('allows data URIs for inline images', () => {
                const imgSrc = cspDirectives['img-src'] || [];
                expect(imgSrc).toContain('data:');
            });

            it('does NOT allow images from arbitrary domains', () => {
                const imgSrc = cspDirectives['img-src'] || [];
                expect(imgSrc).not.toContain('https://i.imgur.com');
                expect(imgSrc).not.toContain('*');
            });
        });

        describe('Default Sources', () => {
            it('has default-src directive', () => {
                expect(cspDirectives['default-src']).toBeDefined();
            });

            it('default-src is restrictive (self only)', () => {
                const defaultSrc = cspDirectives['default-src'] || [];
                expect(defaultSrc).toContain("'self'");
                expect(defaultSrc).not.toContain('*');
            });
        });

        describe('CSP Security Best Practices', () => {
            it('does NOT use wildcard (*) for script-src', () => {
                const scriptSrc = cspDirectives['script-src'] || [];
                expect(scriptSrc).not.toContain('*');
            });

            it('does NOT use wildcard (*) for connect-src', () => {
                const connectSrc = cspDirectives['connect-src'] || [];
                expect(connectSrc).not.toContain('*');
            });

            it('does NOT allow unsafe-eval in script-src', () => {
                const scriptSrc = cspDirectives['script-src'] || [];
                expect(scriptSrc).not.toContain("'unsafe-eval'");
            });

            it('has at least 4 directive types', () => {
                const directiveCount = Object.keys(cspDirectives).length;
                expect(directiveCount).toBeGreaterThanOrEqual(4);
            });
        });

        describe('CSP Directive Validation', () => {
            it('script-src directive exists', () => {
                expect(cspDirectives['script-src']).toBeDefined();
            });

            it('style-src directive exists', () => {
                expect(cspDirectives['style-src']).toBeDefined();
            });

            it('img-src directive exists', () => {
                expect(cspDirectives['img-src']).toBeDefined();
            });

            it('connect-src directive exists', () => {
                expect(cspDirectives['connect-src']).toBeDefined();
            });
        });
    }

    // Export for Node.js testing
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            parseCSP,
            extractCSPFromHTML,
            getCSPContent: () => cspContent,
            getCSPDirectives: () => cspDirectives
        };
    }
})();
