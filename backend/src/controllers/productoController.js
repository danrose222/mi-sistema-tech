const fs = require('fs');
const ExcelJS = require('exceljs');
const pool = require('../config/database');
const productoModel = require('../models/productoModel');
const categoriaModel = require('../models/categoriaModel');
const logError = require('../utils/logError');

exports.listarProductos = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';

    const { data, total } = await productoModel.obtenerProductosPaginado({ page, limit, search });
    res.json({ success: true, data, total });
  } catch (err) {
    logError('[Productos]', err);
    res.status(500).json({ success: false, error: 'Error al obtener productos' });
  }
};

exports.obtenerProducto = async (req, res) => {
  try {
    const producto = await productoModel.obtenerProductoPorId(req.params.id);
    if (!producto) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    res.json({ success: true, data: producto });
  } catch (err) {
    logError('[Productos]', err);
    res.status(500).json({ success: false, error: 'Error al obtener producto' });
  }
};

exports.obtenerProductoPorBarcode = async (req, res) => {
  try {
    const producto = await productoModel.obtenerProductoPorBarcode(req.params.barcode);
    if (!producto) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    res.json({ success: true, data: producto });
  } catch (err) {
    logError('[Productos]', err);
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
  if (typeof body.destacado === 'string') {
    body.destacado = body.destacado !== 'false' && body.destacado !== '0';
  }
  return body;
}

exports.listarCategorias = async (req, res) => {
  try {
    const data = await categoriaModel.listarCategorias();
    res.json({ success: true, data });
  } catch (err) {
    logError('[Productos]', err);
    res.status(500).json({ success: false, error: 'Error al obtener categorías' });
  }
};

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
    logError('[Productos]', err);
    res.status(500).json({ success: false, error: 'Error al crear producto' });
  }
};

exports.actualizarProducto = async (req, res) => {
  try {
    const existente = await productoModel.obtenerProductoPorId(req.params.id);
    if (!existente) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

    // Clientes que todavía no mandan categoría/destacado (versiones anteriores
    // del formulario) no deben borrarlos: si no vienen, se conserva lo actual.
    const body = normalizarBody(req);
    if (body.categoria_id === undefined) body.categoria_id = existente.categoria_id;
    if (body.destacado === undefined) body.destacado = existente.destacado;

    await productoModel.actualizarProducto(req.params.id, body);

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
    logError('[Productos]', err);
    res.status(500).json({ success: false, error: 'Error al actualizar producto' });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    await productoModel.eliminarProducto(req.params.id);
    res.json({ success: true, mensaje: 'Producto eliminado' });
  } catch (err) {
    logError('[Productos]', err);
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
  requiere_imei: ['requiere imei', 'requiere_imei', 'imei'],
  categoria: ['categoria'],
  destacado: ['destacado', 'destacada']
};

const VALORES_SI = ['si', 'true', '1', 'yes', 'x'];

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

// Si la fila trae un SKU que ya existe, ACTUALIZA ese producto (sirve para
// corregir datos o aplicar un aumento de precios reimportando el mismo
// Excel); si no trae SKU o el SKU es nuevo, CREA el producto. En las
// actualizaciones solo se pisan las columnas que el archivo trae y las
// celdas vacías no borran lo que ya estaba cargado.
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
    const leer = (row, campo) => (columnas[campo] !== undefined ? valorCelda(row.getCell(columnas[campo])) : undefined);

    const filasValidas = [];
    const errores = [];

    for (let fila = 2; fila <= worksheet.rowCount; fila++) {
      const row = worksheet.getRow(fila);
      if (row.cellCount === 0) continue; // fila totalmente vacía

      const nombre = String(leer(row, 'nombre') || '').trim();
      const skuRaw = String(leer(row, 'sku') || '').trim();
      const barcodeRaw = String(leer(row, 'barcode') || '').trim();
      const precioRaw = leer(row, 'precio');
      const stockRaw = leer(row, 'stock');
      const descripcion = String(leer(row, 'descripcion') || '').trim();
      const requiereImeiRaw = leer(row, 'requiere_imei');
      const categoria = String(leer(row, 'categoria') || '').trim();
      const destacadoRaw = leer(row, 'destacado');

      if (!nombre) {
        errores.push({ fila, motivo: 'El nombre es requerido' });
        continue;
      }

      const precio = Number(precioRaw);
      if (!Number.isFinite(precio) || precio <= 0) {
        errores.push({ fila, motivo: 'El precio debe ser un número mayor a cero' });
        continue;
      }

      let stock;
      if (stockRaw !== undefined && stockRaw !== '') {
        stock = Number(stockRaw);
        if (!Number.isInteger(stock) || stock < 0) {
          errores.push({ fila, motivo: 'El stock debe ser un número entero mayor o igual a cero' });
          continue;
        }
      }

      if (skuRaw) {
        if (skusEnArchivo.has(skuRaw)) {
          errores.push({ fila, motivo: `El SKU "${skuRaw}" está repetido en el archivo` });
          continue;
        }
        skusEnArchivo.add(skuRaw);
      }
      const idExistente = skuRaw ? skusExistentes.get(skuRaw) : undefined;

      if (barcodeRaw) {
        const duenoBarcode = barcodesExistentes.get(barcodeRaw);
        const esDeOtroProducto = duenoBarcode !== undefined && duenoBarcode !== idExistente;
        if (esDeOtroProducto || barcodesEnArchivo.has(barcodeRaw)) {
          errores.push({ fila, motivo: `El código de barras "${barcodeRaw}" ya existe (en otro producto o repetido en el archivo)` });
          continue;
        }
        barcodesEnArchivo.add(barcodeRaw);
      }

      filasValidas.push({
        idExistente,
        nombre,
        sku: skuRaw || null,
        barcode: barcodeRaw || null,
        precio,
        stock,
        descripcion: descripcion || null,
        requiere_imei: requiereImeiRaw === undefined ? undefined : VALORES_SI.includes(normalizarTexto(requiereImeiRaw)),
        categoria,
        destacado: destacadoRaw === undefined ? undefined : VALORES_SI.includes(normalizarTexto(destacadoRaw))
      });
    }

    // Todo o nada: si alguna fila tiene un error, no se toca nada. Así el
    // cliente corrige el Excel de una vez y reintenta, en vez de terminar
    // con un catálogo a medio cargar y sin saber bien qué faltó.
    if (errores.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Se encontraron ${errores.length} fila(s) con errores. No se importó nada; corregí el archivo y volvé a intentar.`,
        errores
      });
    }

    if (filasValidas.length === 0) {
      return res.status(400).json({ success: false, error: 'El archivo no contiene filas de datos válidas.' });
    }

    let creados = 0;
    let actualizados = 0;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const categoriaIds = new Map();
      const resolverCategoria = async (nombreCategoria) => {
        if (!nombreCategoria) return null;
        const clave = normalizarTexto(nombreCategoria);
        if (!categoriaIds.has(clave)) {
          categoriaIds.set(clave, await categoriaModel.obtenerOCrearPorNombre(connection, nombreCategoria));
        }
        return categoriaIds.get(clave);
      };

      const nuevos = [];
      for (const f of filasValidas) {
        const categoria_id = await resolverCategoria(f.categoria);
        if (f.idExistente) {
          // Celdas vacías no pisan lo que ya estaba cargado.
          await productoModel.actualizarProductoImportado(connection, f.idExistente, {
            nombre: f.nombre,
            precio: f.precio,
            descripcion: f.descripcion || undefined,
            barcode: f.barcode || undefined,
            stock: f.stock,
            requiere_imei: f.requiere_imei,
            categoria_id: categoria_id || undefined,
            destacado: f.destacado
          });
          actualizados++;
        } else {
          nuevos.push({
            ...f,
            stock: f.stock ?? 0,
            categoria_id,
            destacado: f.destacado ?? false,
            requiere_imei: f.requiere_imei ?? false
          });
        }
      }
      if (nuevos.length > 0) {
        await productoModel.crearProductosBulk(connection, nuevos);
        creados = nuevos.length;
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    res.status(201).json({ success: true, data: { creados, actualizados } });
  } catch (err) {
    logError('[Productos]', err);
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
    { header: 'requiere_imei', key: 'requiere_imei', width: 15 },
    { header: 'categoria', key: 'categoria', width: 18 },
    { header: 'destacado', key: 'destacado', width: 12 }
  ];
  worksheet.getRow(1).font = { bold: true };
  worksheet.addRow({
    nombre: 'Samsung Galaxy S25',
    sku: 'CEL-SAM-S25',
    barcode: '7791234567890',
    precio: 850000,
    stock: 5,
    descripcion: 'Celular Samsung Galaxy S25, 256GB',
    requiere_imei: 'SI',
    categoria: 'Celulares',
    destacado: 'SI'
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-productos.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
};

// ─── Carga masiva de fotos ──────────────────────────────────────────────

const SEPARADORES_SKU = new Set(['_', '-', '.', ' ']);

// Devuelve el producto cuyo SKU es el comienzo del nombre del archivo
// ("CEL-N-001_Infinix_1.jpg" -> SKU "CEL-N-001"). Se prueba primero el SKU
// más largo para que "FBX-90221" no se confunda con "FBX-9022".
function buscarProductoPorNombreArchivo(nombreArchivo, productosPorSkuDesc) {
  const nombre = nombreArchivo.toLowerCase();
  for (const p of productosPorSkuDesc) {
    const sku = p.sku.toLowerCase();
    if (!nombre.startsWith(sku)) continue;
    const siguiente = nombre.charAt(sku.length);
    if (siguiente === '' || SEPARADORES_SKU.has(siguiente)) return p;
  }
  return undefined;
}

// Recibe muchas fotos de una vez y asigna cada una a su producto por SKU.
// Las fotos de un mismo producto se ordenan por nombre de archivo (_1 antes
// que _2) y REEMPLAZAN a las que tenía, igual que al editar el producto.
exports.subirImagenesMasivo = async (req, res) => {
  const archivos = req.files || [];
  try {
    if (archivos.length === 0) {
      return res.status(400).json({ success: false, error: 'Adjuntá al menos una imagen.' });
    }

    const productos = (await productoModel.obtenerProductosConSku())
      .sort((a, b) => b.sku.length - a.sku.length);

    const porProducto = new Map();
    const sinProducto = [];
    for (const archivo of archivos) {
      const producto = buscarProductoPorNombreArchivo(archivo.originalname, productos);
      if (!producto) {
        sinProducto.push(archivo.originalname);
        fs.unlink(archivo.path, () => {});
        continue;
      }
      if (!porProducto.has(producto.id)) porProducto.set(producto.id, { sku: producto.sku, archivos: [] });
      porProducto.get(producto.id).archivos.push(archivo);
    }

    for (const [productoId, grupo] of porProducto) {
      const ordenados = grupo.archivos.sort((a, b) => a.originalname.localeCompare(b.originalname));
      await productoModel.reemplazarImagenes(productoId, ordenados.map((f) => `/uploads/productos/${f.filename}`));
    }

    res.json({
      success: true,
      data: {
        productos_actualizados: porProducto.size,
        imagenes_asignadas: archivos.length - sinProducto.length,
        sin_producto: sinProducto
      }
    });
  } catch (err) {
    logError('[Productos]', err);
    res.status(500).json({ success: false, error: 'Error al subir las imágenes' });
  }
};
