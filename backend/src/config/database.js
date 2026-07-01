const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión a la base de datos MySQL establecida con éxito.');
        connection.release();
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error.message);
    }
};

testConnection();

module.exports = pool;