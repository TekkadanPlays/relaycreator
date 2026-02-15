import { Hono } from "hono";
import { $ } from "bun";
import path from "path";

const app = new Hono();
const root = import.meta.dir;
const devBuildDir = path.join(root, ".dev-build");
const publicDir = path.join(root, "public");
const API_TARGET = process.env.API_URL || "http://localhost:4000";

const MIME: Record<string, string> = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".html": "text/html",
  ".json": "application/json",
  ".txt": "text/plain",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// --- Rebuild JS on demand ---
let lastBuildTime = 0;

async function rebuild() {
  const now = Date.now();
  if (now - lastBuildTime < 500) return;

  const result = await Bun.build({
    entrypoints: [path.join(root, "src/main.tsx")],
    outdir: devBuildDir,
    target: "browser",
    format: "esm",
    splitting: true,
    sourcemap: "inline",
    define: {
      "process.env.NODE_ENV": '"development"',
    },
  });

  lastBuildTime = Date.now();
  if (!result.success) {
    console.error("  [build] FAILED:");
    for (const log of result.logs) console.error("   ", log);
  } else {
    console.log(`  [build] ${result.outputs.length} files (${Date.now() - now}ms)`);
  }
}

// --- Rebuild CSS on demand ---
let cachedCSS: string = "";
let lastCSSBuild = 0;

async function rebuildCSS(): Promise<string> {
  const now = Date.now();
  if (cachedCSS && now - lastCSSBuild < 2000) return cachedCSS;

  try {
    cachedCSS = await $`bunx @tailwindcss/cli -i src/index.css --minify`.cwd(root).text();
    lastCSSBuild = Date.now();
  } catch (e: any) {
    console.error("  [css] FAILED:", e.message);
    if (!cachedCSS) cachedCSS = "/* CSS build failed */";
  }
  return cachedCSS;
}

// Do initial build at startup
await rebuild();
await rebuildCSS();

// --- API proxy ---
app.all("/api/*", async (c) => {
  const url = new URL(c.req.url);
  const target = `${API_TARGET}${url.pathname}${url.search}`;
  const headers = new Headers(c.req.raw.headers);
  headers.delete("host");

  try {
    const resp = await fetch(target, {
      method: c.req.method,
      headers,
      body: c.req.method !== "GET" && c.req.method !== "HEAD" ? c.req.raw.body : undefined,
      // @ts-ignore duplex needed for streaming request bodies
      duplex: "half",
    });
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: resp.headers,
    });
  } catch {
    return c.text("API proxy error", 502);
  }
});

// --- Middleware: try to serve static/built files before SPA fallback ---
app.use("*", async (c, next) => {
  const reqPath = c.req.path;

  // Rebuild JS on each request (debounced)
  if (reqPath.endsWith(".js")) {
    await rebuild();
  }

  // Serve from .dev-build/
  const devFile = Bun.file(path.join(devBuildDir, reqPath));
  if (await devFile.exists()) {
    const ext = path.extname(reqPath);
    return new Response(devFile, {
      headers: { "content-type": MIME[ext] || "application/octet-stream" },
    });
  }

  // Serve /index.css (Tailwind)
  if (reqPath === "/index.css") {
    const css = await rebuildCSS();
    return new Response(css, { headers: { "content-type": "text/css" } });
  }

  // Serve from public/
  const pubFile = Bun.file(path.join(publicDir, reqPath));
  if (await pubFile.exists()) {
    const ext = path.extname(reqPath);
    return new Response(pubFile, {
      headers: { "content-type": MIME[ext] || "application/octet-stream" },
    });
  }

  await next();
});

// --- SPA fallback ---
app.get("*", async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>relay.tools — Create Your Nostr Relay</title>
    <link rel="stylesheet" href="/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`);
});

const port = Number(process.env.PORT) || 5173;
console.log(`\n  🚀 relay.tools dev server`);
console.log(`  → http://localhost:${port}`);
console.log(`  → API proxy → ${API_TARGET}\n`);

export default {
  port,
  fetch: app.fetch,
};
