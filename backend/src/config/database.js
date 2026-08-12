const mysql = require('mysql2/promise');
require('dotenv').config();

const REQUERIDAS = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const faltantes = REQUERIDAS.filter((clave) => !process.env[clave]);
if (faltantes.length > 0) {
  throw new Error(`Faltan variables de entorno críticas: ${faltantes.join(', ')}`);
}

const dbName = process.env.NODE_ENV === 'test'
  ? `${process.env.DB_NAME}_test`
  : process.env.DB_NAME;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Controla cómo mysql2 convierte, del lado del cliente, los DATE/DATETIME/
    // TIMESTAMP que van y vuelven del servidor. OJO: esto NO cambia lo que el
    // servidor MySQL calcula para NOW()/CURDATE()/CURRENT_TIMESTAMP — eso
    // depende de la sesión (ver el listener 'connection' más abajo).
    timezone: '-03:00'
});

// `timezone` arriba no alcanza para NOW()/CURDATE() calculados del lado del
// servidor (ej. "WHERE DATE(created_at) = CURDATE()" en Caja Diaria, o los
// crons que comparan fecha_vencimiento contra CURDATE()): esos se calculan
// con el session time_zone de MySQL, que por defecto es 'SYSTEM' (la del
// sistema operativo del VPS, no necesariamente Argentina). Se fuerza
// explícitamente en cada conexión nueva del pool.
pool.on('connection', (connection) => {
    connection.query("SET time_zone = '-03:00'", (err) => {
        if (err) console.error('⚠️  No se pudo fijar time_zone en la conexión MySQL:', err.message);
    });
});

const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        if (process.env.NODE_ENV !== 'test') {
            console.log(`✅ Conexión a la base de datos MySQL (${dbName}) establecida con éxito.`);
        }
        connection.release();
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error.message);
        process.exit(1); // fail-fast: no seguir aceptando tráfico con la DB inaccesible
    }
};

if (process.env.NODE_ENV !== 'test') {
    testConnection();
}

module.exports = pool;