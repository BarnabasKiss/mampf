// Kopiert das Frontend (src/client) rekursiv nach dist/client.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, 'src', 'client');
const target = path.join(root, 'dist', 'client');

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
console.log('Client files copied.');
