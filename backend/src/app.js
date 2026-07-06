const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const app = express();

// 1. Helmet: Protege seteando varios HTTP headers de seguridad
app.use(helmet());

// 2. Compression: Mejora el rendimiento comprimiendo las respuestas (GZIP)
app.use(compression());

// 3. CORS Restrictivo: Solo permitir el dominio del frontend
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// 4. Rate Limiting: Prevenir fuerza bruta y DoS
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 peticiones por IP cada 15 minutos
    message: { error: 'Demasiadas peticiones desde esta IP, intente de nuevo en 15 minutos.' }
});
app.use('/api/', apiLimiter);
app.get('/', (req, res) => {
    res.json({ mensaje: '¡Bienvenido a la API del sistema de gestión!' });
});

const clienteRoutes = require('./routes/clienteRoutes');
app.use('/api/clientes', clienteRoutes);

const productoRoutes = require('./routes/productoRoutes');
app.use('/api/productos', productoRoutes);

const pedidoRoutes = require('./routes/pedidoRoutes');
app.use('/api/pedidos', pedidoRoutes);

const whatsappRoutes = require('./routes/whatsappRoutes');
app.use('/api/whatsapp', whatsappRoutes);

const stockRoutes = require('./routes/stockRoutes');
app.use('/api/stock', stockRoutes);

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const adminUserRoutes = require('./routes/adminUserRoutes');
app.use('/api/admin/usuarios', adminUserRoutes);

const creditosRoutes = require('./routes/creditos.routes');
app.use('/api/creditos', creditosRoutes);

// Endpoint de Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Middleware Global de Manejo de Errores
app.use((err, req, res, next) => {
    console.error('[Global Error]:', err);
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor' 
        : err.message;
        
    res.status(statusCode).json({ success: false, error: message });
});

module.exports = app;
