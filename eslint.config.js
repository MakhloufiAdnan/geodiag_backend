import globals from "globals";
import js from "@eslint/js";
import jsonc from "eslint-plugin-jsonc";
import markdown from "eslint-plugin-markdown";
import jest from "eslint-plugin-jest";

export default [
  // 1. Configuration pour les fichiers JS
  {
    files: ["**/*.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Règle pour ignorer le paramètre 'next' non utilisé dans Express
      "no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_|^next$",
        'vars': 'all',
        'args': 'after-used',
        'ignoreRestSiblings': true,
      }],
    },
  },

  // 2. Configuration pour les fichiers de test Jest
  {
    files: ["tests/**/*.js"],
    ...jest.configs['flat/recommended'], // Applique les règles Jest recommandées
    languageOptions: {
        globals: {
            ...globals.jest
        }
    }
  },

  // 3. Configuration pour les fichiers JSON
  ...jsonc.configs['flat/recommended-with-json'],

  // 4. Configuration pour les fichiers Markdown
  {
    files: ["**/*.md"],
    plugins: {
      markdown,
    },
    processor: "markdown/markdown",
  },
  
  // 5. Configuration pour les blocs de code dans les fichiers Markdown
  {
    files: ["**/*.md/*.js"],
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },

  // 6. Ignorer les fichiers et dossiers qui ne doivent pas être analysés
  {
    ignores: [
      "node_modules/",
      "package-lock.json",
      "coverage/",
    ],
  },
];