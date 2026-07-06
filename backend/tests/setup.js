require('dotenv').config();
process.env.JWT_SECRET = 'secret_test'; // Forzar secret para tests
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Asegurarse de que el DB_NAME original y la conexion base de mysql se pueda crear.
// Importamos el pool. Como estamos en NODE_ENV=test, apuntará a la DB de test.
const pool = require('../src/config/database');
const runMigrations = require('../src/migrations/runMigrations');

const dbNameTest = `${process.env.DB_NAME}_test`;

beforeAll(async () => {
    // 1. Crear la base de datos de test usando una conexion general
    const initialConnection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    
    await initialConnection.query(`DROP DATABASE IF EXISTS \`${dbNameTest}\``);
    await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbNameTest}\``);
    await initialConnection.end();

    // 2. Correr migraciones en la base de test
    await runMigrations();
});

beforeEach(async () => {
    // 3. Limpiar todas las tablas antes de cada test para asegurar limpieza
    const connection = await pool.getConnection();
    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        
        const [tables] = await connection.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ?
        `, [dbNameTest]);

        for (const table of tables) {
            const tableName = table['TABLE_NAME'] || table['table_name'];
            if (tableName !== 'migrations') { // asumimos que no hay tabla migrations, pero por las dudas
                await connection.query(`TRUNCATE TABLE \`${tableName}\``);
            }
        }
    } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        connection.release();
    }
});

afterAll(async () => {
    // 4. Cerrar el pool al terminar
    await pool.end();
});

// Helper para tests que requieran token de administrador
global.crearUsuarioAdminYObtenerToken = async () => {
    const connection = await pool.getConnection();
    try {
        const passwordHash = await bcrypt.hash('admin123', 10);
        const [result] = await connection.query(`
            INSERT INTO usuarios (nombre, username, password_hash, rol) 
            VALUES ('Admin Test', 'admin_test', ?, 'admin')
        `, [passwordHash]);

        const adminId = result.insertId;
        const token = jwt.sign(
            { id: adminId, role: 'admin' },
            process.env.JWT_SECRET || 'secret_test',
            { expiresIn: '1h' }
        );

        return { token, adminId };
    } finally {
        connection.release();
    }
};

global.crearClienteHelper = async (nombre = 'Cliente Test') => {
    const connection = await pool.getConnection();
    try {
        const [res] = await connection.query(`
            INSERT INTO clientes (nombre, telefono, email, direccion)
            VALUES (?, '123456789', 'cliente@test.com', 'Calle Falsa 123')
        `, [nombre]);
        return res.insertId;
    } finally {
        connection.release();
    }
};
