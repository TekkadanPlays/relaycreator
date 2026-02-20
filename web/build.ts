import { $ } from "bun";
import path from "path";

const root = import.meta.dir;
const entrypoint = path.join(root, "src/main.tsx");
const outdir = path.join(root, "dist");

console.log("→ Building JS bundle...");
const result = await Bun.build({
  entrypoints: [entrypoint],
  outdir,
  target: "browser",
  format: "esm",
  splitting: true,
  minify: true,
  sourcemap: "linked",
  naming: "[dir]/[name]-[hash].[ext]",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

const jsFiles = result.outputs.filter((o) => o.path.endsWith(".js"));
const entryFile = jsFiles.find((o) => o.path.includes("main"));
const entryName = entryFile ? path.basename(entryFile.path) : "main.js";

console.log(`  ✓ ${result.outputs.length} files written`);

console.log("→ Building CSS...");
await $`bunx @tailwindcss/cli -i src/index.css -o dist/index.css --minify`.cwd(root);
console.log("  ✓ CSS compiled");

// Generate index.html with hashed filenames
const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>mycelium.social — Nostr Relay Infrastructure</title>
    <link rel="stylesheet" href="/rc/${entryName.replace('.js', '.css')}" />
    <link rel="stylesheet" href="/rc/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/rc/${entryName}"></script>
  </body>
</html>`;

await Bun.write(path.join(outdir, "index.html"), html);
console.log("  ✓ index.html generated");

// Copy static assets
const publicDir = path.join(root, "public");
const publicExists = await Bun.file(path.join(publicDir, "favicon.svg")).exists();
if (publicExists) {
  await $`cp -r ${publicDir}/* ${outdir}/`.nothrow();
  console.log("  ✓ Static assets copied");
}

console.log("✓ Build complete → dist/");
