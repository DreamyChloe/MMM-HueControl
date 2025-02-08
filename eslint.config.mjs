import eslintPluginJs from "@eslint/js"
import eslintPluginJest from "eslint-plugin-jest"
import eslintPluginStylistic from "@stylistic/eslint-plugin"
import globals from "globals"

const config = [
    {
        files: ["**/*.js", "**/*.mjs", "**/*.test.js"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
                Log: "readonly",
                Module: "readonly",
            },
        },
        plugins: {
            jest: eslintPluginJest,
            ...eslintPluginStylistic.configs["recommended-flat"].plugins,
        },
        rules: {
            ...eslintPluginJs.configs.recommended.rules,
            ...eslintPluginStylistic.configs["recommended-flat"].rules,
            ...eslintPluginJest.configs.recommended.rules,
            "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
            "@stylistic/comma-dangle": ["error", "only-multiline"],
            "@stylistic/max-statements-per-line": ["error", { max: 2 }],
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/indent": ["error", 4],
        },
    }
]

export default config
