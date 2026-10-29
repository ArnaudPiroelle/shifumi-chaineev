import js from "@eslint/js";
import tseslint from "typescript-eslint";
import vue from "eslint-plugin-vue";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  { ignores: ["node_modules", "cache", ".venv"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      // YT : l'API IFrame de YouTube, chargée par src/youtube.ts
      globals: { ...globals.browser, YT: "readonly" },
      parserOptions: { parser: tseslint.parser, extraFileExtensions: [".vue"] },
    },
  },
  {
    files: ["cli/**", "server/**", "*.config.{js,ts}"],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
