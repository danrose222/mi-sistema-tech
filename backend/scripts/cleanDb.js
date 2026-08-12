/**
 * Seeder de inicialización para producción: deja la base de datos en cero
 * (sin ningún dato de prueba/desarrollo) y crea el único usuario
 * administrador con el que el cliente arranca en producción.
 *
 * Vacía TODAS las tablas transaccionales y de datos de desarrollo, incluida
 * `usuarios` -- a propósito: así se eliminan también las cuentas dummy que
 * genera `npm run seed` (admin/juan/maria con contraseñas hardcodeadas) y
 * no queda ninguna cuenta de prueba dando vueltas en producción.
 *
 * Este esquema no tiene tablas de catálogo propias (roles, estados,
 * categorías): son columnas ENUM fijas definidas en el propio CREATE TABLE
 * de cada migración (ver migrations/001_initial.sql y
 * migrations/021_create_plan_canje.sql), así que no hay nada más que
 * "sembrar" aparte del administrador.
 *
 * Idempotencia: en vez de verificar existencia antes de insertar, el script
 * vacía las tablas y recrea el admin en cada corrida. El resultado final es
 * siempre el mismo (una sola cuenta admin, todo lo demás en cero) sin
 * fallar ni duplicar registros -- correrlo dos veces seguidas es seguro.
 * Por eso mismo, NO es una herramienta de mantenimiento: está pensada para
 * correr una única vez, justo antes del primer despliegue. Volver a
 * correrla contra una base ya en producción borra pedidos, clientes y
 * usuarios reales.
 *
 * Uso:
 *   ADMIN_USERNAME=admin ADMIN_INITIAL_PASSWORD=xxxxxxxx npm run db:clean
 *   ADMIN_USERNAME=admin ADMIN_INITIAL_PASSWORD=xxxxxxxx npm run db:clean -- --force
 *
 * Variables de entorno:
 *   DB_HOST, DB_USER, DB_NAME               (requeridas)
 *   DB_PASSWORD                             (opcional, default '')
 *   ADMIN_USERNAME                          (requerida)
 *   ADMIN_INITIAL_PASSWORD                  (requerida, mínimo 8 caracteres;
 *                                            sin valor por defecto a propósito,
 *                                            nunca hardcodear una contraseña acá)
 *   ADMIN_NOMBRE                            (opcional, default 'Administrador')
 */
require('dotenv').config();
const readline = require('readline');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;
const PASSWORD_MIN_LENGTH = 8;

// Orden sin relevancia funcional (FOREIGN_KEY_CHECKS se desactiva durante el
// vaciado), pero se mantienen las tablas hijas antes que sus padres por
// legibilidad. `usuarios` va al final porque es la que más tablas referencian.
const TABLAS_A_VACIAR = [
  'alertas_enviadas',
  'plan_canje',
  'cuotas',
  'creditos',
  'cuentas_corrientes',
  'caja_movimientos',
  'pagos',
  'pedido_items',
  'pedidos',
  'stock_movimientos',
  'producto_imagenes',
  'productos',
  'whatsapp_sessions',
  'clientes',
  'usuarios'
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

  console.log(`\nEsto deja "${dbName}" completamente en cero: borra pedidos, pagos, créditos,`);
  console.log('cuotas, movimientos de stock y caja, clientes, canjes, sesiones de WhatsApp');
  console.log('y TODOS los usuarios (incluidas las cuentas de prueba de "npm run seed").');
  console.log('Al final queda un único usuario administrador, tomado de ADMIN_USERNAME /');
  console.log('ADMIN_INITIAL_PASSWORD.\n');

  const respuesta = await preguntar('Escribí BORRAR para confirmar: ');
  return respuesta.trim() === 'BORRAR';
}

function validarEnv() {
  const requeridas = ['DB_HOST', 'DB_USER', 'DB_NAME', 'ADMIN_USERNAME', 'ADMIN_INITIAL_PASSWORD'];
  const faltantes = requeridas.filter((clave) => !process.env[clave]);
  if (faltantes.length > 0) {
    throw new Error(`Faltan variables de entorno: ${faltantes.join(', ')}`);
  }
  if (process.env.ADMIN_INITIAL_PASSWORD.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`ADMIN_INITIAL_PASSWORD debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  }
}

async function crearAdmin(connection) {
  const hash = await bcrypt.hash(process.env.ADMIN_INITIAL_PASSWORD, BCRYPT_ROUNDS);
  await connection.query(
    "INSERT INTO usuarios (nombre, username, password_hash, rol) VALUES (?, ?, ?, 'admin')",
    [process.env.ADMIN_NOMBRE || 'Administrador', process.env.ADMIN_USERNAME, hash]
  );
  console.log(`  ✓ Usuario administrador "${process.env.ADMIN_USERNAME}" creado.`);
}

async function main() {
  try {
    validarEnv();
  } catch (error) {
    console.error(`\n${error.message}\n`);
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
    console.log('\nVaciando tablas...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const tabla of TABLAS_A_VACIAR) {
      await connection.query(`TRUNCATE TABLE \`${tabla}\``);
      console.log(`  ✓ ${tabla} vaciada`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\nCreando administrador...');
    await crearAdmin(connection);

    console.log('\nListo: base de datos limpia y lista para producción.\n');
  } catch (error) {
    console.error('\nError al inicializar la base de datos:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
