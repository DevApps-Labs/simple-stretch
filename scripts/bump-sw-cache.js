#!/usr/bin/env node
// Auto-bumps version in lib/version.js and syncs CACHE in public/sw.js.
// Called by the pre-commit git hook (patch bump).
// Manual usage: node scripts/bump-sw-cache.js [--minor | --major]
const fs = require("fs");
const path = require("path");

const flag = process.argv[2];
const bumpType = flag === "--major" ? "major" : flag === "--minor" ? "minor" : "patch";

const versionPath = path.join(__dirname, "..", "lib", "version.js");
const versionContent = fs.readFileSync(versionPath, "utf8");

const match = versionContent.match(/VERSION = "(\d+)\.(\d+)\.(\d+)"/);
if (!match) {
  console.error("bump-sw-cache: VERSION pattern not found in lib/version.js");
  process.exit(1);
}

let [major, minor, patch] = [+match[1], +match[2], +match[3]];
if (bumpType === "major") { major++; minor = 0; patch = 0; }
else if (bumpType === "minor") { minor++; patch = 0; }
else { patch++; }
const newVersion = `${major}.${minor}.${patch}`;

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
console.log(`bump-sw-cache: v${newVersion} (${bumpType})`);
