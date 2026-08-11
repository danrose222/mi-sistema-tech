const express = require('express');
const router = express.Router();
const publicoController = require('../controllers/publicoController');

// Rutas 100% públicas (sin auth) para el catálogo del storefront.
router.get('/productos', publicoController.listarProductos);
router.get('/productos/:slug', publicoController.obtenerProductoPorSlug);
router.get('/categorias', publicoController.listarCategorias);
router.get('/sitemap.xml', publicoController.sitemap);

module.exports = router;
