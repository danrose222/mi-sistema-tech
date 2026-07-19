const ExcelJS = require('exceljs');
const pool = require('../config/database');
const productoModel = require('../models/productoModel');

exports.listarProductos = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';

    const { data, total } = await productoModel.obtenerProductosPaginado({ page, limit, search });
    res.json({ success: true, data, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener productos' });
  }
};

exports.obtenerProducto = async (req, res) => {
  try {
    const producto = await productoModel.obtenerProductoPorId(req.params.id);
    if (!producto) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    res.json({ success: true, data: producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener producto' });
  }
};

exports.obtenerProductoPorBarcode = async (req, res) => {
  try {
    const producto = await productoModel.obtenerProductoPorBarcode(req.params.barcode);
    if (!producto) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    res.json({ success: true, data: producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener producto por barcode' });
  }
};

// El middleware de multer (uploadMiddleware.uploadProductoImagen) ya corrió
// antes de estos handlers: si la request era multipart, dejó los archivos en
// req.files (hasta 5) y los demás campos (como strings) en req.body; si era
// JSON normal, no toca nada y req.files queda undefined.
function buildImagenUrls(req) {
  if (!req.files || req.files.length === 0) return undefined;
  return req.files.map((file) => `/uploads/productos/${file.filename}`);
}

// FormData serializa todo a string (incluido el checkbox `activo`), así que
// "false" llega como string no vacío -> truthy en JS. Se normaliza acá para
// que el multipart se comporte igual que el JSON plano de siempre.
function normalizarBody(req) {
  const body = { ...req.body };
  if (typeof body.activo === 'string') {
    body.activo = body.activo !== 'false' && body.activo !== '0';
  }
  if (typeof body.requiere_imei === 'string') {
    body.requiere_imei = body.requiere_imei !== 'false' && body.requiere_imei !== '0';
  }
  return body;
}

exports.crearProducto = async (req, res) => {
  try {
    if (!req.body.nombre || req.body.precio === undefined || req.body.precio === null) {
      return res.status(400).json({ success: false, error: 'nombre y precio son requeridos' });
    }
    const id = await productoModel.crearProducto(normalizarBody(req));

    const urls = buildImagenUrls(req);
    if (urls) {
      await productoModel.agregarImagenes(id, urls);
    }

    const producto = await productoModel.obtenerProductoPorId(id);
    res.status(201).json({ success: true, data: producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al crear producto' });
  }
};

exports.actualizarProducto = async (req, res) => {
  try {
    const existente = await productoModel.obtenerProductoPorId(req.params.id);
    if (!existente) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

    await productoModel.actualizarProducto(req.params.id, normalizarBody(req));

    // Si se subieron imágenes nuevas, reemplazan por completo al set anterior
    // (no se mezclan) para que el admin siempre tenga control exacto de qué
    // fotos quedan asociadas al producto.
    const urls = buildImagenUrls(req);
    if (urls) {
      await productoModel.reemplazarImagenes(req.params.id, urls);
    }

    const producto = await productoModel.obtenerProductoPorId(req.params.id);
    res.json({ success: true, data: producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al actualizar producto' });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    await productoModel.eliminarProducto(req.params.id);
    res.json({ success: true, mensaje: 'Producto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al eliminar producto' });
  }
};

// ─── Importación masiva desde Excel ─────────────────────────────────────

function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

const ALIAS_COLUMNAS = {
  nombre: ['nombre'],
  sku: ['sku'],
  barcode: ['barcode', 'codigo de barras'],
  precio: ['precio'],
  stock: ['stock', 'cantidad'],
  descripcion: ['descripcion'],
  requiere_imei: ['requiere imei', 'requiere_imei', 'imei']
};

// Encuentra en qué columna está cada campo esperado leyendo la fila de
// encabezados: así el orden de columnas en el Excel del cliente no importa,
// solo el nombre de cada encabezado (sin distinguir tildes/mayúsculas).
function mapearColumnas(headerRow) {
  const mapa = {};
  headerRow.eachCell((cell, colNumber) => {
    const texto = normalizarTexto(cell.value);
    for (const [campo, alias] of Object.entries(ALIAS_COLUMNAS)) {
      if (alias.includes(texto) && mapa[campo] === undefined) {
        mapa[campo] = colNumber;
      }
    }
  });
  return mapa;
}

// ExcelJS puede devolver el valor de una celda como string/number planos,
// o como objeto (rich text, resultado de fórmula, hipervínculo, fecha).
function valorCelda(cell) {
  if (!cell) return '';
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((rt) => rt.text).join('');
    if (v.result !== undefined) return v.result;
    if (v.text !== undefined) return v.text;
    return '';
  }
  return v;
}

exports.importarProductos = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(req.file.buffer);
    } catch (err) {
      return res.status(400).json({ success: false, error: 'No se pudo leer el archivo. Verificá que sea un .xlsx válido.' });
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      return res.status(400).json({ success: false, error: 'El archivo no contiene filas de datos.' });
    }

    const columnas = mapearColumnas(worksheet.getRow(1));
    if (columnas.nombre === undefined || columnas.precio === undefined) {
      return res.status(400).json({
        success: false,
        error: 'El archivo debe tener al menos las columnas "nombre" y "precio". Descargá la plantilla para ver el formato esperado.'
      });
    }

    const { skus: skusExistentes, barcodes: barcodesExistentes } = await productoModel.obtenerSkusYBarcodesExistentes();
    const skusEnArchivo = new Set();
    const barcodesEnArchivo = new Set();

    const productosValidos = [];
    const errores = [];

    for (let fila = 2; fila <= worksheet.rowCount; fila++) {
      const row = worksheet.getRow(fila);
      if (row.cellCount === 0) continue; // fila totalmente vacía

      const nombre = String(valorCelda(row.getCell(columnas.nombre)) || '').trim();
      const skuRaw = columnas.sku ? String(valorCelda(row.getCell(columnas.sku)) || '').trim() : '';
      const barcodeRaw = columnas.barcode ? String(valorCelda(row.getCell(columnas.barcode)) || '').trim() : '';
      const precioRaw = columnas.precio !== undefined ? valorCelda(row.getCell(columnas.precio)) : undefined;
      const stockRaw = columnas.stock !== undefined ? valorCelda(row.getCell(columnas.stock)) : undefined;
      const descripcion = columnas.descripcion !== undefined ? String(valorCelda(row.getCell(columnas.descripcion)) || '').trim() : '';
      const requiereImeiRaw = columnas.requiere_imei !== undefined ? valorCelda(row.getCell(columnas.requiere_imei)) : '';

      if (!nombre) {
        errores.push({ fila, motivo: 'El nombre es requerido' });
        continue;
      }

      const precio = Number(precioRaw);
      if (!Number.isFinite(precio) || precio <= 0) {
        errores.push({ fila, motivo: 'El precio debe ser un número mayor a cero' });
        continue;
      }

      let stock = 0;
      if (stockRaw !== undefined && stockRaw !== '') {
        stock = Number(stockRaw);
        if (!Number.isInteger(stock) || stock < 0) {
          errores.push({ fila, motivo: 'El stock debe ser un número entero mayor o igual a cero' });
          continue;
        }
      }

      if (skuRaw) {
        if (skusExistentes.has(skuRaw) || skusEnArchivo.has(skuRaw)) {
          errores.push({ fila, motivo: `El SKU "${skuRaw}" ya existe (en la base de datos o repetido en el archivo)` });
          continue;
        }
        skusEnArchivo.add(skuRaw);
      }

      if (barcodeRaw) {
        if (barcodesExistentes.has(barcodeRaw) || barcodesEnArchivo.has(barcodeRaw)) {
          errores.push({ fila, motivo: `El código de barras "${barcodeRaw}" ya existe (en la base de datos o repetido en el archivo)` });
          continue;
        }
        barcodesEnArchivo.add(barcodeRaw);
      }

      const requiere_imei = ['si', 'true', '1', 'yes'].includes(normalizarTexto(requiereImeiRaw));

      productosValidos.push({
        nombre,
        sku: skuRaw || null,
        barcode: barcodeRaw || null,
        precio,
        stock,
        descripcion: descripcion || null,
        requiere_imei
      });
    }

    // Todo o nada: si alguna fila tiene un error, no se inserta nada. Así el
    // cliente corrige el Excel de una vez y reintenta, en vez de terminar
    // con un catálogo a medio cargar y sin saber bien qué faltó.
    if (errores.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Se encontraron ${errores.length} fila(s) con errores. No se importó nada; corregí el archivo y volvé a intentar.`,
        errores
      });
    }

    if (productosValidos.length === 0) {
      return res.status(400).json({ success: false, error: 'El archivo no contiene filas de datos válidas.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await productoModel.crearProductosBulk(connection, productosValidos);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    res.status(201).json({ success: true, data: { creados: productosValidos.length } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al importar productos' });
  }
};

exports.descargarPlantillaImportacion = async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Productos');

  worksheet.columns = [
    { header: 'nombre', key: 'nombre', width: 30 },
    { header: 'sku', key: 'sku', width: 15 },
    { header: 'barcode', key: 'barcode', width: 18 },
    { header: 'precio', key: 'precio', width: 12 },
    { header: 'stock', key: 'stock', width: 10 },
    { header: 'descripcion', key: 'descripcion', width: 30 },
    { header: 'requiere_imei', key: 'requiere_imei', width: 15 }
  ];
  worksheet.getRow(1).font = { bold: true };
  worksheet.addRow({
    nombre: 'Samsung Galaxy S25',
    sku: 'CEL-SAM-S25',
    barcode: '7791234567890',
    precio: 850000,
    stock: 5,
    descripcion: 'Celular Samsung Galaxy S25, 256GB',
    requiere_imei: 'SI'
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-productos.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
};
