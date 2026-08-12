const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const logError = require('./utils/logError');

const app = express();

// 1. Helmet: Protege seteando varios HTTP headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], // Por defecto solo permite recursos del mismo origen
      scriptSrc: ["'self'"], // Permite scripts (JS) solo del mismo origen
      styleSrc: ["'self'"], // Permite hojas de estilo (CSS) solo del mismo origen
      fontSrc: ["'self'"], // Permite fuentes tipográficas solo del mismo origen
      imgSrc: ["'self'", "data:"], // Permite imágenes del mismo origen y codificadas en base64 (data:)
      connectSrc: ["'self'"], // Permite conexiones (fetch/XHR/websockets) al mismo origen
    },
  },
}));

// 2. Compression: Mejora el rendimiento comprimiendo las respuestas (GZIP)
app.use(compression());

// 3. CORS Restrictivo: solo los orígenes explícitamente permitidos.
// ALLOWED_ORIGINS es una lista separada por comas (ej.
// "https://celshopcenter.com.ar,https://www.celshopcenter.com.ar") para
// poder habilitar dominio raíz + www, o admin/tienda en subdominios
// distintos, sin tocar código. Sin ALLOWED_ORIGINS definida, se cae a
// FRONTEND_URL (o localhost en desarrollo) para no romper entornos que
// todavía no la configuraron.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:4200')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Sin header Origin (webhook de Mercado Pago, curl, health checks del
        // VPS) no es una petición de navegador: CORS no aplica y no
        // corresponde rechazarla acá, esa validación es responsabilidad de
        // cada endpoint (ej. la firma del webhook).
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(Object.assign(new Error(`Origen no permitido por CORS: ${origin}`), { statusCode: 403 }));
    },
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Archivos subidos (imágenes de productos). Servidos como estáticos, sin
// pasar por el rate limiter de /api/ ni por express.json.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

const cuotasRoutes = require('./routes/cuotas.routes');
app.use('/api/cuotas', cuotasRoutes);

const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);

const reportesRoutes = require('./routes/reportesRoutes');
app.use('/api/reportes', reportesRoutes);

const publicoRoutes = require('./routes/publicoRoutes');
app.use('/api/publico', publicoRoutes);

const planCanjeRoutes = require('./routes/planCanjeRoutes');
app.use('/api/plan-canje', planCanjeRoutes);

// Endpoint de Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Middleware Global de Manejo de Errores
app.use((err, req, res, next) => {
    logError('[Global Error]:', err);
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor' 
        : err.message;
        
    res.status(statusCode).json({ success: false, error: message });
});

module.exports = app;
