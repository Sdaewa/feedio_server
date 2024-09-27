import eslint from "@eslint/js";
import eslintPluginImport from "eslint-plugin-import";

export default [
  eslint.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: ["**/__tests__/**"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
        __dirname: "readonly",
        console: "readonly",
        // Add Node.js globals
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        global: "readonly",
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
