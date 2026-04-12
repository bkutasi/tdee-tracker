// ESLint v9+ Flat Config
// Configured for vanilla JS IIFE modules

module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        Event: "readonly",
        KeyboardEvent: "readonly",
        MouseEvent: "readonly",
        CustomEvent: "readonly",
        Date: "readonly",
        Math: "readonly",
        JSON: "readonly",
        Array: "readonly",
        Object: "readonly",
        String: "readonly",
        Number: "readonly",
        Boolean: "readonly",
        Error: "readonly",
        TypeError: "readonly",
        ReferenceError: "readonly",
        SyntaxError: "readonly",
        Promise: "readonly",
        Map: "readonly",
        Set: "readonly",
        WeakMap: "readonly",
        WeakSet: "readonly",
        Symbol: "readonly",
        Proxy: "readonly",
        Reflect: "readonly",
        Intl: "readonly",
        ArrayBuffer: "readonly",
        DataView: "readonly",
        Int8Array: "readonly",
        Uint8Array: "readonly",
        Uint8ClampedArray: "readonly",
        Int16Array: "readonly",
        Uint16Array: "readonly",
        Int32Array: "readonly",
        Uint32Array: "readonly",
        Float32Array: "readonly",
        Float64Array: "readonly",
        BigInt: "readonly",
        BigInt64Array: "readonly",
        BigUint64Array: "readonly",
        
        // App-specific globals (IIFE modules)
        Calculator: "readonly",
        Storage: "readonly",
        Utils: "readonly",
        Sync: "readonly",
        Auth: "readonly",
        TDEE: "readonly",
        Dashboard: "readonly",
        Chart: "readonly",
        Components: "readonly",
        App: "readonly",
        SyncDebug: "readonly",
        AuthModal: "readonly",
        
        // Test framework globals
        expect: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        
        // Node.js globals
        global: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        clearInterval: "readonly",
        clearTimeout: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly"
      }
    },
    rules: {
      // Variable scoping & declaration - RELAXED for IIFE pattern
      "no-use-before-define": ["error", { 
        functions: false, 
        classes: false, 
        variables: false  // Allow hoisting for IIFE pattern
      }],
      "block-scoped-var": "off",  // IIFE modules expose globals intentionally
      "no-undef-init": "warn",
      "one-var": "off",  // Allow multiple var declarations (common in vanilla JS)
      "prefer-const": "warn",  // Warn but don't error
      "no-var": "off",  // Allow var for IIFE modules
      "no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^(_)?(event|e|error|user|type|weightUnit|windowDays)$",  // Common event handler params (with optional underscore)
        "caughtErrorsIgnorePattern": "^_",  // Allow unused catch params with underscore
        "varsIgnorePattern": "^_|^Sync$|^TOAST_|^emailInput$|^sendLinkButton$|^logoutButton$|^chartWidth$|^windowDays$|^weightSum$|^weeklyChangeEl$|^migrated$|^App$|^VersionManager$|^calculateCurrentTDEE$|^removeStuckOperations$"  // Allow common unused vars
      }],
      
      // Function complexity (warnings only) - RELAXED for vanilla JS
      "max-lines-per-function": ["warn", { "max": 200 }],  // Increased from 150
      "complexity": ["warn", { "max": 25 }],  // Relaxed
      "max-depth": ["warn", { "max": 7 }],  // Increased from 5 for chart rendering
      
      // Code quality
      "consistent-return": "warn",
      "no-implicit-globals": "off",  // IIFE modules expose globals intentionally
      "no-unreachable": "error",
      "no-constant-condition": "warn",
      "no-empty": "warn",
      "valid-typeof": "error",
      
      // Best practices - RELAXED for vanilla JS patterns
      "eqeqeq": ["warn", "always"],  // Warn instead of error
      "curly": "off",  // Allow single-line statements without braces (vanilla JS style)
      "dot-notation": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-return-assign": "off",  // Common pattern in vanilla JS
      "no-throw-literal": "error",
      "no-unused-expressions": "warn",
      "no-useless-call": "warn",
      "no-useless-concat": "warn",
      "no-useless-return": "warn",
      "radix": "warn",  // Warn instead of error
      "yoda": "off"  // Allow yoda conditions if preferred
    }
  },
  {
    // Ignore patterns
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.tmp/**",
      "**/vendor/**",
      "eslint.config.js"
    ]
  }
];
