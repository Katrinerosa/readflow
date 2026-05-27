import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readerDist = path.resolve(__dirname, "../../reader/dist");
const target = path.resolve(__dirname, "../public/reader");

if (!fs.existsSync(readerDist)) {
  console.error(
    "[copy-reader] reader/dist not found. Did you run pnpm -C apps/reader build?"
  );
  process.exit(0);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

copyDir(readerDist, target);
console.log("[copy-reader] Copied Vue reader to /public/reader");
