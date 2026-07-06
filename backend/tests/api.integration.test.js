const request = require('supertest');
const express = require('express');

// Setup express app for testing
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock routes for testing
const db = { usuarios: [], productos: [] };

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { username, password, nombre, rol } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  const userId = db.usuarios.length + 1;
  db.usuarios.push({ id: userId, username, password, nombre, rol: rol || 'user' });
  res.status(201).json({ user: { id: userId, username, nombre, rol } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  const user = db.usuarios.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  res.json({ token: 'test-jwt-token-' + user.id });
});

// Productos routes
app.get('/api/productos', (req, res) => {
  res.json(db.productos);
});

app.post('/api/productos', (req, res) => {
  const { nombre, precio, barcode, sku, descripcion, stock } = req.body;
  if (!nombre || !precio) {
    return res.status(400).json({ error: 'nombre and precio required' });
  }
  const id = db.productos.length + 1;
  const producto = { id, nombre, precio, barcode, sku, descripcion, stock: stock || 0 };
  db.productos.push(producto);
  res.status(201).json({ id });
});

app.get('/api/productos/:id', (req, res) => {
  const producto = db.productos.find(p => p.id === parseInt(req.params.id));
  if (!producto) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.json(producto);
});

app.delete('/api/productos/:id', (req, res) => {
  const idx = db.productos.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  db.productos.splice(idx, 1);
  res.json({ mensaje: 'Producto eliminado' });
});

// Stock routes
app.get('/api/stock/movimientos', (req, res) => {
  res.json([]);
});

describe('API Integration Tests', () => {
  describe('Authentication', () => {
    test('POST /api/auth/register - should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
          nombre: 'Test User',
          rol: 'admin'
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.rol).toBe('admin');
    });

    test('POST /api/auth/register - should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('POST /api/auth/login - should login successfully', async () => {
      // Register first
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'logintest',
          password: 'pass123',
          nombre: 'Login Test'
        });

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'logintest',
          password: 'pass123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toContain('test-jwt-token');
    });

    test('POST /api/auth/login - should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'invalid',
          password: 'wrong'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid credentials');
    });
  });

  describe('Products', () => {
    test('GET /api/productos - should return empty list initially', async () => {
      const response = await request(app)
        .get('/api/productos');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('POST /api/productos - should create a new product', async () => {
      const response = await request(app)
        .post('/api/productos')
        .send({
          nombre: 'Laptop Test',
          precio: 999.99,
          barcode: 'EAN123456789',
          sku: 'LAPTOP-001',
          descripcion: 'Test laptop',
          stock: 10
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    test('POST /api/productos - should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/productos')
        .send({ nombre: 'Incomplete' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/productos/:id - should return a product', async () => {
      // Create product first
      const createRes = await request(app)
        .post('/api/productos')
        .send({
          nombre: 'Test Product',
          precio: 50.00,
          stock: 5
        });

      const productId = createRes.body.id;

      // Get product
      const response = await request(app)
        .get(`/api/productos/${productId}`);

      expect(response.status).toBe(200);
      expect(response.body.nombre).toBe('Test Product');
      expect(response.body.precio).toBe(50.00);
    });

    test('GET /api/productos/:id - should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/productos/9999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Producto no encontrado');
    });

    test('DELETE /api/productos/:id - should delete a product', async () => {
      // Create product
      const createRes = await request(app)
        .post('/api/productos')
        .send({
          nombre: 'To Delete',
          precio: 25.00
        });

      const productId = createRes.body.id;

      // Delete product
      const deleteRes = await request(app)
        .delete(`/api/productos/${productId}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.mensaje).toBe('Producto eliminado');

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/productos/${productId}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('Stock', () => {
    test('GET /api/stock/movimientos - should return movements list', async () => {
      const response = await request(app)
        .get('/api/stock/movimientos');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Integration Flows', () => {
    test('Complete flow: register, login, create product, list products', async () => {
      // Register
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'flowtest',
          password: 'flowpass',
          nombre: 'Flow Test',
          rol: 'admin'
        });

      expect(registerRes.status).toBe(201);

      // Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'flowtest',
          password: 'flowpass'
        });

      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;

      // Create product
      const createRes = await request(app)
        .post('/api/productos')
        .send({
          nombre: 'Flow Product',
          precio: 199.99,
          barcode: 'FLOW123',
          stock: 20
        });

      expect(createRes.status).toBe(201);

      // List products (should include created product)
      const listRes = await request(app)
        .get('/api/productos');

      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBeGreaterThan(0);
      expect(listRes.body.some(p => p.nombre === 'Flow Product')).toBe(true);
    });
  });
});
