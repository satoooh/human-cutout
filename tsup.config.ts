import { defineConfig } from "tsup";

export default defineConfig([
  // CLI entry (with shebang)
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    dts: false,
    clean: true,
    splitting: false,
    sourcemap: false,
    minify: true,
    shims: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
  // Library entry
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: false,
    minify: true,
    shims: true,
  },
]);
