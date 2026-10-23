// Startet alle kompilierten *.test.js unterhalb des übergebenen Verzeichnisses mit dem Node-Testrunner.
// (Eigenes Skript, weil `node --test <dir>` je nach Node-Version Verzeichnisse/Globs unterschiedlich behandelt.)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = path.resolve(process.argv[2] || 'dist-test');

function findTests(current) {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) return findTests(full);
    return entry.name.endsWith('.test.js') ? [full] : [];
  });
}

const files = findTests(dir);
if (files.length === 0) {
  console.error(`Keine Tests in ${dir} gefunden.`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
