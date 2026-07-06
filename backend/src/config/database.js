const mysql = require('mysql2/promise');
require('dotenv').config();

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
    multipleStatements: true
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
    }
};

if (process.env.NODE_ENV !== 'test') {
    testConnection();
}

module.exports = pool;