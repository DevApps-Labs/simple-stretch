#!/usr/bin/env node
// Auto-bumps patch version in lib/version.js and syncs CACHE in public/sw.js.
// Called by the pre-commit git hook.
const fs = require("fs");
const path = require("path");

const versionPath = path.join(__dirname, "..", "lib", "version.js");
const versionContent = fs.readFileSync(versionPath, "utf8");

const match = versionContent.match(/VERSION = "(\d+)\.(\d+)\.(\d+)"/);
if (!match) {
  console.error("bump-sw-cache: VERSION pattern not found in lib/version.js");
  process.exit(1);
}

const [major, minor, patch] = [+match[1], +match[2], +match[3]];
const newVersion = `${major}.${minor}.${patch + 1}`;

fs.writeFileSync(versionPath, `export const VERSION = "${newVersion}";\n`);

const swPath = path.join(__dirname, "..", "public", "sw.js");
const swContent = fs.readFileSync(swPath, "utf8");
const updatedSw = swContent.replace(
  /const CACHE = "stretch-[^"]*"/,
  `const CACHE = "stretch-${newVersion}"`
);

if (updatedSw === swContent) {
  console.error("bump-sw-cache: CACHE pattern not found in public/sw.js");
  process.exit(1);
}

fs.writeFileSync(swPath, updatedSw);
console.log(`bump-sw-cache: v${newVersion}`);
