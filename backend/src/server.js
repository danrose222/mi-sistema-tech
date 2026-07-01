require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');

const app = express();
app.use(cors()); 
app.use(express.json()); 
app.get('/', (req, res) => {
    res.json({ mensaje: '¡Bienvenido a la API del sistema de gestión!' });
});

const clienteRoutes = require('./routes/clienteRoutes');
app.use('/api/clientes', clienteRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});