import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const watch = process.argv.includes("--watch");
const root = fileURLToPath(new URL(".", import.meta.url));
const outdir = `${root}dist`;

const entries = {
  "service-worker": `${root}src/background/service-worker.ts`,
  "content": `${root}src/content/content.ts`,
  "popup": `${root}src/popup/popup.ts`,
  "options": `${root}src/options/options.ts`
};

async function prepare() {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  await cp(`${root}public/manifest.json`, `${outdir}/manifest.json`);
  await cp(`${root}src/popup/popup.html`, `${outdir}/popup.html`);
  await cp(`${root}src/popup/popup.css`, `${outdir}/popup.css`);
  await cp(`${root}src/options/options.html`, `${outdir}/options.html`);
  await cp(`${root}src/options/options.css`, `${outdir}/options.css`);
}

async function run() {
  await prepare();
  const options = {
    entryPoints: entries,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome120"],
    outdir,
    sourcemap: false,
    legalComments: "none"
  };
  if (watch) {
    const buildContext = await context(options);
    await buildContext.watch();
    console.log("Watching for changes...");
  } else {
    await build(options);
    console.log("Built dist/");
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
