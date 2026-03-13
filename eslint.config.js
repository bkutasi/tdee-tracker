// ESLint v9+ Flat Config
// Migration from .eslintrc.json to eslint.config.js

export default [
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
      // Variable scoping & declaration
      "no-use-before-define": ["error", { 
        functions: false, 
        classes: false, 
        variables: true 
      }],
      "block-scoped-var": "error",
      "no-undef-init": "error",
      "one-var": ["error", "never"],
      "prefer-const": "error",
      "no-var": "error",
      
      // Function complexity
      "max-lines-per-function": ["warn", { "max": 100 }],
      "complexity": ["warn", { "max": 20 }],
      "max-depth": ["warn", { "max": 4 }],
      
      // Code quality
      "consistent-return": "warn",
      "no-implicit-globals": "error",
      "no-unused-vars": "warn",
      "no-unreachable": "error",
      "no-constant-condition": "warn",
      "no-empty": "warn",
      "valid-typeof": "error",
      
      // Best practices
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "dot-notation": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-return-assign": "error",
      "no-throw-literal": "error",
      "no-unused-expressions": "warn",
      "no-useless-call": "warn",
      "no-useless-concat": "warn",
      "no-useless-return": "warn",
      "radix": "error",
      "yoda": ["error", "never"]
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
