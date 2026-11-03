const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/productos');

// La carpeta no está versionada (ver .gitignore), así que en un clone nuevo
// no existe hasta que se sube la primera imagen. multer no la crea sola.
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nombreUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nombreUnico);
  }
});

const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function fileFilter(req, file, cb) {
  if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
    return cb(new Error('Formato de imagen no permitido. Usá JPG, PNG, WEBP o GIF.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB por archivo
}).array('imagenes', 5);

// Traduce errores de multer (tipo/tamaño inválido) a 400 en vez de dejarlos
// caer como 500 en el manejador global de errores de app.js.
exports.uploadProductoImagen = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

// Carga masiva de fotos desde el panel (Productos -> "Subir fotos"): mismo
// storage y validación que las fotos de un producto, pero acepta muchas a la
// vez. Cada archivo se asigna a su producto por SKU en el controller.
const MAX_IMAGENES_MASIVO = 300;
const uploadMasivo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_IMAGENES_MASIVO }
}).array('imagenes', MAX_IMAGENES_MASIVO);

exports.uploadImagenesMasivo = (req, res, next) => {
  uploadMasivo(req, res, (err) => {
    if (err) {
      const mensaje = err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
        ? `Podés subir hasta ${MAX_IMAGENES_MASIVO} imágenes por vez.`
        : err.message;
      return res.status(400).json({ success: false, error: mensaje });
    }
    next();
  });
};

// El Excel de importación no se guarda en disco: se procesa en memoria y se
// descarta apenas se insertan los productos, así que usa memoryStorage en
// vez del diskStorage de las imágenes.
const EXCEL_MIMETYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const uploadExcel = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const esXlsx = file.mimetype === EXCEL_MIMETYPE || file.originalname.toLowerCase().endsWith('.xlsx');
    if (!esXlsx) {
      return cb(new Error('Formato no soportado. Subí un archivo .xlsx (Excel).'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB alcanza de sobra para un listado de productos
}).single('archivo');

exports.uploadExcelProductos = (req, res, next) => {
  uploadExcel(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Debe adjuntar un archivo .xlsx' });
    }
    next();
  });
};
