const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Las migraciones son archivos .sql locales y de confianza que pueden traer múltiples
// sentencias, así que usan su propia conexión con multipleStatements habilitado en vez
// del pool compartido de la app (que no debe tenerlo habilitado por seguridad).
async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, '../../migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found, skipping.');
    return;
  }

  const dbName = process.env.NODE_ENV === 'test'
    ? `${process.env.DB_NAME}_test`
    : process.env.DB_NAME;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    multipleStatements: true
  });

  try {
    await connection.query(`
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
      const [rows] = await connection.query('SELECT COUNT(*) as cnt FROM migrations WHERE filename = ?', [file]);
      if (rows[0].cnt > 0) {
        // already applied
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      console.log('Applying migration:', file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      // Execute migration SQL (may contain multiple statements)
      await connection.query(sql);
      await connection.query('INSERT INTO migrations (filename) VALUES (?)', [file]);
      console.log('Applied migration:', file);
    }
  } catch (err) {
    console.error('Migration error:', err.message || err);
    throw err;
  } finally {
    await connection.end();
  }
}

module.exports = runMigrations;
