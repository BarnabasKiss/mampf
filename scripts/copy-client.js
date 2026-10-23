// Kopiert das Frontend (src/client) rekursiv nach dist/client.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, 'src', 'client');
const target = path.join(root, 'dist', 'client');

fs.rmSync(target, { recursive: true, force: true });
// Testdateien gehören nicht ins ausgelieferte Frontend.
fs.cpSync(source, target, { recursive: true, filter: (file) => !file.endsWith('.test.mjs') });
console.log('Client files copied.');
