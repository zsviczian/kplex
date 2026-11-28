import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  { ignores: ["dist/**", "node_modules/**"] },
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: {
          // Compatibility twin retained until C25; TypeScript resolves the canonical .ts file.
          allowDefaultProject: ["src/ui/NewRelatedNoteModal.tsx"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/web/**/*.{ts,tsx}"],
    // The standalone DOM uses the browser APIs directly and has no Obsidian globals.
    rules: {
      "no-restricted-globals": "off",
      "obsidianmd/prefer-create-el": "off",
    },
  },
]);
