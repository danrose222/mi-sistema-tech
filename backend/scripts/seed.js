require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function runSeed() {
  console.log('🌱 Iniciando script de seed (Generación de datos de prueba para Argentina 2026)...');
  
  let connection;
  try {
    // Configuración de conexión compatible con dotenv
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mi_sistema_tech',
      // Soporte extra si se usa la url directa:
      uri: process.env.DATABASE_URL
    };
    
    if (process.env.DATABASE_URL) {
      connection = await mysql.createConnection(process.env.DATABASE_URL);
    } else {
      connection = await mysql.createConnection(dbConfig);
    }

    console.log('✅ Conexión a la base de datos establecida.');

    // Desactivar comprobación de claves foráneas temporalmente para limpiar las tablas
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    console.log('🧹 Limpiando tablas...');
    // NOTA: 'categorias' no está en el listado porque el esquema inicial 001_initial.sql
    // no tiene dicha tabla ni relación con productos. Para evitar errores, omitimos 'categorias'.
    const tablas = [
      'cuentas_corrientes', 'cuotas', 'creditos', 'pagos', 
      'alertas_enviadas', 'pedido_items', 'pedidos', 
      'stock_movimientos', 'productos', 'clientes', 'usuarios', 'whatsapp_sessions'
    ];
    
    for (const tabla of tablas) {
      try {
        await connection.query(`TRUNCATE TABLE ${tabla}`);
      } catch (e) {
        // Se ignora el error de forma silenciosa por si alguna tabla no se migró
      }
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Tablas limpias.');

    console.log('🚀 Comenzando transacción de datos...');
    await connection.beginTransaction();

    // ---------------------------------------------------------
    // 1. Usuarios
    // ---------------------------------------------------------
    console.log('👤 Generando Usuarios...');
    const pwdAdmin = await bcrypt.hash('admin123', 10);
    const pwdJuan = await bcrypt.hash('juan123', 10);
    const pwdMaria = await bcrypt.hash('maria123', 10);
    
    await connection.query(`
      INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES 
      ('admin', ?, 'Administrador General', 'admin'),
      ('juan', ?, 'Juan Cajero', 'cajero'),
      ('maria', ?, 'María Cajera', 'cajero')
    `, [pwdAdmin, pwdJuan, pwdMaria]);

    // ---------------------------------------------------------
    // 2. Clientes
    // ---------------------------------------------------------
    console.log('👥 Generando Clientes (Argentina)...');
    const clientesData = [
      ['Juan Pérez', '+54 9 11 1234-5678', 'juan.perez@email.com', 'Av. Rivadavia 1234, CABA'],
      ['María González', '+54 9 11 2345-6789', 'maria.g@email.com', 'Av. Corrientes 4321, CABA'],
      ['Carlos López', '+54 9 11 3456-7890', 'carlos.lopez@email.com', 'Belgrano 555, Morón, BA'],
      ['Ana Martínez', '+54 9 11 4567-8901', 'ana.m@email.com', 'San Martín 789, Quilmes, BA'],
      ['Lucas Fernández', '+54 9 11 5678-9012', 'lucas.f@email.com', 'Av. Cabildo 2000, CABA'],
      ['Sofía Rodríguez', '+54 9 11 6789-0123', 'sofia.r@email.com', 'Florida 100, CABA'],
      ['Diego Gómez', '+54 9 11 7890-1234', 'diego.g@email.com', 'Av. de Mayo 600, CABA'],
      ['Laura Díaz', '+54 9 11 8901-2345', 'laura.d@email.com', 'Av. Santa Fe 3000, CABA'],
      ['Martín Torres', '+54 9 11 9012-3456', 'martin.t@email.com', 'Mitre 250, Avellaneda, BA'],
      ['Florencia Silva', '+54 9 11 0123-4567', 'florencia.s@email.com', 'Alvear 400, Martínez, BA']
    ];
    
    let clientesIds = [];
    for (const c of clientesData) {
      const [res] = await connection.query(`INSERT INTO clientes (nombre, telefono, email, direccion) VALUES (?, ?, ?, ?)`, c);
      clientesIds.push(res.insertId);
    }

    // ---------------------------------------------------------
    // 3. Productos (Precios ARS 2026 aproximados)
    // ---------------------------------------------------------
    console.log('📱 Generando Productos...');
    const productosData = [
      ['iPhone 15 128GB', 'Celular Apple', 'CEL-IP15-128', '1111111111111', 1200000, 15],
      ['Samsung Galaxy S24', 'Celular Samsung', 'CEL-S24-256', '2222222222222', 1100000, 20],
      ['Motorola Moto G84', 'Celular Motorola', 'CEL-MG84-256', '3333333333333', 450000, 30],
      ['Xiaomi Redmi Note 13', 'Celular Xiaomi', 'CEL-RN13-256', '4444444444444', 380000, 50],
      ['Lenovo IdeaPad 3', 'Laptop Lenovo', 'LAP-LEN-001', '5555555555555', 850000, 10],
      ['HP Pavilion 15', 'Laptop HP', 'LAP-HP-002', '6666666666666', 920000, 8],
      ['Dell Inspiron 3000', 'Laptop Dell', 'LAP-DELL-003', '7777777777777', 950000, 5],
      ['ASUS VivoBook', 'Laptop ASUS', 'LAP-ASUS-004', '8888888888888', 880000, 12],
      ['Funda iPhone 15', 'Funda silicona', 'ACC-FUN-IP15', '9999999999999', 15000, 100],
      ['Cargador Samsung 25W', 'Cargador pared', 'ACC-CAR-S25W', '1010101010101', 35000, 60],
      ['Cable USB-C 2M', 'Cable reforzado', 'ACC-CAB-USBC2', '1212121212121', 12000, 150],
      ['Soporte Auto Magnético', 'Soporte rejilla', 'ACC-SOP-AUTO', '1313131313131', 18000, 40],
      ['AirPods Pro 2', 'Auriculares Apple', 'AUD-AIRP-PRO2', '1414141414141', 350000, 25],
      ['Galaxy Buds 2 Pro', 'Auriculares Samsung', 'AUD-GB2-PRO', '1515151515151', 180000, 30],
      ['Motorola Moto Buds', 'Auriculares Motorola', 'AUD-MOTO-BUDS', '1616161616161', 85000, 45],
      ['Vidrio Templado iPhone 15', 'Protector pantalla', 'PRO-VID-IP15', '1717171717171', 8000, 200],
      ['Vidrio Templado S24', 'Protector pantalla', 'PRO-VID-S24', '1818181818181', 8000, 200],
      ['Seguro Celular 1 Año', 'Garantía extendida', 'PRO-SEG-1A', '1919191919191', 120000, 999],
      ['PowerBank 10000mAh', 'Batería externa', 'ACC-PB-10K', '2020202020202', 45000, 35],
      ['Auriculares Genéricos', 'Auriculares cable', 'AUD-GEN-CAB', '2121212121212', 15000, 80]
    ];

    let productosIds = [];
    for (const p of productosData) {
      const [res] = await connection.query(`INSERT INTO productos (nombre, descripcion, sku, barcode, precio, stock) VALUES (?, ?, ?, ?, ?, ?)`, p);
      productosIds.push(res.insertId);
    }

    // ---------------------------------------------------------
    // 4. Pedidos
    // ---------------------------------------------------------
    console.log('📦 Generando Pedidos...');
    const pedidosData = [
      [clientesIds[0], 1215000, 'pagado'],
      [clientesIds[1], 450000, 'pendiente'],
      [clientesIds[2], 850000, 'enviado'],
      [null, 35000, 'pagado'], // Venta de mostrador sin registrar cliente
      [clientesIds[3], 380000, 'pendiente']
    ];

    let pedidosIds = [];
    for (const p of pedidosData) {
      const [res] = await connection.query(`INSERT INTO pedidos (cliente_id, total, estado) VALUES (?, ?, ?)`, p);
      pedidosIds.push(res.insertId);
    }

    // ---------------------------------------------------------
    // 5. Créditos y Movimientos en Cuenta Corriente
    // ---------------------------------------------------------
    console.log('💳 Generando Créditos, Cuotas y Cuentas Corrientes...');
    
    // --> Crédito 1: activo, 6 cuotas mensuales, 2 pagadas
    const [resCred1] = await connection.query(`
      INSERT INTO creditos (cliente_id, monto_total, cantidad_cuotas, frecuencia, monto_cuota, fecha_primera_cuota, estado, notas)
      VALUES (?, 300000, 6, 'mensual', 50000, '2026-05-01', 'activo', 'Crédito activo y al día')
    `, [clientesIds[4]]);
    const cred1Id = resCred1.insertId;

    for (let i = 1; i <= 6; i++) {
      const estado = i <= 2 ? 'pagada' : 'pendiente';
      const montoPagado = i <= 2 ? 50000 : 0;
      const fechaPago = i <= 2 ? `2026-0${4+i}-05` : null;
      await connection.query(`
        INSERT INTO cuotas (credito_id, numero, monto, fecha_vencimiento, fecha_pago, estado, monto_pagado)
        VALUES (?, ?, 50000, ?, ?, ?, ?)
      `, [cred1Id, i, `2026-0${4+i}-01`, fechaPago, estado, montoPagado]);
    }
    await connection.query(`INSERT INTO cuentas_corrientes (cliente_id, tipo, monto, saldo_resultante, referencia_tipo, referencia_id, descripcion) VALUES (?, 'venta', 300000, 300000, 'credito', ?, 'Crédito otorgado')`, [clientesIds[4], cred1Id]);
    await connection.query(`INSERT INTO cuentas_corrientes (cliente_id, tipo, monto, saldo_resultante, referencia_tipo, descripcion) VALUES (?, 'pago', -50000, 250000, 'cuota', 'Pago cuota 1')`, [clientesIds[4]]);
    await connection.query(`INSERT INTO cuentas_corrientes (cliente_id, tipo, monto, saldo_resultante, referencia_tipo, descripcion) VALUES (?, 'pago', -50000, 200000, 'cuota', 'Pago cuota 2')`, [clientesIds[4]]);

    // --> Crédito 2: moroso, 12 cuotas semanales, 3 vencidas
    const [resCred2] = await connection.query(`
      INSERT INTO creditos (cliente_id, monto_total, cantidad_cuotas, frecuencia, monto_cuota, fecha_primera_cuota, estado, notas)
      VALUES (?, 120000, 12, 'semanal', 10000, '2026-06-01', 'moroso', 'Deuda atrasada hace 3 semanas')
    `, [clientesIds[5]]);
    const cred2Id = resCred2.insertId;

    for (let i = 1; i <= 12; i++) {
      const estado = i <= 3 ? 'vencida' : 'pendiente';
      const day = i * 7 - 6; 
      // Calculamos días simples dentro de junio para mantenerlo funcional
      const dateString = new Date(2026, 5, day).toISOString().split('T')[0]; 
      await connection.query(`
        INSERT INTO cuotas (credito_id, numero, monto, fecha_vencimiento, estado)
        VALUES (?, ?, 10000, ?, ?)
      `, [cred2Id, i, dateString, estado]);
    }
    await connection.query(`INSERT INTO cuentas_corrientes (cliente_id, tipo, monto, saldo_resultante, referencia_tipo, referencia_id, descripcion) VALUES (?, 'venta', 120000, 120000, 'credito', ?, 'Crédito semanal (Atrasado)')`, [clientesIds[5], cred2Id]);

    // --> Crédito 3: liquidado, 3 cuotas mensuales, todas pagadas
    const [resCred3] = await connection.query(`
      INSERT INTO creditos (cliente_id, monto_total, cantidad_cuotas, frecuencia, monto_cuota, fecha_primera_cuota, estado, notas)
      VALUES (?, 300000, 3, 'mensual', 100000, '2026-01-10', 'liquidado', 'Terminado de pagar correctamente')
    `, [clientesIds[6]]);
    const cred3Id = resCred3.insertId;

    for (let i = 1; i <= 3; i++) {
      await connection.query(`
        INSERT INTO cuotas (credito_id, numero, monto, fecha_vencimiento, fecha_pago, estado, monto_pagado)
        VALUES (?, ?, 100000, ?, ?, 'pagada', 100000)
      `, [cred3Id, i, `2026-0${i}-10`, `2026-0${i}-12`]);
    }
    await connection.query(`INSERT INTO cuentas_corrientes (cliente_id, tipo, monto, saldo_resultante, referencia_tipo, referencia_id, descripcion) VALUES (?, 'venta', 300000, 300000, 'credito', ?, 'Crédito otorgado a 3 meses')`, [clientesIds[6], cred3Id]);
    await connection.query(`INSERT INTO cuentas_corrientes (cliente_id, tipo, monto, saldo_resultante, referencia_tipo, descripcion) VALUES (?, 'pago', -100000, 200000, 'cuota', 'Pago cuota 1')`, [clientesIds[6]]);
    await connection.query(`INSERT INTO cuentas_corrientes (cliente_id, tipo, monto, saldo_resultante, referencia_tipo, descripcion) VALUES (?, 'pago', -100000, 100000, 'cuota', 'Pago cuota 2')`, [clientesIds[6]]);
    await connection.query(`INSERT INTO cuentas_corrientes (cliente_id, tipo, monto, saldo_resultante, referencia_tipo, descripcion) VALUES (?, 'pago', -100000, 0, 'cuota', 'Pago cuota 3')`, [clientesIds[6]]);

    await connection.commit();
    console.log('✅ Transacción exitosa. Todos los datos de prueba han sido generados en MySQL.');

  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.error('❌ Error durante la generación, se revirtieron los cambios (ROLLBACK para mantener consistencia).');
    }
    console.error('Detalles del error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
    console.log('👋 Fin del script de Seed.');
    process.exit(0);
  }
}

runSeed();
