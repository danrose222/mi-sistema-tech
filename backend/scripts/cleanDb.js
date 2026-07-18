/**
 * Vacía las tablas transaccionales (pedidos, pagos, créditos, cuotas, stock,
 * clientes y productos de prueba) para dejar el sistema en cero antes de
 * salir a producción. Los usuarios del panel (admin/cajeros) NO se tocan,
 * salvo que falte el administrador principal, en cuyo caso se regenera.
 *
 * Uso:
 *   npm run db:clean              (pide confirmación escribiendo "BORRAR")
 *   npm run db:clean -- --force   (sin confirmación, para pipelines)
 *
 * Variables de entorno:
 *   DB_HOST, DB_USER, DB_PASSWORD, DB_NAME  (requeridas)
 *   ADMIN_USERNAME                          (opcional: si no está definida,
 *                                            no se toca ni se valida nada de usuarios)
 *   ADMIN_PASSWORD, ADMIN_NOMBRE            (requeridas solo si ADMIN_USERNAME
 *                                            no existe todavía en la base — no
 *                                            hay contraseña por defecto a propósito)
 *
 * Nota: TRUNCATE en MySQL hace un commit implícito por tabla, así que esta
 * limpieza no es atómica de punta a punta. Por eso el chequeo de que el
 * admin se pueda regenerar corre ANTES de tocar cualquier tabla.
 */
require('dotenv').config();
const readline = require('readline');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const TABLAS_TRANSACCIONALES = [
  'alertas_enviadas',
  'cuotas',
  'creditos',
  'cuentas_corrientes',
  'pagos',
  'pedido_items',
  'pedidos',
  'stock_movimientos',
  'producto_imagenes',
  'productos',
  'clientes'
];

function preguntar(texto) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(texto, (respuesta) => {
    rl.close();
    resolve(respuesta);
  }));
}

async function confirmar(dbName) {
  if (process.argv.includes('--force')) return true;

  console.log(`\nEsto borra TODOS los pedidos, pagos, créditos, cuotas, movimientos de stock, clientes y productos de "${dbName}".`);
  console.log('Los usuarios del panel (admin/cajeros) no se modifican, salvo que falte el administrador principal.\n');

  const respuesta = await preguntar('Escribí BORRAR para confirmar: ');
  return respuesta.trim() === 'BORRAR';
}

/**
 * Si ADMIN_USERNAME está definido y ese usuario no existe todavía, exige que
 * ADMIN_PASSWORD también esté definida. Se corre antes de truncar cualquier
 * tabla para no dejar la base a medio limpiar si falta ese dato.
 */
async function validarQueElAdminSePuedaRegenerar(connection) {
  const username = process.env.ADMIN_USERNAME;
  if (!username) {
    console.log('  ⚠ ADMIN_USERNAME no está definida: se omite la verificación del administrador.');
    return;
  }

  const [existentes] = await connection.query('SELECT id FROM usuarios WHERE username = ?', [username]);
  if (existentes.length === 0 && !process.env.ADMIN_PASSWORD) {
    throw new Error(
      `El usuario "${username}" no existe y ADMIN_PASSWORD no está definida: no se puede regenerar el ` +
      'administrador sin una contraseña explícita (no hay valor por defecto a propósito).'
    );
  }
}

async function asegurarAdmin(connection) {
  const username = process.env.ADMIN_USERNAME;
  if (!username) return;

  const [existentes] = await connection.query('SELECT id FROM usuarios WHERE username = ?', [username]);
  if (existentes.length > 0) {
    console.log(`  ✓ Usuario "${username}" ya existía, se conserva sin modificar.`);
    return;
  }

  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  await connection.query(
    "INSERT INTO usuarios (nombre, username, password_hash, rol) VALUES (?, ?, ?, 'admin')",
    [process.env.ADMIN_NOMBRE || 'Administrador', username, hash]
  );
  console.log(`  ✓ Usuario administrador "${username}" regenerado.`);
}

async function main() {
  const requeridas = ['DB_HOST', 'DB_USER', 'DB_NAME'];
  const faltantes = requeridas.filter((clave) => !process.env[clave]);
  if (faltantes.length > 0) {
    console.error(`Faltan variables de entorno: ${faltantes.join(', ')}`);
    process.exit(1);
  }

  const ok = await confirmar(process.env.DB_NAME);
  if (!ok) {
    console.log('Operación cancelada.');
    process.exit(0);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME
  });

  try {
    await validarQueElAdminSePuedaRegenerar(connection);

    console.log('\nLimpiando tablas...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const tabla of TABLAS_TRANSACCIONALES) {
      await connection.query(`TRUNCATE TABLE \`${tabla}\``);
      console.log(`  ✓ ${tabla} vaciada`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await asegurarAdmin(connection);

    console.log('\nListo: base de datos limpia y lista para producción.\n');
  } catch (error) {
    console.error('\nError al limpiar la base de datos:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
