import { defineConfig } from "tsup";
import { cpSync } from "node:fs";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    target: "node18",
    outDir: "dist",
    clean: true,
    splitting: false,
    sourcemap: true,
    dts: false,
    banner: {
        js: "#!/usr/bin/env node"
    },
    onSuccess: async () => {
        cpSync("src/templates", "dist/templates", { recursive: true });
    }
});
