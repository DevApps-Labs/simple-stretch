#!/usr/bin/env node
// Installs the pre-commit git hook. Runs automatically via npm prepare.
const fs = require("fs");
const path = require("path");

const hooksDir = path.join(__dirname, "..", ".git", "hooks");
if (!fs.existsSync(hooksDir)) {
  // Not in a git repo (e.g. CI/Vercel build) — skip silently
  process.exit(0);
}

const hookPath = path.join(hooksDir, "pre-commit");
const hookContent = `#!/bin/sh
node scripts/bump-sw-cache.js
git add public/sw.js
`;

fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
console.log("install-hooks: pre-commit hook installed");
