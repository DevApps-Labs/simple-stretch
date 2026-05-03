#!/usr/bin/env node
// Updates the CACHE version string in public/sw.js with a timestamp.
// Called by the pre-commit git hook.
const fs = require("fs");
const path = require("path");

const swPath = path.join(__dirname, "..", "public", "sw.js");
const content = fs.readFileSync(swPath, "utf8");

const d = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
const newCache = `stretch-${stamp}`;

const updated = content.replace(
  /const CACHE = "stretch-[^"]*"/,
  `const CACHE = "${newCache}"`
);

if (updated === content) {
  console.error("bump-sw-cache: CACHE pattern not found in public/sw.js");
  process.exit(1);
}

fs.writeFileSync(swPath, updated);
console.log(`bump-sw-cache: ${newCache}`);
