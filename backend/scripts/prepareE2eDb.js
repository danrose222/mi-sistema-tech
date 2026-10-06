// Prepara una base de datos descartable para los tests E2E (Playwright):
// la recrea desde cero, aplica las migraciones y carga los datos del seed.
// Lo invoca frontend/playwright.config.ts antes de levantar el backend.
//
// Es destructivo (DROP DATABASE), así que se niega a correr si DB_NAME no
// termina en "_e2e": evita borrar por error la base de desarrollo o la de
// producción si alguien lo ejecuta con el .env equivocado.
require('dotenv').config();
const path = require('path');
const { execFileSync } = require('child_process');
const mysql = require('mysql2/promise');
const runMigrations = require('../src/migrations/runMigrations');

async function prepararBaseE2e() {
  const dbName = process.env.DB_NAME;
  if (!dbName || !dbName.endsWith('_e2e')) {
    throw new Error(`DB_NAME debe terminar en "_e2e" (recibido: "${dbName}"). Abortado para no borrar otra base.`);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await connection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4`);
  } finally {
    await connection.end();
  }

  await runMigrations();

  // seed.js termina con process.exit(), así que corre en un proceso aparte.
  execFileSync(process.execPath, [path.join(__dirname, 'seed.js')], { stdio: 'inherit', env: process.env });

  // seed.js atrapa sus propios errores y sale con código 0 igual: se verifica
  // explícitamente que haya dejado el usuario admin que usan los tests.
  const check = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName
  });
  try {
    const [rows] = await check.query("SELECT COUNT(*) AS total FROM usuarios WHERE username = 'admin'");
    if (rows[0].total === 0) {
      throw new Error('El seed no creó el usuario admin: revisar la salida de seed.js.');
    }
  } finally {
    await check.end();
  }

  console.log(`✅ Base E2E "${dbName}" lista.`);
}

prepararBaseE2e().catch((err) => {
  console.error('❌ No se pudo preparar la base E2E:', err.message || err);
  process.exit(1);
});
