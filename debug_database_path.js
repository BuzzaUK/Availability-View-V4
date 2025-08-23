const path = require('path');
const { sequelize } = require('./src/backend/config/database');

console.log('=== Database Path Debug ===');
console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);
console.log('Database storage option:', sequelize.options.storage);
console.log('Resolved database path:', path.resolve(sequelize.options.storage));

// Check if database file exists
const fs = require('fs');
const dbPath = path.resolve(sequelize.options.storage);
console.log('Database file exists:', fs.existsSync(dbPath));

if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log('Database file size:', stats.size, 'bytes');
  console.log('Database file modified:', stats.mtime);
}

// Also check for database files in different locations
const possiblePaths = [
  './database.sqlite',
  './src/backend/database.sqlite',
  path.join(__dirname, 'database.sqlite'),
  path.join(__dirname, 'src', 'backend', 'database.sqlite')
];

console.log('\n=== Checking possible database locations ===');
possiblePaths.forEach(dbPath => {
  const resolved = path.resolve(dbPath);
  const exists = fs.existsSync(resolved);
  console.log(`${dbPath} -> ${resolved} (exists: ${exists})`);
  if (exists) {
    const stats = fs.statSync(resolved);
    console.log(`  Size: ${stats.size} bytes, Modified: ${stats.mtime}`);
  }
});