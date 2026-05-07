// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Enforce consistent type-only imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Allow void operator to explicitly discard promises where intentional
      "@typescript-eslint/no-confusing-void-expression": "off",
      // epub-gen-memory lacks full types — allow controlled unsafe calls there
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      // Allow numbers in template literals (common in error messages, size formatting)
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      // Allow _-prefixed variables used as exhaustiveness sentinels
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
      // Allow explicit `=== true` comparisons for nullable booleans (process.stdin.isTTY is `true | undefined`)
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",
    },
  },
  // Test file overrides
  {
    files: ["test/**/*.ts"],
    rules: {
      // vitest's toHaveBeenCalledWith triggers false positives for this rule
      "@typescript-eslint/unbound-method": "off",
      // Test setup legitimately uses `delete process.env[key]` for cleanup
      "@typescript-eslint/no-dynamic-delete": "off",
      // Test mocks often require `any` to stub third-party types (e.g. nodemailer transport)
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
  // PB-026: Flavor boundary rule — flavor template files (under flavors/<name>/, excluding
  // _shared/) must not import Satori, sharp, or epub-gen-memory. Templates must remain
  // renderer-agnostic so the rendering engine can be swapped without touching flavor files.
  // Implements the boundary requirement in docs/designs/PB-026-redesigned-thumbnail-rendering/design.md.
  {
    files: [
      "src/infrastructure/converter/flavors/classic/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "satori",
              message:
                "Flavor files must not import Satori directly. " +
                "The CoverFlavor contract uses domain types (SatoriNode, SatoriStyle) defined in domain/ports.ts — " +
                "the renderer (cover-generator.ts) handles Satori invocation.",
            },
            {
              name: "sharp",
              message:
                "Flavor files must not import sharp. " +
                "Rasterization is the renderer's responsibility (cover-generator.ts).",
            },
            {
              name: "epub-gen-memory",
              message:
                "Flavor files must not import epub-gen-memory. " +
                "EPUB assembly is handled outside the flavor layer.",
            },
          ],
        },
      ],
    },
  },
);
