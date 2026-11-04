// Copies the khonnai app (the repo root, one level up) to public/app so the landing page can link to it.
// The app stays the single source; public/app is generated and git-ignored.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "..");
const target = resolve(root, "public/app");
// the landing source itself, git data, tooling, docs and test captures are not part of the app
const skip = new Set(["landing", ".git", ".github", ".claude", "verification", "node_modules", "README.md", "DESIGN.md", "vercel.json"]);

if (!existsSync(resolve(source, "index.html"))) {
  console.error(`sync-app: no app found at ${source}; the "เริ่มใช้ฟรี" links will 404.`);
  process.exit(1);
}
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const name of readdirSync(source)) {
  if (!skip.has(name)) cpSync(resolve(source, name), resolve(target, name), { recursive: true });
}
console.log("sync-app: copied the app → public/app");
