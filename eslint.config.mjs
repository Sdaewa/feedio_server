import eslint from "@eslint/js";
import eslintPluginImport from "eslint-plugin-import";

export default [
  eslint.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: ["**/__tests__/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
        __dirname: "readonly",
        console: "readonly",
        // Node.js globals
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        global: "readonly",
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
      },
    },
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      "no-console": "off",
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/default": "error",
      "import/namespace": "error",
      "import/extensions": "off",
      "no-restricted-syntax": "off",
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".mjs"],
        },
      },
    },
  },
  {
    files: ["**/__tests__/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        jest: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },
];
