const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const serverDirectory = path.join(__dirname, '..', 'server');
const files = fs.readdirSync(serverDirectory)
  .filter(file => file.endsWith('.js'))
  .sort();

for (const file of files) {
  const target = path.join(serverDirectory, file);
  execFileSync(process.execPath, ['--check', target], { stdio: 'inherit' });
}

console.log(`Syntax check passed for ${files.length} server files.`);
