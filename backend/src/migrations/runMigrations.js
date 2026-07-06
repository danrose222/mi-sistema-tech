const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, '../../migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found, skipping.');
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.includes('_rollback'))
      .sort();

    for (const file of files) {
      const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM migrations WHERE filename = ?', [file]);
      if (rows[0].cnt > 0) {
        // already applied
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      console.log('Applying migration:', file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      // Execute migration SQL (may contain multiple statements)
      await pool.query(sql);
      await pool.query('INSERT INTO migrations (filename) VALUES (?)', [file]);
      console.log('Applied migration:', file);
    }
  } catch (err) {
    console.error('Migration error:', err.message || err);
    throw err;
  }
}

module.exports = runMigrations;
